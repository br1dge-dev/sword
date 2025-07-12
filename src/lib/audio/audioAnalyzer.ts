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
    energyThreshold: 0.02, // Reduziert für empfindlichere Reaktionen
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
    this.log('AudioAnalyzer instance created', true);
  }

  private log(message: string, force: boolean = false): void {
    const now = Date.now();
    if (force || now - this.lastLogTime > this.logThrottleInterval) {
      console.log(`[AudioAnalyzer] ${message}`);
      this.lastLogTime = now;
    }
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    this.log(`Initializing with audio element: ${audioElement ? 'available' : 'null'}`, true);
    
    if (this.initializationPromise) {
      this.log('Initialization already in progress, returning existing promise', true);
      return this.initializationPromise;
    }
    
    this.initializationPromise = new Promise<void>(async (resolve, reject) => {
      try {
        this.audioElement = audioElement;
        this.reconnectAttempts = 0;
        this.noDataCount = 0;
        
        // Prüfe, ob bereits ein AudioContext für dieses Element existiert
        if (connectedAudioElements.has(audioElement)) {
          this.log('Using existing AudioContext for this element', true);
          this.audioContext = connectedAudioElements.get(audioElement)!;
          
          // Prüfe, ob wir einen neuen Analyzer erstellen müssen
          if (!this.analyser && this.audioContext) {
            this.setupAnalyzerNodes();
          }
        } else {
          this.log('Creating new AudioContext', true);
          // Erstelle einen neuen AudioContext
          try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Speichere die Referenz
            connectedAudioElements.set(audioElement, this.audioContext);
            
            // Erstelle Audio-Source
            this.audioSource = this.audioContext.createMediaElementSource(audioElement);
            
            // Setup analyzer nodes
            this.setupAnalyzerNodes();
            
            this.log('New AudioContext and nodes created successfully', true);
          } catch (err) {
            this.log(`Error creating AudioContext: ${err}`, true);
            throw err;
          }
        }
        
        // Stelle sicher, dass der AudioContext aktiv ist
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.log('AudioContext is suspended, attempting to resume', true);
          try {
            await this.audioContext.resume();
            this.log('AudioContext resumed successfully', true);
          } catch (err) {
            this.log(`Warning: Failed to resume AudioContext: ${err}`, true);
            // Wir werfen keinen Fehler, da wir später erneut versuchen können
          }
        }
        
        // Initialize frequency data array
        if (this.analyser) {
          this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
          this.log('Frequency data initialized', true);
        } else {
          this.log('Warning: Analyzer not available after setup', true);
        }
        
        this.log('Audio analyzer initialization complete', true);
        resolve();
      } catch (error) {
        this.log(`Initialization failed: ${error}`, true);
        console.error('Failed to initialize audio analyzer:', error);
        reject(error);
      } finally {
        this.initializationPromise = null;
      }
    });
    
    return this.initializationPromise;
  }

  private setupAnalyzerNodes(): void {
    if (!this.audioContext) {
      this.log('Cannot setup analyzer nodes: audioContext is null', true);
      return;
    }
    
    try {
      this.log('Setting up analyzer nodes', true);
      
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // Connect nodes
      if (this.audioSource) {
        // Verbindung: audioSource -> gainNode -> analyser -> destination
        this.audioSource.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.log('Audio nodes connected successfully', true);
      } else {
        this.log('Cannot connect nodes: audioSource is null', true);
        throw new Error('AudioSource is null, cannot setup analyzer nodes');
      }
      
      // Initialisiere Frequenzdaten
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      
    } catch (error) {
      this.log(`Error setting up analyzer nodes: ${error}`, true);
      console.error('Error setting up analyzer nodes:', error);
      throw error;
    }
  }

  public start(): void {
    if (this.isAnalyzing) {
      this.log('Already analyzing, ignoring start request', false);
      return;
    }
    
    if (!this.audioContext || !this.analyser) {
      this.log('Cannot start: analyzer not fully initialized', true);
      return;
    }
    
    // Stelle sicher, dass der AudioContext aktiv ist
    if (this.audioContext.state === 'suspended') {
      this.log('AudioContext is suspended, attempting to resume', true);
      this.audioContext.resume().then(() => {
        this.log('AudioContext resumed, now starting analysis', true);
        this.startAnalysis();
      }).catch(err => {
        this.log(`Failed to resume AudioContext: ${err}`, true);
      });
      return;
    }
    
    this.startAnalysis();
  }
  
  private startAnalysis(): void {
    if (!this.analyser || !this.audioContext) {
      this.log('Cannot start analysis: analyzer or context not available', true);
      return;
    }
    
    // Stelle sicher, dass wir Frequenzdaten haben
    if (!this.frequencyData) {
      this.log('Initializing frequency data', true);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    this.log('Starting audio analysis', true);
    this.isAnalyzing = true;
    this.analyzeAudio();
  }

  public stop(): void {
    if (!this.isAnalyzing) {
      return;
    }
    
    this.log('Stopping audio analysis', true);
    this.isAnalyzing = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
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

  private analyzeAudio(): void {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastAnalyze = now - this.lastAnalyzeTime;
    
    // Nur analysieren, wenn genug Zeit vergangen ist
    if (timeSinceLastAnalyze >= (this.options.analyzeInterval || 50)) {
      this.lastAnalyzeTime = now;
      
      // Get frequency data
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Calculate energy (normalized sum of frequency values)
      let sum = 0;
      let count = 0;
      
      for (let i = 0; i < this.frequencyData.length; i++) {
        if (this.frequencyData[i] > 0) {
          sum += this.frequencyData[i];
          count++;
        }
      }
      
      // Prüfe, ob wir überhaupt Daten haben
      if (count === 0) {
        this.noDataCount++;
        
        if (this.noDataCount > this.maxNoDataCount) {
          this.log('No audio data detected for too long, checking connection', true);
          this.reconnectIfNeeded();
          this.noDataCount = 0;
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.analyzeAudio());
        return;
      }
      
      // Reset no-data counter
      this.noDataCount = 0;
      
      // Calculate energy (0-1 range)
      const energy = sum / (count * 255);
      
      // Speichere für Track-Analyse
      if (this.energyHistory.length < this.maxEnergyHistoryLength) {
        this.energyHistory.push(energy);
        
        // Starte Track-Analyse-Timer, wenn wir den ersten Wert bekommen
        if (this.energyHistory.length === 1) {
          this.trackAnalysisStartTime = now;
          this.log('Starting track analysis', true);
        }
      }
      
      // Führe Track-Analyse durch, wenn genug Daten gesammelt wurden
      if (!this.trackAnalysisComplete && 
          this.trackAnalysisStartTime > 0 && 
          now - this.trackAnalysisStartTime >= this.trackAnalysisDuration && 
          this.energyHistory.length > 0) {
        this.analyzeTrack();
      }
      
      // Detect beats based on energy and threshold
      if (energy > (this.options.energyThreshold || 0.02) * (this.adaptiveSensitivity || 1.0)) {
        const timeSinceLastBeat = now - this.lastBeatTime;
        
        // Ensure minimum time between beats (avoid rapid triggers)
        if (timeSinceLastBeat > 100) {
          this.lastBeatTime = now;
          this.log(`Beat detected! Energy: ${energy.toFixed(4)}, Threshold: ${(this.options.energyThreshold || 0.02).toFixed(4)}`, false);
          
          if (this.options.onBeat) {
            this.options.onBeat(now);
          }
        }
      }
      
      // Call energy callback
      if (this.options.onEnergy) {
        // Nur wenn sich die Energie signifikant geändert hat
        if (Math.abs(energy - this.lastEnergy) > 0.01) {
          this.options.onEnergy(energy);
          this.lastEnergy = energy;
        }
      }
      
      // Call frequency callback
      if (this.options.onFrequency) {
        this.options.onFrequency(this.frequencyData);
      }
    }
    
    // Continue analyzing
    this.animationFrameId = requestAnimationFrame(() => this.analyzeAudio());
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // DEAKTIVIERT: Logging
      // console.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      return;
    }
    
    this.reconnectAttempts++;
    // DEAKTIVIERT: Logging
    // this.throttledLog(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
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
        
        // DEAKTIVIERT: Logging
        // this.throttledLog('Audio analyzer reconnected successfully', true);
      }
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('Failed to reconnect audio analyzer:', error);
      this.reconnectAttempts++;
    }
  }

  private reconnectIfNeeded(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached, giving up', true);
      return;
    }
    
    this.reconnectAttempts++;
    this.log(`Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, true);
    
    // Versuche, die Verbindung wiederherzustellen
    if (this.audioElement && this.audioContext) {
      try {
        // Versuche, den AudioContext neu zu starten
        this.audioContext.resume().then(() => {
          this.log('AudioContext resumed successfully', true);
        }).catch(err => {
          this.log(`Failed to resume AudioContext: ${err}`, true);
        });
      } catch (error) {
        this.log(`Error during reconnect: ${error}`, true);
      }
    }
  }
  
  private analyzeTrack(): void {
    if (this.energyHistory.length === 0) {
      return;
    }
    
    this.log('Analyzing track characteristics', true);
    
    // Berechne Durchschnitt und Maximum der Energy-Werte
    let sum = 0;
    let max = 0;
    
    for (const energy of this.energyHistory) {
      sum += energy;
      if (energy > max) {
        max = energy;
      }
    }
    
    const avgEnergy = sum / this.energyHistory.length;
    const peakEnergy = max;
    
    // Passe die Schwellenwerte basierend auf den Charakteristiken des Tracks an
    if (avgEnergy > 0) {
      // Für Tracks mit hoher Durchschnittsenergie: niedrigere Schwellenwerte
      if (avgEnergy > 0.1) {
        this.adaptiveThreshold = Math.max(0.02, avgEnergy * 0.5);
        this.adaptiveSensitivity = 0.8;
      }
      // Für Tracks mit mittlerer Durchschnittsenergie: mittlere Schwellenwerte
      else if (avgEnergy > 0.05) {
        this.adaptiveThreshold = Math.max(0.015, avgEnergy * 0.6);
        this.adaptiveSensitivity = 1.0;
      }
      // Für Tracks mit niedriger Durchschnittsenergie: höhere Schwellenwerte
      else {
        this.adaptiveThreshold = Math.max(0.01, avgEnergy * 0.7);
        this.adaptiveSensitivity = 1.2;
      }
    }
    
    this.trackAnalysisComplete = true;
    this.log(`Track analysis complete - Threshold: ${this.adaptiveThreshold.toFixed(4)}, Sensitivity: ${this.adaptiveSensitivity.toFixed(2)}, AvgEnergy: ${avgEnergy.toFixed(4)}, PeakEnergy: ${peakEnergy.toFixed(4)}`, true);
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
    
    // NEU: Verbesserte adaptive Threshold-Anpassung für realistische Energy-Werte
    const baseThreshold = 0.02; // Reduziert von 0.04 für realistischere Werte
    const energyRatio = avgEnergy / baseThreshold;
    
    if (energyRatio < 0.8) {
      // Leiser Track (wie Nightsword)
      this.adaptiveThreshold = Math.max(0.01, avgEnergy * 0.6); // Noch niedriger für empfindlichere Reaktion
      this.adaptiveSensitivity = Math.min(2.5, this.options.beatSensitivity! * 2.0); // Erhöht für bessere Beat-Erkennung
    } else if (energyRatio > 1.5) {
      // Lauter Track
      this.adaptiveThreshold = Math.min(0.1, avgEnergy * 1.0); // Reduziert von 0.15 auf 0.1
      this.adaptiveSensitivity = Math.max(0.3, this.options.beatSensitivity! * 0.8); // Reduziert von 0.5 auf 0.3
    } else {
      // Normaler Track
      this.adaptiveThreshold = Math.max(0.01, Math.min(0.1, avgEnergy)); // Reduziert von 0.02/0.15 auf 0.01/0.1
      this.adaptiveSensitivity = this.options.beatSensitivity!;
    }
    
    // NEU: Verbesserte dynamik-basierte Sensitivitätsanpassung
    const dynamicRange = peakEnergy / avgEnergy;
    if (dynamicRange > 2.5) { // Reduziert von 3.0 für empfindlichere Reaktion
      // Hohe Dynamik - erhöhe Sensitivität
      this.adaptiveSensitivity = Math.min(3.0, this.adaptiveSensitivity * 1.5); // Erhöht von 2.0/1.3 auf 3.0/1.5
    } else if (dynamicRange < 2.0) { // Erhöht von 1.5 für bessere Anpassung
      // Niedrige Dynamik - reduziere Sensitivität
      this.adaptiveSensitivity = Math.max(0.3, this.adaptiveSensitivity * 0.7); // Reduziert von 0.5/0.8 auf 0.3/0.7
    }
    
    // DEAKTIVIERT: Logging
    // this.throttledLog(`Track analysis complete - Threshold: ${this.adaptiveThreshold.toFixed(4)}, Sensitivity: ${this.adaptiveSensitivity.toFixed(2)}, AvgEnergy: ${avgEnergy.toFixed(4)}, PeakEnergy: ${peakEnergy.toFixed(4)}`, true);
  }

  // Gibt den AudioContext zurück
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
  
  // Gibt die Zeit des letzten erkannten Beats zurück
  public getLastBeatTime(): number {
    return this.lastBeatTime;
  }

  // Setzt die Track-Analyse zurück
  public resetTrackAnalysis(): void {
    this.trackAnalysisComplete = false;
    this.trackAnalysisStartTime = 0;
    this.energyHistory = [];
    this.adaptiveThreshold = 0.04;
    this.adaptiveSensitivity = 1.0;
  }

  public async detectTempo(): Promise<number> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot detect tempo: audio context or element not initialized');
    }

    try {
      // DEAKTIVIERT: Logging
      // this.throttledLog('Starting tempo detection...', true);
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const tempo = await analyze(audioBuffer);
      // DEAKTIVIERT: Logging
      // this.throttledLog(`Tempo detected: ${tempo} BPM`, true);
      return tempo;
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('Tempo detection failed:', error);
      throw error;
    }
  }

  public async guessBeat(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot guess beat: audio context or element not initialized');
    }

    try {
      // DEAKTIVIERT: Logging
      // this.throttledLog('Starting beat guessing...', true);
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const result = await guess(audioBuffer);
      // DEAKTIVIERT: Logging
      // this.throttledLog(`Beat analysis complete: ${result.bpm} BPM`, true);
      return result;
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('Beat guessing failed:', error);
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
    
    // DEAKTIVIERT: Logging
    // this.throttledLog('AudioAnalyzer disposed', true);
  }

  public getAnalyzingState(): boolean {
    return this.isAnalyzing;
  }
} 