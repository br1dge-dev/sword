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
let globalAnalyzer: AudioAnalyzer | null = null;
// Flag, um zu verfolgen, ob wir bereits eine Meldung über die Verwendung des globalen Analyzers ausgegeben haben
let globalAnalyzerLoggedOnce = false;

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
      analyzeInterval: 100, // 100ms zwischen Analysen (10 FPS)
      energyThreshold: 0.25, // Niedrigerer Schwellenwert für bessere Beat-Erkennung
      ...options
    };
    
    // Verwende den globalen Analyzer, wenn er existiert
    if (globalAnalyzer) {
      analyzerRef.current = globalAnalyzer;
      
      // Log nur einmal pro Komponente
      if (!globalAnalyzerLoggedOnce) {
        console.log('Using existing global audio analyzer');
        globalAnalyzerLoggedOnce = true;
      }
    } else {
      const analyzerOptions: AudioAnalyzerOptions = {
        onBeat: (time) => {
          console.log(`Beat detected at time: ${time}`);
          setBeatDetected(true);
          triggerBeat(); // Aktualisiere den globalen Store
        },
        onEnergy: (e) => {
          setEnergy(e);
          updateEnergy(e); // Aktualisiere den globalen Store
          
          // Wenn Energie über 0.1 liegt, setzen wir Audio als aktiv
          if (e > 0.1) {
            setAudioActive(true);
          }
          
          // Wenn Energie über dem Schwellenwert liegt, könnte es ein Beat sein
          if (e > (analyzerOptions.energyThreshold || 0.25)) {
            const now = Date.now();
            const timeSinceLastBeat = now - (analyzerRef.current?.getLastBeatTime() || 0);
            
            // Mindestens 200ms zwischen Beats
            if (timeSinceLastBeat > 200) {
              console.log(`Energy-based beat detected: ${e.toFixed(2)}`);
              setBeatDetected(true);
              triggerBeat();
            }
          }
        },
        ...defaultOptions
      };
      
      globalAnalyzer = new AudioAnalyzer(analyzerOptions);
      analyzerRef.current = globalAnalyzer;
      console.log('Created new global audio analyzer');
    }
    
    return () => {
      // Wir räumen den globalen Analyzer nicht auf, da er von anderen Komponenten verwendet werden könnte
      analyzerRef.current = null;
    };
  }, [updateEnergy, triggerBeat, setAudioActive, options]);
  
  const initialize = async (audioElement: HTMLAudioElement) => {
    try {
      if (!analyzerRef.current) {
        throw new Error('Analyzer not initialized');
      }
      
      // Vermeide mehrfache Initialisierungsversuche
      if (initializeAttemptedRef.current) {
        console.log('Initialize already attempted, skipping');
        return;
      }
      
      initializeAttemptedRef.current = true;
      audioElementRef.current = audioElement;
      
      await analyzerRef.current.initialize(audioElement);
      setIsInitialized(true);
      console.log('Audio analyzer initialized successfully');
      
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  };
  
  const start = () => {
    if (!analyzerRef.current || !isInitialized) {
      console.warn('Cannot start: analyzer not initialized');
      return;
    }
    
    analyzerRef.current.start();
    setIsAnalyzing(true);
    console.log('Audio analysis started');
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
      setTempo(result.bpm);
      console.log('Beat guessing result:', result);
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