/**
 * VERALTET: Diese Datei wird durch den AudioProvider ersetzt.
 * 
 * useAudioAnalyzer - Hook für Audio-Analyse
 * 
 * Dieser Hook wird aus Kompatibilitätsgründen beibehalten, sollte aber nicht mehr verwendet werden.
 * Bitte verwende stattdessen den AudioProvider aus src/lib/audio/AudioProvider.tsx.
 */

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

// Flag, um zu verfolgen, ob eine Initialisierung im Gange ist
let isGlobalInitializing = false;

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
    // NEU: Optimierte Standard-Optionen für bessere Beat-Erkennung
    const defaultOptions = {
      analyzeInterval: 50, // 50ms für schnelle Reaktion
      energyThreshold: 0.015, // Reduziert von 0.03 für empfindlichere Reaktion
      beatSensitivity: 1.2, // Erhöht von 0.8 für bessere Beat-Erkennung
      ...options
    };
    
    // Immer einen neuen Analyzer erstellen
    const analyzerOptions: AudioAnalyzerOptions = {
      onBeat: (time) => {
        setBeatDetected(true);
        triggerBeat(); // Aktualisiere den globalen Store
        
        // Audio als aktiv markieren
        setAudioActive(true);
      },
      onEnergy: (e) => {
        setEnergy(e);
        updateEnergy(e); // Aktualisiere den globalen Store
        
        // NEU: Empfindlichere Audio-Aktivierung
        if (e > 0.015) { // Reduziert von 0.03 für empfindlichere Reaktion
          setAudioActive(true);
        }
        
        // NEU: Verbesserte Beat-Erkennung mit niedrigeren Schwellenwerten
        if (e > (analyzerOptions.energyThreshold || 0.02)) { // Reduziert von 0.05 für empfindlichere Reaktion
          const now = Date.now();
          const timeSinceLastBeat = now - (analyzerRef.current?.getLastBeatTime() || 0);
          
          // Mindestens 80ms zwischen Beats (reduziert von 100ms für schnellere Beats)
          if (timeSinceLastBeat > 80) {
            setBeatDetected(true);
            triggerBeat();
          }
        }
      },
      ...defaultOptions
    };
    
    const newAnalyzer = new AudioAnalyzer(analyzerOptions);
    analyzerRef.current = newAnalyzer;
    
    return () => {
      if (analyzerRef.current) {
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
        return;
      }
      
      initializeAttemptedRef.current = true;
      initializingRef.current = true;
      isGlobalInitializing = true;
      audioElementRef.current = audioElement;
      
      try {
        await analyzerRef.current.initialize(audioElement);
        setIsInitialized(true);
        
        // Audio als aktiv markieren
        setAudioActive(true);
        
        if (options?.autoStart) {
          start();
        }
        
        if (options?.autoDetectBeat) {
          try {
            await guessBeat();
          } catch (err) {
            // Fehler ignorieren
          }
        }
      } finally {
        initializingRef.current = false;
        isGlobalInitializing = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  };
  
  const start = () => {
    if (!analyzerRef.current) {
      return;
    }
    
    if (isAnalyzing) {
      return;
    }
    
    analyzerRef.current.start();
    setIsAnalyzing(true);
    
    // Audio als aktiv markieren, wenn Analyse startet
    setAudioActive(true);
  };
  
  const stop = () => {
    if (!analyzerRef.current || !isAnalyzing) {
      return;
    }
    
    analyzerRef.current.stop();
    setIsAnalyzing(false);
  };
  
  const detectTempo = async (): Promise<number> => {
    try {
      if (!analyzerRef.current || !isInitialized) {
        throw new Error('Cannot detect tempo: analyzer not initialized');
      }
      
      const detectedTempo = await analyzerRef.current.detectTempo();
      setTempo(detectedTempo);
      return detectedTempo;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
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
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
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