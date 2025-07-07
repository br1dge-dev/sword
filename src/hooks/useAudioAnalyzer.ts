import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { AudioAnalyzer, AudioAnalyzerOptions, BeatDetectionResult } from '../lib/audio/audioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface UseAudioAnalyzerOptions extends AudioAnalyzerOptions {
  autoStart?: boolean;
  autoDetectBeat?: boolean;
}

interface UseAudioAnalyzerReturn {
  initialize: (audioElement: HTMLAudioElement) => Promise<void>;
  start: () => void;
  stop: () => void;
  detectTempo: () => Promise<number>;
  guessBeat: () => Promise<BeatDetectionResult>;
  isInitialized: boolean;
  isAnalyzing: boolean;
  energy: number;
  beatDetected: boolean;
  tempo: number | null;
  beatInfo: BeatDetectionResult | null;
  error: Error | null;
}

// Globale Instanz des Audio-Analyzers
let globalAnalyzer: AudioAnalyzer | null = null;
let isGlobalInitializing = false;

// Einfacher Debouncer für wiederholte Funktionsaufrufe
function createDebouncer(delay: number) {
  const timeouts: Record<string, NodeJS.Timeout> = {};
  
  return (key: string, fn: () => void) => {
    if (timeouts[key]) {
      clearTimeout(timeouts[key]);
    }
    
    timeouts[key] = setTimeout(() => {
      fn();
      delete timeouts[key];
    }, delay);
  };
}

// Debouncer für Logs
const logDebouncer = createDebouncer(2000);

export function useAudioAnalyzer(options?: UseAudioAnalyzerOptions): UseAudioAnalyzerReturn {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const initializeAttemptedRef = useRef<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [beatDetected, setBeatDetected] = useState(false);
  const [tempo, setTempo] = useState<number | null>(null);
  const [beatInfo, setBeatInfo] = useState<BeatDetectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef<boolean>(false);
  const lastLogTimeRef = useRef<number>(0);
  
  // Audio-Reaction-Store
  const { updateEnergy, triggerBeat, setAudioActive } = useAudioReactionStore();
  
  // Reset beat detection after a short delay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (beatDetected) {
      timeoutId = setTimeout(() => {
        setBeatDetected(false);
      }, 100); // Reset after 100ms
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [beatDetected]);
  
  // Memoize analyzer options to prevent unnecessary re-creation
  const analyzerOptions = useMemo(() => {
    return {
      beatSensitivity: options?.beatSensitivity || 1.5,
      energyThreshold: options?.energyThreshold || 0.25,
      analyzeInterval: options?.analyzeInterval || 50
    };
  }, [options?.beatSensitivity, options?.energyThreshold, options?.analyzeInterval]);
  
  // Create or reuse analyzer instance
  useEffect(() => {
    // Vermeide unnötige Neuerstellung des Analyzers
    if (analyzerRef.current) {
      return;
    }
    
    // Verwende globalen Analyzer, wenn verfügbar
    if (globalAnalyzer) {
      // Prüfe, ob der globale Analyzer mit den gewünschten Optionen kompatibel ist
      const currentOptions = globalAnalyzer.getOptions();
      const optionsMatch = 
        currentOptions.beatSensitivity === analyzerOptions.beatSensitivity &&
        currentOptions.energyThreshold === analyzerOptions.energyThreshold &&
        currentOptions.analyzeInterval === analyzerOptions.analyzeInterval;
      
      if (optionsMatch) {
        analyzerRef.current = globalAnalyzer;
        
        // Debounce das Logging, um Konsolenflut zu vermeiden
        logDebouncer('usingExistingAnalyzer', () => {
          console.log('Using existing global audio analyzer');
        });
        return;
      }
    }
    
    // Erstelle einen neuen Analyzer mit den angegebenen Optionen
    analyzerRef.current = new AudioAnalyzer(analyzerOptions);
    globalAnalyzer = analyzerRef.current;
    
    // Aktualisiere den globalen Analyzer
    console.log('Created new audio analyzer with options:', analyzerOptions);
  }, [analyzerOptions]);
  
  // Verbesserte Bereinigung beim Unmounten
  useEffect(() => {
    return () => {
      // Wir räumen den Analyzer nur auf, wenn die Komponente unmounted wird und es keine anderen Nutzer gibt
      if (analyzerRef.current && analyzerRef.current !== globalAnalyzer) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      } else if (analyzerRef.current === globalAnalyzer && globalAnalyzer) {
        // Wenn wir den globalen Analyzer verwenden, prüfen wir, ob noch andere Komponenten ihn nutzen
        // Für jetzt lassen wir den globalen Analyzer bestehen, aber in einer erweiterten Version
        // könnten wir einen Referenzzähler implementieren
        console.log('Component unmounted, but keeping global analyzer');
        
        // Stoppe die Analyse, wenn keine anderen Komponenten sie benötigen
        // Dies ist eine einfache Heuristik - in einer vollständigen Implementierung
        // würden wir einen Referenzzähler verwenden
        if (document.querySelectorAll('audio').length === 0) {
          console.log('No audio elements found, stopping global analyzer');
          globalAnalyzer.stop();
        }
      }
    };
  }, []);
  
  // Initialize analyzer with audio element
  const initialize = useCallback(async (audioElement: HTMLAudioElement): Promise<void> => {
    if (!analyzerRef.current) {
      setError(new Error('Analyzer not created'));
      return;
    }
    
    // Speichere Referenz auf das Audio-Element
    audioElementRef.current = audioElement;
    
    try {
      initializingRef.current = true;
      await analyzerRef.current.initialize(audioElement);
      setIsInitialized(true);
      setError(null);
      initializingRef.current = false;
      initializeAttemptedRef.current = true;
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      initializingRef.current = false;
      initializeAttemptedRef.current = true;
    }
  }, []);
  
  const start = () => {
    if (!analyzerRef.current) {
      console.warn('Cannot start: analyzer not initialized');
      return;
    }
    
    if (isAnalyzing) {
      console.log('Audio analysis already running, not starting again');
      return;
    }
    
    analyzerRef.current.start();
    setIsAnalyzing(true);
    console.log('Audio analysis started');
    
    // Audio als aktiv markieren, wenn Analyse startet
    setAudioActive(true);
  };
  
  const stop = () => {
    if (!analyzerRef.current || !isAnalyzing) {
      return;
    }
    
    analyzerRef.current.stop();
    setIsAnalyzing(false);
    console.log('Audio analysis stopped');
  };
  
  const detectTempo = async (): Promise<number> => {
    try {
      if (!analyzerRef.current || !isInitialized) {
        throw new Error('Cannot detect tempo: analyzer not initialized');
      }
      
      const detectedTempo = await analyzerRef.current.detectTempo();
      setTempo(detectedTempo);
      console.log('Detected tempo:', detectedTempo, 'BPM');
      return detectedTempo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Tempo detection failed:', error);
      throw error;
    }
  };
  
  const guessBeat = async (): Promise<BeatDetectionResult> => {
    try {
      if (!analyzerRef.current || !isInitialized) {
        throw new Error('Cannot guess beat: analyzer not initialized');
      }
      
      const result = await analyzerRef.current.guessBeat();
      setBeatInfo(result);
      console.log('Guessed beat:', result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Beat guessing failed:', error);
      throw error;
    }
  };
  
  return {
    initialize,
    start,
    stop,
    detectTempo,
    guessBeat,
    isInitialized,
    isAnalyzing,
    energy,
    beatDetected,
    tempo,
    beatInfo,
    error
  };
} 