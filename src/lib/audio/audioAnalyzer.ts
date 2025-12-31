import { analyze, guess } from 'web-audio-beat-detector';

export interface AudioAnalyzerOptions {
  onBeat?: (time: number) => void;
  onEnergy?: (energy: number) => void;
  onFrequency?: (frequencies: Uint8Array) => void;
  beatSensitivity?: number;
  energyThreshold?: number;
  analyzeInterval?: number;
  /**
   * Throttle for emitting frequency snapshots to consumers (ms).
   * The analyzer updates its internal FFT every analyze tick, but copying & emitting
   * large Uint8Arrays every tick is expensive. Default ~20Hz.
   */
  frequencyInterval?: number;
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
  private frequencyEmitBuffers: [Uint8Array, Uint8Array] | null = null;
  private frequencyEmitIndex: 0 | 1 = 0;
  private lastAnalyzeTime: number = 0;
  private lastBeatTime: number = 0; // Zeit des letzten erkannten Beats
  private lastFrequencyEmitTime: number = 0;
  private options: AudioAnalyzerOptions = {
    beatSensitivity: 1.0,
    energyThreshold: 0.015, // Niedriger für empfindlichere Reaktion bei 16ms Intervallen
    analyzeInterval: 16, // ~60Hz für bessere Audio-Video-Synchronisation
    frequencyInterval: 16, // ~60Hz Frequenz-Emit
  };
  private initializationPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private noDataCount: number = 0;
  private maxNoDataCount: number = 10;
  private lastEnergy: number = 0; // Speichere die letzte Energie für Throttling
  private prevEnergyForBeat: number = 0; // Separate: used for beat transient detection (don’t reuse `lastEnergy`)
  private prevBassForBeat: number = 0;
  
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
    
