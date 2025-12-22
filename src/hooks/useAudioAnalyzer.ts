import { useEffect, useRef, useState } from 'react';
import { AudioAnalyzer, AudioAnalyzerOptions, BeatDetectionResult } from '../lib/audio/audioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface UseAudioAnalyzerOptions extends AudioAnalyzerOptions {
  autoStart?: boolean;
  autoDetectBeat?: boolean;
  frequencyInterval?: number; // Throttle for frequency snapshots pushed to consumers (handled in AudioAnalyzer)
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

// ENTFERNT: Logging-Variablen (lastLogTimeRef, logThrottleInterval)

// DEAKTIVIERT: Logging-Funktion
// const throttledLog = (message: string, force: boolean = false) => {
//   const now = Date.now();
//   if (force || now - lastLogTimeRef.current > logThrottleInterval) {
//     console.log(`[useAudioAnalyzer] ${message}`);
//     lastLogTimeRef.current = now;
//   }
// };

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
  
  // Audio-Reaction-Store
  const updateEnergy = useAudioReactionStore((s) => s.updateEnergy);
  const triggerBeat = useAudioReactionStore((s) => s.triggerBeat);
  const setAudioActive = useAudioReactionStore((s) => s.setAudioActive);
  const setFrequencyData = useAudioReactionStore((s) => s.setFrequencyData);
  
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
    // NEU: Optimierte Standard-Optionen für bessere Beat-Erkennung
    const externalOnBeat = options?.onBeat;
    const externalOnEnergy = options?.onEnergy;
    const externalOnFrequency = options?.onFrequency;

    const defaultOptions = {
      analyzeInterval: 16, // target ~60Hz for tighter sync (store may still throttle some fields)
      energyThreshold: 0.015, // Reduziert von 0.03 für empfindlichere Reaktion
      beatSensitivity: 1.2, // Erhöht von 0.8 für bessere Beat-Erkennung
      frequencyInterval: options?.frequencyInterval ?? 16, // default ~60Hz
      ...options,
    };

    const energyThreshold = defaultOptions.energyThreshold ?? 0.02;
    
    // Prüfen, ob bereits ein globaler Analyzer existiert
    if (!globalAnalyzer) {
      // Immer einen neuen Analyzer erstellen
      const analyzerOptions: AudioAnalyzerOptions = {
        onBeat: (time) => {
          setBeatDetected(true);
          triggerBeat(time); // Aktualisiere den globalen Store (performance.now timebase)
          
          // Audio als aktiv markieren
          setAudioActive(true);

          // Zusätzlich: UI/Caller Callback
          externalOnBeat?.(time);
        },
        onEnergy: (e) => {
          setEnergy(e);
          updateEnergy(e); // Aktualisiere den globalen Store
          
          // NEU: Empfindlichere Audio-Aktivierung
          if (e > 0.015) { // Reduziert von 0.03 für empfindlichere Reaktion
            setAudioActive(true);
          }

          // Zusätzlich: UI/Caller Callback
          externalOnEnergy?.(e);
        },
        onFrequency: (frequencies: Uint8Array) => {
          // Already throttled/copied in AudioAnalyzer.
          setFrequencyData(frequencies);

          // Zusätzlich: UI/Caller Callback
          externalOnFrequency?.(frequencies);
        },
        ...defaultOptions
      };
      
      const newAnalyzer = new AudioAnalyzer(analyzerOptions);
      analyzerRef.current = newAnalyzer;
      globalAnalyzer = newAnalyzer; // Aktualisiere den globalen Analyzer
      // throttledLog('Created new audio analyzer', true);
    } else {
      // Verwende den existierenden globalen Analyzer
      analyzerRef.current = globalAnalyzer;
      // Keep global analyzer options in sync (intervals/callbacks/thresholds) with this hook.
      globalAnalyzer.updateOptions({
        ...defaultOptions,
        // Ensure global analyzer always keeps store updates AND forwards to UI callbacks.
        onBeat: (time) => {
          setBeatDetected(true);
          triggerBeat(time);
          setAudioActive(true);
          externalOnBeat?.(time);
        },
        onEnergy: (e) => {
          setEnergy(e);
          updateEnergy(e);
          if (e > 0.015) setAudioActive(true);
          externalOnEnergy?.(e);
        },
        onFrequency: (frequencies: Uint8Array) => {
          setFrequencyData(frequencies);
          externalOnFrequency?.(frequencies);
        },
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
  }, [updateEnergy, triggerBeat, setAudioActive, setFrequencyData, options]);
  
  const initialize = async (audioElement: HTMLAudioElement) => {
    try {
      if (!analyzerRef.current) {
        throw new Error('Analyzer not initialized');
      }
      
      // Vermeide mehrfache Initialisierungsversuche
      if (initializingRef.current || isGlobalInitializing) {
        return;
      }
      
      initializingRef.current = true;
      isGlobalInitializing = true;
      audioElementRef.current = audioElement;
      
      try {
        await analyzerRef.current.initialize(audioElement);
        setIsInitialized(true);
        initializeAttemptedRef.current = true;
        // throttledLog('Audio analyzer initialized successfully', true);
        
        // Audio als aktiv markieren
        setAudioActive(true);
        
        if (options?.autoStart) {
          start();
        }
        
        if (options?.autoDetectBeat) {
          try {
            const result = await guessBeat();
            // throttledLog('Auto beat detection completed', true);
          } catch (err) {
            // DEAKTIVIERT: Logging
            // console.error('Auto beat detection failed:', err);
          }
        }
      } finally {
        initializingRef.current = false;
        isGlobalInitializing = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      // Allow retry on next user gesture (important for mobile Safari).
      initializeAttemptedRef.current = false;
      // DEAKTIVIERT: Logging
      // console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  };
  
  const start = () => {
    if (!analyzerRef.current) {
      // DEAKTIVIERT: Logging
      // console.warn('Cannot start: analyzer not initialized');
      return;
    }
    
    if (isAnalyzing) {
      return;
    }
    
    analyzerRef.current.start();
    setIsAnalyzing(true);
    // throttledLog('Audio analysis started', true);
    
    // Audio als aktiv markieren, wenn Analyse startet
    setAudioActive(true);
  };
  
  const stop = () => {
    if (!analyzerRef.current || !isAnalyzing) {
      return;
    }
    
    analyzerRef.current.stop();
    setIsAnalyzing(false);
    // throttledLog('Audio analysis stopped', true);
  };
  
  const detectTempo = async (): Promise<number> => {
    try {
      if (!analyzerRef.current || !isInitialized) {
        throw new Error('Cannot detect tempo: analyzer not initialized');
      }
      
      const detectedTempo = await analyzerRef.current.detectTempo();
      setTempo(detectedTempo);
      // throttledLog(`Detected tempo: ${detectedTempo} BPM`, true);
      return detectedTempo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      // DEAKTIVIERT: Logging
      // console.error('Tempo detection failed:', error);
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
      // throttledLog(`Guessed beat: ${result.bpm} BPM`, true);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      // DEAKTIVIERT: Logging
      // console.error('Beat guessing failed:', error);
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