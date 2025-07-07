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
    energyThreshold: 0.25,
    analyzeInterval: 50
  };
  private initializationPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private noDataCount: number = 0;
  private maxNoDataCount: number = 10;

  constructor(options?: AudioAnalyzerOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    console.log('AudioAnalyzer initialized with options:', this.options);
  }

  public async initialize(audioElement: HTMLAudioElement): Promise<void> {
    // Wenn bereits eine Initialisierung läuft, gib diese zurück
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Prüfe, ob das Audio-Element bereits initialisiert wurde
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
          
          // Prüfe, ob wir einen neuen Analyzer erstellen müssen
          if (!this.analyser && this.audioContext) {
            this.setupAnalyzerNodes();
          }
        } else {
          // Immer einen neuen AudioContext erstellen, um Probleme mit der Wiederverwendung zu vermeiden
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('AudioContext created:', this.audioContext.state);
          
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
        
        console.log('Audio analyzer setup complete. Ready to analyze.');
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
    
    // Wenn die Analyse bereits läuft, nicht erneut starten
    if (this.isAnalyzing) {
      console.warn('Audio analysis is already running');
      return;
    }

    this.isAnalyzing = true;
    this.noDataCount = 0;
    console.log('Starting audio analysis');
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      console.log('AudioContext is suspended, attempting to resume...');
      
      // Versuche den AudioContext zu starten
      this.audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully:', this.audioContext?.state);
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
      console.log('AudioContext is already running:', this.audioContext.state);
      this.lastAnalyzeTime = performance.now();
      this.analyze();
    }
  }

  public stop(): void {
    // Wenn keine Analyse läuft, nichts tun
    if (!this.isAnalyzing) {
      return;
    }
    
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
      console.warn('Cannot analyze: analyzer not initialized or not analyzing');
      return;
    }

    const now = performance.now();
    const timeSinceLastAnalyze = now - this.lastAnalyzeTime;
    
    // Nur analysieren, wenn das Intervall überschritten wurde
    if (timeSinceLastAnalyze >= (this.options.analyzeInterval || 50)) {
      try {
        // Get frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        // Debug: Überprüfe, ob die Frequenzdaten Werte enthalten
        const hasAudioData = this.frequencyData.some(value => value > 0);
        
        // Calculate energy (average amplitude)
        const energy = this.calculateEnergy(this.frequencyData);
        
        // Debug: Logge die Energie alle 2 Sekunden
        if (now % 2000 < 100) {
          console.log(`Current audio energy: ${energy.toFixed(4)}, has data: ${hasAudioData}`);
          
          // Wenn keine Audiodaten vorhanden sind, versuche den Analyzer neu zu verbinden
          if (!hasAudioData && this.audioContext && this.audioElement) {
            this.noDataCount++;
            
            if (this.noDataCount >= this.maxNoDataCount) {
              console.warn('No audio data detected, trying to reconnect analyzer');
              
              // Prüfe, ob das Audio-Element tatsächlich abgespielt wird
              if (!this.audioElement.paused && !this.audioElement.ended && this.audioElement.currentTime > 0) {
                console.log('Audio is playing but no data detected, possible connection issue');
                this.attemptReconnect();
              } else {
                console.log('Audio is not playing, no need to reconnect');
                this.noDataCount = 0;
              }
            }
          } else if (hasAudioData) {
            // Zurücksetzen des Zählers, wenn Daten erkannt wurden
            this.noDataCount = 0;
            
            // Wenn Audiodaten vorhanden sind, rufe den Energy-Callback auf
            if (this.options.onEnergy && energy > 0) {
              this.options.onEnergy(energy);
            }
          }
        } else {
          // Auch außerhalb des Logging-Intervalls den Energy-Callback aufrufen
          if (this.options.onEnergy && energy > 0) {
            this.options.onEnergy(energy);
          }
        }
        
        // Detect beat based on energy threshold with improved sensitivity
        if (energy > this.options.energyThreshold!) {
          const now = performance.now();
          const timeSinceLastBeat = now - this.lastBeatTime;
          
          // Mindestens 150ms zwischen Beats (reduziert von 200ms)
          if (timeSinceLastBeat > 150) {
            // Verbesserte Beat-Erkennung mit Berücksichtigung der Energie-Änderung
            const beatIntensity = energy / this.options.energyThreshold!;
            const beatSensitivity = this.options.beatSensitivity || 1.5;
            
            // Log für Beat-Erkennung
            if (beatIntensity > beatSensitivity) {
              console.log(`Strong beat detected! Energy: ${energy.toFixed(2)}, Intensity: ${beatIntensity.toFixed(2)}`);
            }
            
            this.lastBeatTime = now;
            
            if (this.options.onBeat) {
              this.options.onBeat(now);
            }
          }
        }
        
        this.lastAnalyzeTime = now;
      } catch (error) {
        console.error('Error during audio analysis:', error);
      }
    }
    
    // Weiterhin analysieren
    if (this.isAnalyzing) {
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect audio analyzer (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
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
        
        console.log('Audio analyzer reconnected successfully');
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

  public async detectTempo(): Promise<number> {
    if (!this.audioContext || !this.audioElement) {
      console.error('Cannot detect tempo: audio context or element not initialized');
      return Promise.reject(new Error('Audio not initialized'));
    }

    try {
      // Lade die Audio-Datei und dekodiere sie zu einem AudioBuffer
      console.log('Starting tempo detection...');
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Verwende das AudioBuffer für die Analyse
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
      // Lade die Audio-Datei und dekodiere sie zu einem AudioBuffer
      console.log('Starting beat guessing...');
      const response = await fetch(this.audioElement.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Verwende das AudioBuffer für die Analyse
      const result = await guess(audioBuffer);
      console.log('Beat guessing complete:', result);
      
      return result;
    } catch (error) {
      console.error('Failed to guess beat:', error);
      return Promise.reject(error);
    }
  }

  public dispose(): void {
    // Stoppe die Analyse
    this.stop();
    
    // Trenne Verbindungen
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    
    // Entferne Referenzen
    this.audioSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.frequencyData = null;
    
    console.log('Audio analyzer disposed');
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

  /**
   * Gibt die aktuellen Optionen des Analyzers zurück
   * @returns Die aktuellen Analyzer-Optionen
   */
  public getOptions(): AudioAnalyzerOptions {
    return { ...this.options };
  }
} 