    // DEAKTIVIERT: Logging
    // console.log('AudioAnalyzer initialized');
  }

  public updateOptions(options: Partial<AudioAnalyzerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // DEAKTIVIERT: Logging-Methode
  // private throttledLog(message: string, force: boolean = false): void {
  //   const now = Date.now();
  //   if (force || now - this.lastLogTime > this.logThrottleInterval) {
  //     console.log(`[AudioAnalyzer] ${message}`);
  //     this.lastLogTime = now;
  //   }
  // }

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
          const n = this.analyser.frequencyBinCount;
          this.frequencyData = new Uint8Array(n);
          // Double-buffer for zero-allocation snapshot emission.
          this.frequencyEmitBuffers = [new Uint8Array(n), new Uint8Array(n)];
          this.frequencyEmitIndex = 0;
        }
        
        // DEAKTIVIERT: Logging
        // this.throttledLog('Audio analyzer setup complete', true);
        resolve();
      } catch (error) {
        // DEAKTIVIERT: Logging
        // console.error('Failed to initialize audio analyzer:', error);
        reject(error);
      } finally {
        this.initializationPromise = null;
      }
    });
    
    return this.initializationPromise;
  }

  private setupAnalyzerNodes(): void {
    if (!this.audioContext || !this.audioSource) {
      // DEAKTIVIERT: Logging
      // console.error('Cannot setup analyzer nodes: audioContext or audioSource is null');
      return;
    }
    
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      // Higher FFT + lower smoothing => more responsive + more detailed frequency signal.
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.4;
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      
      // Connect nodes
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('Error setting up analyzer nodes:', error);
      throw error;
    }
  }

  public start(): void {
    if (!this.audioContext || !this.analyser) {
      // DEAKTIVIERT: Logging
      // console.warn('Cannot start analysis: analyzer not initialized');
      return;
    }
    
    // Wenn die Analyse bereits läuft, nicht erneut starten
    if (this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;
    this.noDataCount = 0;
    // DEAKTIVIERT: Logging
    // this.throttledLog('Audio analysis started', true);
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      // Versuche den AudioContext zu starten
      this.audioContext.resume().then(() => {
        this.lastAnalyzeTime = performance.now();
        this.analyze();
      }).catch(err => {
        // DEAKTIVIERT: Logging
        // console.error('Failed to resume AudioContext:', err);
        this.isAnalyzing = false;
        
        // Zeige einen Hinweis, dass eine Benutzerinteraktion erforderlich ist
        // DEAKTIVIERT: Logging
        // console.warn('The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page. https://developer.chrome.com/blog/autoplay/#web_audio');
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
    
    // DEAKTIVIERT: Logging
    // this.throttledLog('Audio analysis stopped', true);
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
    
    const analyzeIntervalMs = this.options.analyzeInterval ?? 50;

    // Respect configured interval; schedule via rAF for smoother pacing.
    if (now - this.lastAnalyzeTime < analyzeIntervalMs) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      return;
    }

    try {
      // Hole Frequenzdaten
      // TS 5.9+ types `Uint8Array` as `Uint8Array<ArrayBufferLike>`; WebAudio expects `Uint8Array<ArrayBuffer>`.
      // This is safe because `AnalyserNode` writes into the provided typed array.
      this.analyser.getByteFrequencyData(this.frequencyData as any);
      
      // Emit frequency snapshots to consumers (throttled + copied because WebAudio mutates in-place).
      if (this.options.onFrequency) {
        const freqIntervalMs = this.options.frequencyInterval ?? 50;
        if (now - this.lastFrequencyEmitTime >= freqIntervalMs) {
          this.lastFrequencyEmitTime = now;
          // Copy into a stable buffer (no allocations). Alternate buffers so consumers can safely
          // hold onto the snapshot until the next emit.
          if (!this.frequencyEmitBuffers || this.frequencyEmitBuffers[0].length !== this.frequencyData.length) {
            const n = this.frequencyData.length;
            this.frequencyEmitBuffers = [new Uint8Array(n), new Uint8Array(n)];
            this.frequencyEmitIndex = 0;
          }
          const buf = this.frequencyEmitBuffers[this.frequencyEmitIndex];
          buf.set(this.frequencyData);
          this.frequencyEmitIndex = this.frequencyEmitIndex === 0 ? 1 : 0;
          this.options.onFrequency(buf);
        }
      }
      
      // NEU: Verbesserte Energie-Berechnung mit Frequenzgewichtung
      let sum = 0;
      let count = 0;
      
      // NEU: Frequenzgewichtung für bessere Beat-Erkennung
      const bassWeight = 2.0; // Bass stärker gewichten
      const midWeight = 1.5;  // Mitten mittel gewichten
      const highWeight = 0.8; // Höhen weniger gewichten
      
      // Bass-Bereich (0-20% der Frequenzen)
      const bassEnd = Math.floor(this.frequencyData.length * 0.2);
      let bassSum = 0;
      let bassCount = 0;
      for (let i = 0; i < bassEnd; i++) {
        sum += this.frequencyData[i] * bassWeight;
        count += bassWeight;
        bassSum += this.frequencyData[i];
        bassCount++;
      }
      
      // Mid-Bereich (20-60% der Frequenzen)
      const midStart = bassEnd;
      const midEnd = Math.floor(this.frequencyData.length * 0.6);
      for (let i = midStart; i < midEnd; i++) {
        sum += this.frequencyData[i] * midWeight;
        count += midWeight;
      }
      
      // High-Bereich (60-100% der Frequenzen, jeden 2. Wert für Performance)
      const highStart = midEnd;
      for (let i = highStart; i < this.frequencyData.length; i += 2) {
        sum += this.frequencyData[i] * highWeight;
        count += highWeight;
      }
      
      const average = count > 0 ? sum / count : 0;
      const energy = (average / 255) * 1.1; // Reduzierte Verstärkung für realistischere Werte
      const bassAvg = bassCount > 0 ? bassSum / bassCount : 0;
      const bassEnergy = (bassAvg / 255) * 1.25;
      
      // NEU: Dynamische Track-Analyse für adaptive Sensitivität
      this.updateTrackAnalysis(energy, now);
      
      // NEU: Empfindlichere Reaktion für bessere Beat-Erkennung
      if (energy < 0.002) { // Noch empfindlicher für bessere Reaktivität
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
      
      // NEU: Reaktive Energy-Updates für bessere Beat-Erkennung
      if (Math.abs(energy - this.lastEnergy) > 0.005 || energy > 0.02) { // Noch empfindlicher für bessere Reaktivität
        this.lastEnergy = energy;
        
        if (this.options.onEnergy) {
          this.options.onEnergy(energy);
        }
      }
      
      // NEU: Verbesserte Beat-Erkennung mit adaptiven Schwellenwerten
      const currentThreshold = this.trackAnalysisComplete ? this.adaptiveThreshold : this.options.energyThreshold!;
      const currentSensitivity = this.trackAnalysisComplete ? this.adaptiveSensitivity : this.options.beatSensitivity!;
      
      // NEU: Empfindlichere Beat-Erkennung für bessere Reaktivität
      if (energy > currentThreshold) {
        const timeSinceLastBeat = now - this.lastBeatTime;
        // Keep a longer refractory window: "beatDetected" is a punch trigger, not a continuous flag.
        if (timeSinceLastBeat > 220) {
          const beatIntensity = energy / currentThreshold;
          // IMPORTANT: We need a transient gate; otherwise adaptive thresholds can become "too correct"
          // and intensity collapses to ~1.0, making beats impossible after the first calibration window.
          // Prefer bass transient for beat gating (kick-driven), not melodic/synth spikes.
          const bassDelta = bassEnergy - this.prevBassForBeat;
          const delta = energy - this.prevEnergyForBeat;
          const deltaGate = Math.max(0.008, currentThreshold * 0.35);
          const bassDeltaGate = Math.max(0.02, currentThreshold * 0.55);

          // Sensitivity nudges how strict we are (higher sensitivity => lower required intensity).
          const baseIntensityGate = 1.55; // stricter: avoid firing on melodic/sustained parts
          const effectiveThreshold = Math.max(1.15, baseIntensityGate - (currentSensitivity - 1.0) * 0.18);
          
          // IMPORTANT: Keep beat detection deterministic. Random gating makes visuals feel inconsistent.
          // The min interval + adaptive thresholding already prevent spam.
          if ((bassDelta > bassDeltaGate || delta > deltaGate) && beatIntensity > effectiveThreshold && bassEnergy > 0.11) {
            this.lastBeatTime = now;
            // DEAKTIVIERT: Logging
            // this.throttledLog(`Beat detected - Energy: ${energy.toFixed(3)}, Intensity: ${beatIntensity.toFixed(2)}`);
            if (this.options.onBeat) {
              this.options.onBeat(now);
            }
          }
        }
      }
      // Die High-Energy-Beat-Detection ist entfernt!
      this.prevEnergyForBeat = energy;
      this.prevBassForBeat = bassEnergy;
      
      this.lastAnalyzeTime = now;
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      
    } catch (error) {
      // DEAKTIVIERT: Logging
      // console.error('Audio analysis error:', error);
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
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
        const n = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(n);
        this.frequencyEmitBuffers = [new Uint8Array(n), new Uint8Array(n)];
        this.frequencyEmitIndex = 0;
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
      this.adaptiveThreshold = Math.max(0.012, Math.min(0.06, avgEnergy * 0.45));
      this.adaptiveSensitivity = Math.min(2.0, this.options.beatSensitivity! * 1.15);
    } else if (energyRatio > 1.5) {
      // Lauter Track
      // Keep threshold well below avgEnergy so intensity stays meaningful; clamp keeps it stable across tracks.
      this.adaptiveThreshold = Math.max(0.015, Math.min(0.06, avgEnergy * 0.35));
      this.adaptiveSensitivity = Math.max(0.8, this.options.beatSensitivity! * 1.0);
    } else {
      // Normaler Track
      this.adaptiveThreshold = Math.max(0.014, Math.min(0.06, avgEnergy * 0.4));
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

  public resetTrackAnalysis(): void {
    this.trackAnalysisComplete = false;
    this.trackAnalysisStartTime = 0;
    this.energyHistory = [];
    this.adaptiveThreshold = this.options.energyThreshold!;
    this.adaptiveSensitivity = this.options.beatSensitivity!;
    this.prevEnergyForBeat = 0;
    this.prevBassForBeat = 0;
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

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public getLastBeatTime(): number {
    return this.lastBeatTime;
  }
} 