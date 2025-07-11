import { analyze, guess } from 'web-audio-beat-detector';

export interface AudioAnalyzerOptions {
  onBeat?: (time: number) => void;
  onEnergy?: (energy: number) => void;
  onFrequency?: (frequencies: Uint8Array) => void;
  beatSensitivity?: number;
  energyThreshold?: number;
  analyzeInterval?: number;
}

export interface BeatDetectionResult {
  bpm: number;
  offset: number;
}

// Speichere eine Referenz auf bereits verbundene Audio-Elemente
const connectedAudioElements = new WeakMap<HTMLAudioElement, AudioContext>();

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private isAnalyzing = false;
  private animationFrameId: number | null = null;
  private frequencyData: Uint8Array | null = null;
  private lastAnalyzeTime: number = 0;
  private lastBeatTime: number = 0; // Zeit des letzten erkannten Beats
  private options: AudioAnalyzerOptions = {
    beatSensitivity: 1.0,
    energyThreshold: 0.04, // Fester Wert, nicht mehr dynamisch
    analyzeInterval: 50
  };
  private initializationPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private noDataCount: number = 0;
  private maxNoDataCount: number = 10;
  private lastEnergy: number = 0; // Speichere die letzte Energie für Throttling
  
  // NEU: Dynamische Anpassung basierend auf Track-Eigenschaften
  private energyHistory: number[] = []; // Speichere Energy-Werte für Durchschnittsberechnung
  private maxEnergyHistoryLength: number = 100; // Anzahl der Samples für Durchschnitt
  private adaptiveThreshold: number = 0.04; // Dynamischer Schwellenwert
  private adaptiveSensitivity: number = 1.0; // Dynamische Sensitivität
  private trackAnalysisComplete: boolean = false; // Track-Analyse abgeschlossen
  private trackAnalysisStartTime: number = 0; // Startzeit der Track-Analyse
  private trackAnalysisDuration: number = 5000; // 5 Sekunden für Track-Analyse

  // OPTIMIERT: Log-Throttling für bessere Performance
  private lastLogTime: number = 0;
  private logThrottleInterval: number = 1000; // 1 Sekunde zwischen Logs

  constructor(options?: AudioAnalyzerOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    // OPTIMIERT: Nur einmal beim Start loggen
    console.log('AudioAnalyzer initialized');
  }

  // OPTIMIERT: Throttled Logging-Funktion
  private throttledLog(message: string, force: boolean = false): void {
    const now = Date.now();
    if (force || now - this.lastLogTime > this.logThrottleInterval) {
      console.log(`[AudioAnalyzer] ${message}`);
      this.lastLogTime = now;
    }
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    // Wenn bereits eine Initialisierung läuft, gib diese zurück
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Prüfe, ob das Audio-Element bereits initialisiert wurde
    if (this.audioElement === audioElement && this.audioContext) {
      return Promise.resolve();
    }
    
    this.initializationPromise = new Promise<void>(async (resolve, reject) => {
      try {
        this.audioElement = audioElement;
        this.reconnectAttempts = 0;
        this.noDataCount = 0;
        
        // Prüfe, ob bereits ein AudioContext für dieses Element existiert
        if (connectedAudioElements.has(audioElement)) {
          this.audioContext = connectedAudioElements.get(audioElement)!;
          
          // Prüfe, ob wir einen neuen Analyzer erstellen müssen
          if (!this.analyser && this.audioContext) {
            this.setupAnalyzerNodes();
          }
        } else {
          // Immer einen neuen AudioContext erstellen, um Probleme mit der Wiederverwendung zu vermeiden
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Speichere die Referenz
          connectedAudioElements.set(audioElement, this.audioContext);
          
          // Create audio source from audio element
          this.audioSource = this.audioContext.createMediaElementSource(audioElement);
          
          // Setup analyzer nodes
          this.setupAnalyzerNodes();
        }
        
        // Initialize frequency data array
        if (this.analyser) {
          this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        }
        
        this.throttledLog('Audio analyzer setup complete', true);
        resolve();
      } catch (error) {
        console.error('Failed to initialize audio analyzer:', error);
        reject(error);
      } finally {
        this.initializationPromise = null;
      }
    });
    
    return this.initializationPromise;
  }

  private setupAnalyzerNodes(): void {
    if (!this.audioContext || !this.audioSource) {
      console.error('Cannot setup analyzer nodes: audioContext or audioSource is null');
      return;
    }
    
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      
      // Connect nodes
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error setting up analyzer nodes:', error);
    }
  }

  public start(): void {
    if (!this.audioContext || !this.analyser) {
      console.warn('Cannot start analysis: analyzer not initialized');
      return;
    }
    
    // Wenn die Analyse bereits läuft, nicht erneut starten
    if (this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;
    this.noDataCount = 0;
    this.throttledLog('Audio analysis started', true);
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      // Versuche den AudioContext zu starten
      this.audioContext.resume().then(() => {
        this.lastAnalyzeTime = performance.now();
        this.analyze();
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
        this.isAnalyzing = false;
        
        // Zeige einen Hinweis, dass eine Benutzerinteraktion erforderlich ist
        console.warn('The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page. https://developer.chrome.com/blog/autoplay/#web_audio');
      });
    } else {
      // AudioContext ist bereits aktiv
      this.lastAnalyzeTime = performance.now();
      this.analyze();
    }
  }

  public stop(): void {
    if (!this.isAnalyzing) {
      return;
    }
    
    this.isAnalyzing = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.throttledLog('Audio analysis stopped', true);
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public setBeatSensitivity(sensitivity: number): void {
    this.options.beatSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  public setEnergyThreshold(threshold: number): void {
    this.options.energyThreshold = Math.max(0.01, Math.min(1.0, threshold));
  }

  private analyze(): void {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData) {
      return;
    }

    const now = performance.now();
    
    // OPTIMIERT: Niedrige Latenz für visuellen Impact, aber mit optimierten Schwellenwerten
    if (now - this.lastAnalyzeTime < 50) { // 50ms = 20fps (zurück von 200ms für bessere Reaktivität)
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      return;
    }

    try {
      // Hole Frequenzdaten
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Berechne Energie
      let sum = 0;
      let count = 0;
      
      // OPTIMIERT: Ausgewogene Frequenzanalyse für Performance und Reaktivität
      const step = Math.max(1, Math.floor(this.frequencyData.length / 32)); // Zurück zu 32 Samples für bessere Reaktivität
      
      for (let i = 0; i < this.frequencyData.length; i += step) {
        sum += this.frequencyData[i];
        count++;
      }
      
      const average = count > 0 ? sum / count : 0;
      const energy = average / 255; // Normalisiere auf 0-1
      
      // NEU: Dynamische Track-Analyse für adaptive Sensitivität
      this.updateTrackAnalysis(energy, now);
      
      // OPTIMIERT: Empfindlichere Reaktion für visuellen Impact
      if (energy < 0.005) { // Reduziert von 0.01 auf 0.005 für empfindlichere Reaktionen
        this.noDataCount++;
        if (this.noDataCount > this.maxNoDataCount) {
          if (this.options.onEnergy) {
            this.options.onEnergy(0);
          }
        }
        this.lastAnalyzeTime = now;
        this.animationFrameId = requestAnimationFrame(() => this.analyze());
        return;
      }
      
      this.noDataCount = 0;
      
      // OPTIMIERT: Reaktive Energy-Updates für visuellen Impact
      if (Math.abs(energy - this.lastEnergy) > 0.01 || energy > 0.05) { // Reduziert von 0.02/0.1 auf 0.01/0.05 für empfindlichere Reaktionen
        this.lastEnergy = energy;
        
        if (this.options.onEnergy) {
          this.options.onEnergy(energy);
        }
      }

      // NEU: Verwende adaptive Schwellenwerte statt feste Werte
      const currentThreshold = this.trackAnalysisComplete ? this.adaptiveThreshold : this.options.energyThreshold!;
      const currentSensitivity = this.trackAnalysisComplete ? this.adaptiveSensitivity : this.options.beatSensitivity!;
      
      // Nur noch die neue Schwellen-Logik:
      if (energy > currentThreshold) {
        const timeSinceLastBeat = now - this.lastBeatTime;
        if (timeSinceLastBeat > 180) {
          const beatIntensity = energy / currentThreshold;
          const minSensitivity = 0.5;
          const maxSensitivity = 3.0;
          const effectiveThreshold = 5 + (maxSensitivity - currentSensitivity) * 5;
          
          if (beatIntensity > effectiveThreshold && Math.random() < 0.75) {
            this.lastBeatTime = now;
            this.throttledLog(`Beat detected - Energy: ${energy.toFixed(3)}`);
            if (this.options.onBeat) {
              this.options.onBeat(now);
            }
          }
        }
      }
      // Die High-Energy-Beat-Detection ist entfernt!

      this.lastAnalyzeTime = now;
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      
    } catch (error) {
      console.error('Audio analysis error:', error);
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      return;
    }
    
    this.reconnectAttempts++;
    this.throttledLog(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    try {
      // Stoppe die aktuelle Analyse
      this.stop();
      
      // Trenne bestehende Verbindungen
      if (this.audioSource) {
        this.audioSource.disconnect();
      }
      
      if (this.analyser) {
        this.analyser.disconnect();
      }
      
      if (this.gainNode) {
        this.gainNode.disconnect();
      }
      
      // Erstelle neue Verbindungen
      if (this.audioContext && this.audioElement) {
        // Erstelle neuen AudioSource
        this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
        
        // Setup analyzer nodes
        this.setupAnalyzerNodes();
        
        // Initialize frequency data array
        if (this.analyser) {
          this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        }
        
        // Starte die Analyse erneut
        this.start();
        
        this.throttledLog('Audio analyzer reconnected successfully', true);
      }
    } catch (error) {
      console.error('Failed to reconnect audio analyzer:', error);
    }
  }

  private calculateEnergy(frequencies: Uint8Array): number {
    // Verbesserte Version mit Frequenzgewichtung für bessere Beat-Erkennung
    let sum = 0;
    let weightedSum = 0;
    let totalWeight = 0;
    
    // Frequenzbereiche und Gewichtungen definieren (Bass stärker gewichten)
    const lowRange = { start: 0, end: 10, weight: 3.0 };    // Bass (0-200 Hz)
    const midRange = { start: 10, end: 30, weight: 1.5 };   // Mitten (200-600 Hz)
    const highRange = { start: 30, end: 255, weight: 0.5 }; // Höhen (600+ Hz)
    
    // Niedrige Frequenzen (Bass)
    for (let i = lowRange.start; i < lowRange.end; i++) {
      weightedSum += frequencies[i] * lowRange.weight;
      totalWeight += lowRange.weight;
    }
    
    // Mittlere Frequenzen
    for (let i = midRange.start; i < midRange.end; i++) {
      weightedSum += frequencies[i] * midRange.weight;
      totalWeight += midRange.weight;
    }
    
    // Hohe Frequenzen
    for (let i = highRange.start; i < highRange.end; i += 4) { // Nur jeden 4. Wert für Performance
      weightedSum += frequencies[i] * highRange.weight;
      totalWeight += highRange.weight;
    }
    
    // Gewichteten Durchschnitt berechnen und normalisieren (0-1)
    return weightedSum / (totalWeight * 255);
  }

  // NEU: Dynamische Track-Analyse für adaptive Sensitivität
  private updateTrackAnalysis(energy: number, currentTime: number): void {
    // Starte Track-Analyse wenn noch nicht gestartet
    if (!this.trackAnalysisComplete && this.trackAnalysisStartTime === 0) {
      this.trackAnalysisStartTime = currentTime;
      this.energyHistory = [];
    }
    
    // Sammle Energy-Daten während der Analyse-Phase
    if (!this.trackAnalysisComplete && currentTime - this.trackAnalysisStartTime < this.trackAnalysisDuration) {
      this.energyHistory.push(energy);
      
      // Begrenze die History-Größe
      if (this.energyHistory.length > this.maxEnergyHistoryLength) {
        this.energyHistory.shift();
      }
    }
    
    // Führe adaptive Anpassung durch wenn Analyse abgeschlossen
    if (!this.trackAnalysisComplete && currentTime - this.trackAnalysisStartTime >= this.trackAnalysisDuration) {
      this.performAdaptiveAdjustment();
      this.trackAnalysisComplete = true;
    }
  }
  
  // NEU: Führe adaptive Anpassung basierend auf Track-Eigenschaften durch
  private performAdaptiveAdjustment(): void {
    if (this.energyHistory.length === 0) {
      return;
    }
    
    // Berechne Durchschnitts-Energy und Standardabweichung
    const avgEnergy = this.energyHistory.reduce((sum, e) => sum + e, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / this.energyHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // Berechne Peak-Energy (95. Perzentil)
    const sortedEnergy = [...this.energyHistory].sort((a, b) => a - b);
    const peakIndex = Math.floor(sortedEnergy.length * 0.95);
    const peakEnergy = sortedEnergy[peakIndex];
    
    // Adaptive Threshold-Anpassung
    // Für leise Tracks: niedrigerer Threshold, für laute Tracks: höherer Threshold
    const baseThreshold = 0.04;
    const energyRatio = avgEnergy / baseThreshold;
    
    if (energyRatio < 0.5) {
      // Leiser Track
      this.adaptiveThreshold = Math.max(0.02, avgEnergy * 0.8);
      this.adaptiveSensitivity = Math.min(2.0, this.options.beatSensitivity! * 1.5);
    } else if (energyRatio > 2.0) {
      // Lauter Track
      this.adaptiveThreshold = Math.min(0.15, avgEnergy * 1.2);
      this.adaptiveSensitivity = Math.max(0.5, this.options.beatSensitivity! * 0.7);
    } else {
      // Normaler Track
      this.adaptiveThreshold = Math.max(0.02, Math.min(0.15, avgEnergy));
      this.adaptiveSensitivity = this.options.beatSensitivity!;
    }
    
    // Dynamik-basierte Sensitivitätsanpassung
    const dynamicRange = peakEnergy / avgEnergy;
    if (dynamicRange > 3.0) {
      // Hohe Dynamik - erhöhe Sensitivität
      this.adaptiveSensitivity = Math.min(2.0, this.adaptiveSensitivity * 1.3);
    } else if (dynamicRange < 1.5) {
      // Niedrige Dynamik - reduziere Sensitivität
      this.adaptiveSensitivity = Math.max(0.5, this.adaptiveSensitivity * 0.8);
    }
    
    this.throttledLog(`Track analysis complete - Threshold: ${this.adaptiveThreshold.toFixed(4)}, Sensitivity: ${this.adaptiveSensitivity.toFixed(2)}`, true);
  }

  public resetTrackAnalysis(): void {
    this.trackAnalysisComplete = false;
    this.trackAnalysisStartTime = 0;
    this.energyHistory = [];
    this.adaptiveThreshold = this.options.energyThreshold!;
    this.adaptiveSensitivity = this.options.beatSensitivity!;
  }

  public async detectTempo(): Promise<number> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot detect tempo: audio context or element not initialized');
    }

    try {
      this.throttledLog('Starting tempo detection...', true);
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const tempo = await analyze(audioBuffer);
      this.throttledLog(`Tempo detected: ${tempo} BPM`, true);
      return tempo;
    } catch (error) {
      console.error('Tempo detection failed:', error);
      throw error;
    }
  }

  public async guessBeat(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot guess beat: audio context or element not initialized');
    }

    try {
      this.throttledLog('Starting beat guessing...', true);
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const result = await guess(audioBuffer);
      this.throttledLog(`Beat analysis complete: ${result.bpm} BPM`, true);
      return result;
    } catch (error) {
      console.error('Beat guessing failed:', error);
      throw error;
    }
  }

  public dispose(): void {
    this.stop();
    
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.audioElement) {
      connectedAudioElements.delete(this.audioElement);
      this.audioElement = null;
    }
    
    this.frequencyData = null;
    this.animationFrameId = null;
    
    this.throttledLog('AudioAnalyzer disposed', true);
  }

  public getAnalyzingState(): boolean {
    return this.isAnalyzing;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getLastBeatTime(): number {
    return this.lastBeatTime;
  }
} 