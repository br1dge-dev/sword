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

export interface TrackConfig {
  energyThreshold: number;
  beatSensitivity: number;
  analyzeInterval: number;
  smoothingTimeConstant: number;
  minBeatInterval: number;
  bassWeight: number;
  midWeight: number;
  highWeight: number;
}

// Speichere eine Referenz auf bereits verbundene Audio-Elemente
const connectedAudioElements = new WeakMap<HTMLAudioElement, AudioContext>();

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isAnalyzing = false;
  private animationFrameId: number | null = null;
  private frequencyData: Uint8Array | null = null;
  private lastAnalyzeTime: number = 0;
  private lastBeatTime: number = 0;
  private lastEnergy: number = 0;
  
  // Callback-Optionen
  private options: AudioAnalyzerOptions = {};
  
  // Vereinfachte Konfiguration
  private config: TrackConfig = {
    energyThreshold: 0.02,
    beatSensitivity: 1.0,
    analyzeInterval: 50,
    smoothingTimeConstant: 0.8,
    minBeatInterval: 120,
    bassWeight: 2.0,
    midWeight: 1.5,
    highWeight: 0.8
  };
  
  private currentTrackId: string | null = null;

  constructor(options?: AudioAnalyzerOptions) {
    // Callback-Optionen speichern
    if (options) {
      this.options = { ...options };
      // Basis-Optionen setzen
      this.config.energyThreshold = options.energyThreshold ?? this.config.energyThreshold;
      this.config.beatSensitivity = options.beatSensitivity ?? this.config.beatSensitivity;
      this.config.analyzeInterval = options.analyzeInterval ?? this.config.analyzeInterval;
    }
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    this.audioElement = audioElement;
    
    // Prüfe, ob bereits ein AudioContext für dieses Element existiert
    if (connectedAudioElements.has(audioElement)) {
      this.audioContext = connectedAudioElements.get(audioElement)!;
    } else {
      // Erstelle neuen AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      connectedAudioElements.set(audioElement, this.audioContext);
      
      // Erstelle Audio-Nodes
      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      this.setupAnalyzerNodes();
    }
    
    // Initialize frequency data array
    if (this.analyser) {
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    // Lade Track-spezifische Konfiguration
    await this.loadTrackConfig();
  }

  private setupAnalyzerNodes(): void {
    if (!this.audioContext || !this.audioSource) return;
    
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      
      // Connect nodes
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      throw error;
    }
  }

  private async loadTrackConfig(): Promise<void> {
    if (!this.audioElement) return;
    
    try {
      // Extrahiere Track-ID aus dem Dateinamen
      const trackPath = this.audioElement.src;
      const trackName = trackPath.split('/').pop()?.replace('.mp3', '');
      
      if (!trackName) return;
      
      this.currentTrackId = trackName;
      
      // Lade Track-Konfiguration
      const configPath = `/config/tracks/${trackName}.json`;
      
      try {
        const response = await fetch(configPath);
        if (response.ok) {
          const trackConfig = await response.json();
          this.config = { ...this.config, ...trackConfig.config };
          
          // Aktualisiere Analyzer-Node mit neuen Werten
          if (this.analyser) {
            this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
          }
          
          // console.log(`🎵 Track-Konfiguration geladen: ${trackName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Keine Track-Konfiguration gefunden für: ${trackName}, verwende Standard-Werte`);
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden der Track-Konfiguration:', error);
    }
  }

  public start(): void {
    if (!this.audioContext || !this.analyser || this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.lastAnalyzeTime = performance.now();
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.analyze();
      }).catch(() => {
        this.isAnalyzing = false;
      });
    } else {
      this.analyze();
    }
  }

  public stop(): void {
    this.isAnalyzing = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private analyze(): void {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData) return;

    const now = performance.now();
    
    // Prüfe Analyze-Interval
    if (now - this.lastAnalyzeTime < this.config.analyzeInterval) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      return;
    }

    try {
      // Hole Frequenzdaten
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Berechne Energy mit track-spezifischen Gewichtungen
      const energy = this.calculateEnergy();
      
      // Energy-Callback
      if (Math.abs(energy - this.lastEnergy) > 0.005 || energy > 0.02) {
        this.lastEnergy = energy;
        if (this.options?.onEnergy) {
          this.options.onEnergy(energy);
        }
      }

      // Beat-Detection
      if (energy > this.config.energyThreshold) {
        const timeSinceLastBeat = now - this.lastBeatTime;
        if (timeSinceLastBeat > this.config.minBeatInterval) {
          const beatIntensity = energy / this.config.energyThreshold;
          const effectiveThreshold = 3 + (2.5 - this.config.beatSensitivity) * 3;
          
          if (beatIntensity > effectiveThreshold && Math.random() < 0.85) {
            this.lastBeatTime = now;
            if (this.options?.onBeat) {
              this.options.onBeat(now);
            }
          }
        }
      }

      this.lastAnalyzeTime = now;
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      
    } catch (error) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
  }

  private calculateEnergy(): number {
    if (!this.frequencyData) return 0;
    
    let sum = 0;
    let count = 0;
    
    // Bass-Bereich (0-20% der Frequenzen)
    const bassEnd = Math.floor(this.frequencyData.length * 0.2);
    for (let i = 0; i < bassEnd; i++) {
      sum += this.frequencyData[i] * this.config.bassWeight;
      count += this.config.bassWeight;
    }
    
    // Mid-Bereich (20-60% der Frequenzen)
    const midStart = bassEnd;
    const midEnd = Math.floor(this.frequencyData.length * 0.6);
    for (let i = midStart; i < midEnd; i++) {
      sum += this.frequencyData[i] * this.config.midWeight;
      count += this.config.midWeight;
    }
    
    // High-Bereich (60-100% der Frequenzen)
    const highStart = midEnd;
    for (let i = highStart; i < this.frequencyData.length; i += 2) {
      sum += this.frequencyData[i] * this.config.highWeight;
      count += this.config.highWeight;
    }
    
    const average = count > 0 ? sum / count : 0;
    return (average / 255) * 1.1;
  }

  // Öffentliche Setter für Debug-Panel
  public setEnergyThreshold(threshold: number): void {
    this.config.energyThreshold = Math.max(0.001, Math.min(1.0, threshold));
  }

  public setBeatSensitivity(sensitivity: number): void {
    this.config.beatSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  public setAnalyzeInterval(interval: number): void {
    this.config.analyzeInterval = Math.max(10, Math.min(500, interval));
  }

  public setSmoothingTimeConstant(val: number): void {
    this.config.smoothingTimeConstant = Math.max(0.1, Math.min(0.99, val));
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    }
  }

  public setMinBeatInterval(val: number): void {
    this.config.minBeatInterval = Math.max(10, Math.min(1000, val));
  }

  public setBassWeight(val: number): void {
    this.config.bassWeight = Math.max(0.1, Math.min(5.0, val));
  }

  public setMidWeight(val: number): void {
    this.config.midWeight = Math.max(0.1, Math.min(5.0, val));
  }

  public setHighWeight(val: number): void {
    this.config.highWeight = Math.max(0.1, Math.min(5.0, val));
  }

  // Getter für Debug-Panel
  public getConfig(): TrackConfig {
    return { ...this.config };
  }

  public getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }

  // Legacy-Methoden für Kompatibilität
  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public async detectTempo(): Promise<number> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot detect tempo: audio context or element not initialized');
    }

    try {
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return await analyze(audioBuffer);
    } catch (error) {
      throw error;
    }
  }

  public async guessBeat(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioElement) {
      throw new Error('Cannot guess beat: audio context or element not initialized');
    }

    try {
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return await guess(audioBuffer);
    } catch (error) {
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