import { analyze, guess } from 'web-audio-beat-detector';

export interface UltraFastAudioAnalyzerOptions {
  onBeat?: (time: number) => void;
  onEnergy?: (energy: number) => void;
  onFrequency?: (frequencies: Uint8Array) => void;
  beatSensitivity?: number;
  energyThreshold?: number;
  analyzeInterval?: number;
  useWorker?: boolean;
  enablePredictiveBeats?: boolean;
}

export interface BeatDetectionResult {
  bpm: number;
  offset: number;
}

// Speichere eine Referenz auf bereits verbundene Audio-Elemente
const connectedAudioElements = new WeakMap<HTMLAudioElement, AudioContext>();

export class UltraFastAudioAnalyzer {
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
  private lastBeatTime: number = 0;
  private options: UltraFastAudioAnalyzerOptions = {
    beatSensitivity: 1.2,
    energyThreshold: 0.08, // Reduziert für bessere Sensitivität
    analyzeInterval: 16, // 60fps = 16.67ms
    useWorker: true,
    enablePredictiveBeats: true
  };
  private initializationPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private noDataCount: number = 0;
  private maxNoDataCount: number = 10;
  
  // Web Worker
  private worker: Worker | null = null;
  private workerSupported: boolean = false;
  
  // Predictive Beat Detection
  private energyHistory: number[] = [];
  private beatHistory: number[] = [];
  private predictedNextBeat: number = 0;
  private bpmEstimate: number = 120;
  private confidence: number = 0;

  constructor(options?: UltraFastAudioAnalyzerOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    // Prüfe Web Worker Support
    this.workerSupported = typeof Worker !== 'undefined';
    
    console.log('UltraFastAudioAnalyzer initialized with options:', this.options);
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    if (this.audioElement === audioElement && this.audioContext) {
      console.log('Audio element already initialized');
      return Promise.resolve();
    }
    
    this.initializationPromise = new Promise<void>(async (resolve, reject) => {
      try {
        this.audioElement = audioElement;
        this.reconnectAttempts = 0;
        this.noDataCount = 0;
        
        // Prüfe, ob bereits ein AudioContext für dieses Element existiert
        if (connectedAudioElements.has(audioElement)) {
          console.log('Reusing existing AudioContext for this audio element');
          this.audioContext = connectedAudioElements.get(audioElement)!;
          
          if (!this.analyser && this.audioContext) {
            this.setupAnalyzerNodes();
          }
        } else {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('AudioContext created:', this.audioContext.state);
          
          connectedAudioElements.set(audioElement, this.audioContext);
          
          this.audioSource = this.audioContext.createMediaElementSource(audioElement);
          this.setupAnalyzerNodes();
        }
        
        if (this.analyser) {
          this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        }
        
        // Web Worker initialisieren
        if (this.options.useWorker && this.workerSupported) {
          await this.initializeWorker();
        }
        
        console.log('Ultra-fast audio analyzer setup complete. Ready to analyze.');
        resolve();
      } catch (error) {
        console.error('Failed to initialize ultra-fast audio analyzer:', error);
        reject(error);
      } finally {
        this.initializationPromise = null;
      }
    });
    
    return this.initializationPromise;
  }

  private async initializeWorker(): Promise<void> {
    try {
      // Erstelle Web Worker
      this.worker = new Worker(new URL('./audioWorker.ts', import.meta.url));
      
      // Message-Handler für Worker
      this.worker.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'energy':
            if (this.options.onEnergy && data.energy) {
              this.options.onEnergy(data.energy);
              this.updateEnergyHistory(data.energy);
            }
            break;
            
          case 'beat':
            if (this.options.onBeat && data.beatTime) {
              this.lastBeatTime = data.beatTime;
              this.options.onBeat(data.beatTime);
              this.updateBeatHistory(data.beatTime);
            }
            break;
            
          case 'error':
            console.error('Worker error:', data.error);
            break;
        }
      };
      
