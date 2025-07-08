import { useEffect, useRef, useState, useCallback } from 'react';
import { OptimizedAudioAnalyzer, OptimizedAudioAnalyzerOptions, BeatDetectionResult } from '../lib/audio/optimizedAudioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface UseOptimizedAudioAnalyzerOptions extends OptimizedAudioAnalyzerOptions {
  autoStart?: boolean;
  autoDetectBeat?: boolean;
}

interface UseOptimizedAudioAnalyzerReturn {
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
  isWorkerSupported: boolean;
}

// Globaler optimierter Analyzer für die gesamte Anwendung
export let globalOptimizedAnalyzer: OptimizedAudioAnalyzer | null = null;

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

export function useOptimizedAudioAnalyzer(options?: UseOptimizedAudioAnalyzerOptions): UseOptimizedAudioAnalyzerReturn {
  const analyzerRef = useRef<OptimizedAudioAnalyzer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const initializeAttemptedRef = useRef<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [beatDetected, setBeatDetected] = useState(false);
  const [tempo, setTempo] = useState<number | null>(null);
  const [beatInfo, setBeatInfo] = useState<BeatDetectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isWorkerSupported, setIsWorkerSupported] = useState(false);
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
      }, 100);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [beatDetected]);
  
  // Initialize analyzer with options
  useEffect(() => {
    const defaultOptions = {
      analyzeInterval: 50,
      energyThreshold: 0.1,
      beatSensitivity: 1.2,
      useWorker: true,
      ...options
    };
    
    // Prüfen, ob bereits ein globaler Analyzer existiert
    if (!globalOptimizedAnalyzer) {
      const analyzerOptions: OptimizedAudioAnalyzerOptions = {
        onBeat: (time) => {
          console.log(`Optimized beat detected at time: ${time}, energy: ${energy.toFixed(2)}`);
          setBeatDetected(true);
          triggerBeat();
          setAudioActive(true);
        },
        onEnergy: (e) => {
          setEnergy(e);
          updateEnergy(e);
          
          if (e > 0.03) {
            setAudioActive(true);
          }
          
          if (e > (analyzerOptions.energyThreshold || 0.1)) {
            const now = Date.now();
            const timeSinceLastBeat = now - (analyzerRef.current?.getLastBeatTime() || 0);
            
            if (timeSinceLastBeat > 150) {
              console.log(`Optimized energy-based beat detected: ${e.toFixed(2)}`);
              setBeatDetected(true);
              triggerBeat();
            }
          }
        },
        ...defaultOptions
      };
      
      const newAnalyzer = new OptimizedAudioAnalyzer(analyzerOptions);
      analyzerRef.current = newAnalyzer;
      globalOptimizedAnalyzer = newAnalyzer;
      setIsWorkerSupported(newAnalyzer.isWorkerSupported());
      console.log('Created new optimized audio analyzer with options:', analyzerOptions);
    } else {
      analyzerRef.current = globalOptimizedAnalyzer;
      setIsWorkerSupported(globalOptimizedAnalyzer.isWorkerSupported());
      
      logDebouncer('usingExistingOptimizedAnalyzer', () => {
        console.log('Using existing global optimized audio analyzer');
      });
    }
    
    return () => {
      if (analyzerRef.current === globalOptimizedAnalyzer) {
        // Wir räumen den Analyzer nur auf, wenn die Komponente unmounted wird
      } else if (analyzerRef.current) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
    };
  }, [updateEnergy, triggerBeat, setAudioActive, options]);
  
  const initialize = useCallback(async (audioElement: HTMLAudioElement) => {
    try {
      if (!analyzerRef.current) {
        throw new Error('Analyzer not initialized');
      }
      
      if (initializeAttemptedRef.current || initializingRef.current || isGlobalInitializing) {
        logDebouncer('initializeAttempted', () => {
          console.log('Optimized initialize already attempted or in progress, skipping');
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
        console.log('Optimized audio analyzer initialized successfully');
        
        setAudioActive(true);
        
        if (options?.autoStart) {
          start();
        }
        
        if (options?.autoDetectBeat) {
          try {
            const result = await guessBeat();
            console.log('Optimized auto beat detection result:', result);
          } catch (err) {
            console.error('Optimized auto beat detection failed:', err);
          }
        }
      } finally {
        initializingRef.current = false;
        isGlobalInitializing = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to initialize optimized audio analyzer:', error);
    }
  }, [options?.autoStart, options?.autoDetectBeat, setAudioActive]);
  
  const start = useCallback(() => {
    if (analyzerRef.current && isInitialized && !isAnalyzing) {
      analyzerRef.current.start();
      setIsAnalyzing(true);
      console.log('Optimized audio analysis started');
    }
  }, [isInitialized, isAnalyzing]);
  
  const stop = useCallback(() => {
    if (analyzerRef.current && isAnalyzing) {
      analyzerRef.current.stop();
      setIsAnalyzing(false);
      console.log('Optimized audio analysis stopped');
    }
  }, [isAnalyzing]);
  
  const detectTempo = useCallback(async (): Promise<number> => {
    if (!analyzerRef.current) {
      throw new Error('Analyzer not initialized');
    }
    
    try {
      const detectedTempo = await analyzerRef.current.detectTempo();
      setTempo(detectedTempo);
      return detectedTempo;
    } catch (error) {
      console.error('Failed to detect tempo:', error);
      throw error;
    }
  }, []);
  
  const guessBeat = useCallback(async (): Promise<BeatDetectionResult> => {
    if (!analyzerRef.current) {
      throw new Error('Analyzer not initialized');
    }
    
    try {
      const result = await analyzerRef.current.guessBeat();
      setBeatInfo(result);
      return result;
    } catch (error) {
      console.error('Failed to guess beat:', error);
      throw error;
    }
  }, []);
  
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
    error,
    isWorkerSupported
  };
} 