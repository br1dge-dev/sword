import { useEffect, useRef, useState } from 'react';
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

// Globaler Analyzer für die gesamte Anwendung
export let globalAnalyzer: AudioAnalyzer | null = null;

// Flag, um zu verfolgen, ob eine Initialisierung im Gange ist
let isGlobalInitializing = false;

// Debounce-Funktion für Logging
const createDebouncer = (interval: number = 1000) => {
  const lastCalled: Record<string, number> = {};
  
  return (key: string, fn: Function) => {
    const now = Date.now();
    if (!lastCalled[key] || now - lastCalled[key] > interval) {
      lastCalled[key] = now;
      fn();
    }
  };
};

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
  
  // Initialize analyzer with options
  useEffect(() => {
    // Standard-Analyseintervall für bessere Performance
    const defaultOptions = {
      analyzeInterval: 50, // Reduziert von 100ms auf 50ms für schnellere Reaktion
      energyThreshold: 0.05, // Noch niedriger für bessere Beat-Erkennung
      beatSensitivity: 1.0, // Noch empfindlicher
      ...options
    };
    
    // Prüfen, ob bereits ein globaler Analyzer existiert
    if (!globalAnalyzer) {
      // Immer einen neuen Analyzer erstellen
      const analyzerOptions: AudioAnalyzerOptions = {
        onBeat: (time) => {
          console.log(`Beat detected at time: ${time}, energy: ${energy.toFixed(2)}`);
          setBeatDetected(true);
          triggerBeat(); // Aktualisiere den globalen Store
          
          // Audio als aktiv markieren
          setAudioActive(true);
        },
        onEnergy: (e) => {
          setEnergy(e);
          updateEnergy(e); // Aktualisiere den globalen Store
          
          // Wenn Energie über 0.03 liegt, setzen wir Audio als aktiv (reduziert von 0.05)
          if (e > 0.03) {
            setAudioActive(true);
          }
          
          // Wenn Energie über dem Schwellenwert liegt, könnte es ein Beat sein
          if (e > (analyzerOptions.energyThreshold || 0.1)) {
            const now = Date.now();
            const timeSinceLastBeat = now - (analyzerRef.current?.getLastBeatTime() || 0);
            
            // Mindestens 150ms zwischen Beats (reduziert von 200ms)
            if (timeSinceLastBeat > 150) {
              console.log(`Energy-based beat detected: ${e.toFixed(2)}`);
              setBeatDetected(true);
              triggerBeat();
            }
          }
        },
        ...defaultOptions
      };
      
      const newAnalyzer = new AudioAnalyzer(analyzerOptions);
      analyzerRef.current = newAnalyzer;
      globalAnalyzer = newAnalyzer; // Aktualisiere den globalen Analyzer
      console.log('Created new audio analyzer with options:', analyzerOptions);
    } else {
      // Verwende den existierenden globalen Analyzer
      analyzerRef.current = globalAnalyzer;
      
      // Debounce das Logging, um Konsolenflut zu vermeiden
      logDebouncer('usingExistingAnalyzer', () => {
        console.log('Using existing global audio analyzer');
      });
    }
    
    return () => {
      // Wir räumen den Analyzer nur auf, wenn die Komponente unmounted wird und es keine anderen Nutzer gibt
      if (analyzerRef.current === globalAnalyzer) {
        // Hier könnten wir prüfen, ob andere Komponenten den Analyzer noch verwenden
        // Für jetzt lassen wir den globalen Analyzer bestehen
      } else if (analyzerRef.current) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
    };
  }, [updateEnergy, triggerBeat, setAudioActive, options]);
  
  const initialize = async (audioElement: HTMLAudioElement) => {
    try {
      if (!analyzerRef.current) {
        throw new Error('Analyzer not initialized');
      }
      
      // Vermeide mehrfache Initialisierungsversuche
      if (initializeAttemptedRef.current || initializingRef.current || isGlobalInitializing) {
        // Debounce das Logging, um Konsolenflut zu vermeiden
        logDebouncer('initializeAttempted', () => {
          console.log('Initialize already attempted or in progress, skipping');
        });
        return;
      }
      
      initializeAttemptedRef.current = true;
      initializingRef.current = true;
      isGlobalInitializing = true;
      audioElementRef.current = audioElement;
      
      try {
        await analyzerRef.current.initialize(audioElement);
        setIsInitialized(true);
        console.log('Audio analyzer initialized successfully');
        
        // Audio als aktiv markieren
        setAudioActive(true);
        
        if (options?.autoStart) {
          start();
        }
        
        if (options?.autoDetectBeat) {
          try {
            const result = await guessBeat();
            console.log('Auto beat detection result:', result);
          } catch (err) {
            console.error('Auto beat detection failed:', err);
          }
        }
      } finally {
        initializingRef.current = false;
        isGlobalInitializing = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  };
  
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