      // Worker initialisieren
      this.worker.postMessage({
        type: 'initialize',
        data: {
          energyThreshold: this.options.energyThreshold,
          beatSensitivity: this.options.beatSensitivity,
          analyzeInterval: this.options.analyzeInterval
        }
      });
      
      console.log('Web Worker initialized for ultra-fast audio analysis');
    } catch (error) {
      console.warn('Failed to initialize Web Worker, falling back to main thread:', error);
      this.worker = null;
    }
  }

  private setupAnalyzerNodes(): void {
    if (!this.audioContext || !this.audioSource) {
      console.error('Cannot setup analyzer nodes: audioContext or audioSource is null');
      return;
    }
    
    try {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048; // Erhöht für bessere Frequenzauflösung
      this.analyser.smoothingTimeConstant = 0.3; // Reduziert für schnellere Reaktion
      
      this.gainNode = this.audioContext.createGain();
      
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('Connected new audio source to analyzer and destination');
    } catch (error) {
      console.error('Error setting up analyzer nodes:', error);
    }
  }

  public start(): void {
    if (!this.audioContext || !this.analyser) {
      console.warn('Cannot start analysis: analyzer not initialized');
      return;
    }
    
    if (this.isAnalyzing) {
      console.warn('Audio analysis is already running');
      return;
    }

    this.isAnalyzing = true;
    this.noDataCount = 0;
    console.log('Starting ultra-fast audio analysis');
    
    if (this.audioContext.state === 'suspended') {
      console.log('AudioContext is suspended, attempting to resume...');
      
      this.audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully:', this.audioContext?.state);
        this.lastAnalyzeTime = performance.now();
        this.analyze();
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
        this.isAnalyzing = false;
      });
    } else {
      console.log('AudioContext is already running:', this.audioContext.state);
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
    
    // Worker stoppen
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
    }
    
    console.log('Ultra-fast audio analysis stopped');
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
      console.log('Volume set to:', this.gainNode.gain.value);
    }
  }

  private analyze(): void {
    if (!this.isAnalyzing || !this.analyser || !this.frequencyData) {
      console.warn('Cannot analyze: analyzer not initialized or not analyzing');
      return;
    }

    const now = performance.now();
    const timeSinceLastAnalyze = now - this.lastAnalyzeTime;
    
    if (timeSinceLastAnalyze >= (this.options.analyzeInterval || 16)) {
      try {
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        const hasAudioData = this.frequencyData.some(value => value > 0);
        
        if (this.worker && this.workerSupported) {
          // Verwende Web Worker für Analyse
          this.worker.postMessage({
            type: 'analyze',
            data: { frequencies: this.frequencyData }
          });
        } else {
          // Fallback: Analyse im Hauptthread
          this.analyzeInMainThread(this.frequencyData);
        }
        
        // Predictive Beat Detection
        if (this.options.enablePredictiveBeats) {
          this.predictNextBeat();
        }
        
        this.lastAnalyzeTime = now;
      } catch (error) {
        console.error('Error during audio analysis:', error);
      }
    }
    
    if (this.isAnalyzing) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
  }

  private analyzeInMainThread(frequencies: Uint8Array): void {
    const energy = this.calculateEnergy(frequencies);
    const hasAudioData = frequencies.some(value => value > 0);
    
    if (hasAudioData && energy > 0) {
      if (this.options.onEnergy) {
        this.options.onEnergy(energy);
      }
      
      this.updateEnergyHistory(energy);
      
      if (energy > this.options.energyThreshold!) {
        const now = performance.now();
        const timeSinceLastBeat = now - this.lastBeatTime;
        
        if (timeSinceLastBeat > 100) { // Reduziert für schnellere Beat-Erkennung
          const beatIntensity = energy / this.options.energyThreshold!;
          const beatSensitivity = this.options.beatSensitivity || 1.2;
          
          if (beatIntensity > beatSensitivity) {
            this.lastBeatTime = now;
            if (this.options.onBeat) {
              this.options.onBeat(now);
            }
            this.updateBeatHistory(now);
          }
        }
      }
    }
  }

  private calculateEnergy(frequencies: Uint8Array): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    // Optimierte Frequenzgewichtung für schnellere Reaktion
    const lowRange = { start: 0, end: 15, weight: 4.0 };    // Bass (0-300 Hz) - stärker gewichtet
    const midRange = { start: 15, end: 40, weight: 2.0 };   // Mitten (300-800 Hz)
    const highRange = { start: 40, end: 255, weight: 0.3 }; // Höhen (800+ Hz) - weniger gewichtet
    
    // Niedrige Frequenzen (Bass) - wichtig für Beat-Erkennung
    for (let i = lowRange.start; i < lowRange.end; i++) {
      weightedSum += frequencies[i] * lowRange.weight;
      totalWeight += lowRange.weight;
    }
    
    // Mittlere Frequenzen
    for (let i = midRange.start; i < midRange.end; i++) {
      weightedSum += frequencies[i] * midRange.weight;
      totalWeight += midRange.weight;
    }
    
    // Hohe Frequenzen (nur jeden 8. Wert für Performance)
    for (let i = highRange.start; i < highRange.end; i += 8) {
      weightedSum += frequencies[i] * highRange.weight;
      totalWeight += highRange.weight;
    }
    
    return weightedSum / (totalWeight * 255);
  }

  // Predictive Beat Detection
  private updateEnergyHistory(energy: number): void {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 60) { // 1 Sekunde bei 60fps
      this.energyHistory.shift();
    }
  }

  private updateBeatHistory(beatTime: number): void {
    this.beatHistory.push(beatTime);
    if (this.beatHistory.length > 10) {
      this.beatHistory.shift();
    }
    
    // BPM schätzen
    if (this.beatHistory.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this.beatHistory.length; i++) {
        intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      this.bpmEstimate = 60000 / avgInterval; // BPM = 60000ms / durchschnittliches Intervall
      
      // Confidence basierend auf Konsistenz
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      this.confidence = Math.max(0, 1 - (variance / Math.pow(avgInterval, 2)));
    }
  }

  private predictNextBeat(): void {
    if (this.bpmEstimate > 0 && this.confidence > 0.3) {
      const now = performance.now();
      const timeSinceLastBeat = now - this.lastBeatTime;
      const expectedInterval = 60000 / this.bpmEstimate;
      
      // Wenn wir uns dem erwarteten nächsten Beat nähern
      if (timeSinceLastBeat > expectedInterval * 0.8 && timeSinceLastBeat < expectedInterval * 1.2) {
        // Prüfe auf steigende Energie als Bestätigung
        if (this.energyHistory.length >= 3) {
          const recentEnergy = this.energyHistory.slice(-3);
          const energyTrend = (recentEnergy[2] - recentEnergy[0]) / 2;
          
          if (energyTrend > 0.01) { // Steigende Energie
            this.predictedNextBeat = now + (expectedInterval - timeSinceLastBeat);
            
            // Trigger predictive beat mit reduzierter Intensität
            if (this.options.onBeat) {
              console.log(`Predictive beat triggered! BPM: ${this.bpmEstimate.toFixed(1)}, Confidence: ${this.confidence.toFixed(2)}`);
              this.options.onBeat(now);
            }
          }
        }
      }
    }
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
      console.error('Failed to detect tempo:', error);
      return Promise.reject(error);
    }
  }

  public async guessBeat(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioElement) {
      console.error('Cannot guess beat: audio context or element not initialized');
      return Promise.reject(new Error('Audio not initialized'));
    }

    try {
      console.log('Starting beat detection...');
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const result = await guess(audioBuffer);
      console.log('Beat detection complete:', result);
      
      return result;
    } catch (error) {
      console.error('Failed to guess beat:', error);
      return Promise.reject(error);
    }
  }

  public dispose(): void {
    this.stop();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
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
    
    console.log('Ultra-fast audio analyzer disposed');
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

  public isWorkerSupported(): boolean {
    return this.workerSupported;
  }

  public getBPMEstimate(): number {
    return this.bpmEstimate;
  }

  public getConfidence(): number {
    return this.confidence;
  }
} 