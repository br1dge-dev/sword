'use client';

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { AudioAnalyzer, AudioAnalyzerOptions } from './audioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';

// Verfügbare Tracks
export const tracks = [
  { src: "/music/gr1ftsword.mp3", name: "GR1FTSWORD" },
  { src: "/music/flashword.mp3", name: "FLASHWORD" },
  { src: "/music/funksword.mp3", name: "FUNKSWORD" },
  { src: "/music/atarisword.mp3", name: "ATARISWORD" },
  { src: "/music/DR4GONSWORD.mp3", name: "DR4GONSWORD" },
  { src: "/music/PUNCHSWORD.mp3", name: "PUNCHSWORD" },
  { src: "/music/NIGHTSWORD.mp3", name: "NIGHTSWORD" },
  { src: "/music/DANGERSWORD.mp3", name: "DANGERSWORD" },
  { src: "/music/SHONENSWORD.mp3", name: "SHONENSWORD" },
  { src: "/music/WORFSWORD.mp3", name: "WORFSWORD" }
];

interface AudioContextType {
  // Audio-Element
  audioRef: React.RefObject<HTMLAudioElement>;
  
  // Wiedergabe-Status
  isPlaying: boolean;
  currentTrackIndex: number;
  progress: number;
  
  // Analyzer-Status
  isInitialized: boolean;
  isAnalyzing: boolean;
  energy: number;
  beatDetected: boolean;
  
  // Steuerungsmethoden
  togglePlay: () => Promise<void>;
  nextTrack: (autoPlay?: boolean) => void;
  prevTrack: () => void;
  
  // Analyzer-Methoden
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  // Audio-Element Referenz
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Wiedergabe-Status
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Analyzer-Status
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [beatDetected, setBeatDetected] = useState(false);
  
  // Analyzer-Referenz
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const initializationAttemptedRef = useRef<boolean>(false);
  
  // Audio-Reaction-Store
  const { 
    updateEnergy, 
    triggerBeat, 
    setMusicPlaying, 
    setAudioActive 
  } = useAudioReactionStore();
  
  // Audio-Element Event Handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleEnded = () => {
      nextTrack(true);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.volume = 0.5; // Feste Lautstärke
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
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
    if (analyzerRef.current) return;
    
    // Optimierte Standard-Optionen für bessere Beat-Erkennung
    const analyzerOptions: AudioAnalyzerOptions = {
      analyzeInterval: 50, // 50ms für schnelle Reaktion
      energyThreshold: 0.015, // Empfindlichere Reaktion
      beatSensitivity: 1.2, // Bessere Beat-Erkennung
      onBeat: (time) => {
        setBeatDetected(true);
        triggerBeat(); // Aktualisiere den globalen Store
        setAudioActive(true);
      },
      onEnergy: (e) => {
        setEnergy(e);
        updateEnergy(e); // Aktualisiere den globalen Store
        
        // Empfindlichere Audio-Aktivierung
        if (e > 0.015) {
          setAudioActive(true);
        }
      }
    };
    
    // Erstelle einen neuen Analyzer
    const newAnalyzer = new AudioAnalyzer(analyzerOptions);
    analyzerRef.current = newAnalyzer;
    
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
    };
  }, [updateEnergy, triggerBeat, setAudioActive]);
  
  // AudioContext aktivieren
  const resumeAudioContext = async (): Promise<boolean> => {
    if (analyzerRef.current && analyzerRef.current.getAudioContext) {
      const audioContext = analyzerRef.current.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          
          if (!isAnalyzing && isPlaying) {
            start();
          }
          
          setAudioActive(true);
          return true;
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
          return false;
        }
      } else {
        return true;
      }
    }
    return false;
  };
  
  // Initialisiere Audio-Analyzer
  const initialize = async (): Promise<void> => {
    if (!audioRef.current || isInitialized || initializationAttemptedRef.current) {
      return;
    }
    
    initializationAttemptedRef.current = true;
    
    try {
      if (!analyzerRef.current) {
        throw new Error('Analyzer not initialized');
      }
      
      await analyzerRef.current.initialize(audioRef.current);
      setIsInitialized(true);
      setAudioActive(true);
      
      if (isPlaying) {
        start();
      }
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
    }
  };
  
  // Starte Audio-Analyse
  const start = (): void => {
    if (!analyzerRef.current || !isInitialized) {
      return;
    }
    
    if (isAnalyzing) {
      return;
    }
    
    analyzerRef.current.start();
    setIsAnalyzing(true);
    setAudioActive(true);
  };
  
  // Stoppe Audio-Analyse
  const stop = (): void => {
    if (!analyzerRef.current || !isAnalyzing) {
      return;
    }
    
    analyzerRef.current.stop();
    setIsAnalyzing(false);
  };
  
  // Wiedergabe starten/pausieren
  const togglePlay = async (): Promise<void> => {
    if (!audioRef.current) return;
    
    try {
      await resumeAudioContext();
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        if (isAnalyzing) {
          stop();
        }
        
        setMusicPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        
        if (isInitialized && !isAnalyzing) {
          start();
        } else if (!isInitialized) {
          await initialize();
        }
        
        setMusicPlaying(true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };
  
  // Nächster Track
  const nextTrack = (autoPlay = false): void => {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(newIndex);
    
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Failed to auto-play next track:', err);
      });
    }
  };
  
  // Vorheriger Track
  const prevTrack = (): void => {
    const newIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(newIndex);
  };
  
  // Initialisiere Analyzer, wenn Audio-Element verfügbar ist
  useEffect(() => {
    if (audioRef.current && !isInitialized && !initializationAttemptedRef.current) {
      initialize();
    }
  }, [audioRef.current, isInitialized]);
  
  // Starte/Stoppe Analyzer basierend auf Wiedergabestatus
  useEffect(() => {
    if (isInitialized && !isAnalyzing && isPlaying) {
      start();
    } else if (isInitialized && isAnalyzing && !isPlaying) {
      stop();
    }
  }, [isInitialized, isAnalyzing, isPlaying]);
  
  const value = {
    audioRef,
    isPlaying,
    currentTrackIndex,
    progress,
    isInitialized,
    isAnalyzing,
    energy,
    beatDetected,
    togglePlay,
    nextTrack,
    prevTrack,
    initialize,
    start,
    stop
  };
  
  return (
    <AudioContext.Provider value={value}>
      <audio
        ref={audioRef}
        src={tracks[currentTrackIndex].src}
        preload="metadata"
        className="hidden"
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
} 