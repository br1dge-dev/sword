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
    beatSensitivity: 1.5,
    energyThreshold: 0.3,
    analyzeInterval: 100
  };

  constructor(options?: AudioAnalyzerOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    console.log('AudioAnalyzer initialized with options:', this.options);
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    try {
      this.audioElement = audioElement;
      
      // Prüfe, ob das Audio-Element bereits mit einem AudioContext verbunden ist
      if (connectedAudioElements.has(audioElement)) {
        console.log('Audio element already connected to an AudioContext, reusing it');
        this.audioContext = connectedAudioElements.get(audioElement) || null;
        
        if (!this.audioContext) {
          throw new Error('Failed to retrieve existing AudioContext');
        }
      } else {
        // Create audio context
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('AudioContext created:', this.audioContext.state);
        
        // Speichere die Referenz
        connectedAudioElements.set(audioElement, this.audioContext);
        
        // Create audio source from audio element
        this.audioSource = this.audioContext.createMediaElementSource(audioElement);
        
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
      }
      
      // Wenn wir einen existierenden AudioContext wiederverwenden, müssen wir die Analyser-Nodes neu erstellen
      if (!this.analyser && this.audioContext) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.8;
        
        this.gainNode = this.audioContext.createGain();
        
        // Wir können nicht direkt mit dem Audio-Element verbinden, da es bereits verbunden ist
        // Stattdessen verwenden wir einen neuen Analyser, der mit dem Destination verbunden ist
        this.gainNode.connect(this.audioContext.destination);
        this.analyser.connect(this.gainNode);
      }
      
      // Initialize frequency data array
      if (this.analyser) {
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      }
      
      console.log('Audio analyzer setup complete. Ready to analyze.');
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      return Promise.reject(error);
    }
  }

  public start(): void {
    if (!this.audioContext || !this.analyser || this.isAnalyzing) {
      console.warn('Cannot start analysis: analyzer not initialized or already running');
      return;
    }

    this.isAnalyzing = true;
    console.log('Starting audio analysis');
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.lastAnalyzeTime = performance.now();
    this.analyze();
  }

  public stop(): void {
    this.isAnalyzing = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('Audio analysis stopped');
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
      console.log('Volume set to:', this.gainNode.gain.value);
    }
  }

  private analyze(): void {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData) {
      return;
    }

    const now = performance.now();
    const timeSinceLastAnalyze = now - this.lastAnalyzeTime;
    
    // Nur analysieren, wenn das Intervall überschritten wurde
    if (timeSinceLastAnalyze >= (this.options.analyzeInterval || 100)) {
      // Get frequency data
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Calculate energy (average amplitude)
      const energy = this.calculateEnergy(this.frequencyData);
      
      // Detect beat based on energy threshold
      if (energy > this.options.energyThreshold!) {
        console.log(`Beat detected! Energy: ${energy.toFixed(2)}`);
        this.lastBeatTime = now; // Aktualisiere die Zeit des letzten Beats
        this.options.onBeat?.(this.audioContext!.currentTime);
      }
      
      // Send energy data to callback
      this.options.onEnergy?.(energy);
      
      // Send frequency data to callback
      this.options.onFrequency?.(this.frequencyData);
      
      // Aktualisiere den Zeitstempel
      this.lastAnalyzeTime = now;
    }
    
    // Continue analyzing
    this.animationFrameId = requestAnimationFrame(() => this.analyze());
  }

  private calculateEnergy(frequencies: Uint8Array): number {
    // Optimierte Version für bessere Performance
    let sum = 0;
    const step = 4; // Nur jeden 4. Wert verwenden für bessere Performance
    
    for (let i = 0; i < frequencies.length; i += step) {
      sum += frequencies[i];
    }
    
    return sum / ((frequencies.length / step) * 255); // Normalize to 0-1
  }

  public async detectTempo(): Promise<number> {
    if (!this.audioContext || !this.audioElement) {
      console.error('Cannot detect tempo: audio context or element not initialized');
      return Promise.reject(new Error('Audio not initialized'));
    }

    try {
      console.log('Starting tempo detection...');
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const tempo = await analyze(audioBuffer);
      console.log('Tempo detection complete:', tempo, 'BPM');
      
      return tempo;
    } catch (error) {
      console.error('Tempo detection failed:', error);
      return Promise.reject(error);
    }
  }

  public async guessBeat(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioElement) {
      console.error('Cannot guess beat: audio context or element not initialized');
      return Promise.reject(new Error('Audio not initialized'));
    }

    try {
      console.log('Starting beat guessing...');
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const result = await guess(audioBuffer);
      console.log('Beat guessing complete:', result);
      
      return result;
    } catch (error) {
      console.error('Beat guessing failed:', error);
      return Promise.reject(error);
    }
  }

  public dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      // Wir schließen den AudioContext nicht mehr, da er möglicherweise noch von anderen Komponenten verwendet wird
      // this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.frequencyData = null;
    
    console.log('Audio analyzer disposed');
  }

  // Neue Methode zum Abrufen der Zeit des letzten Beats
  public getLastBeatTime(): number {
    return this.lastBeatTime;
  }
} 