"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioAnalyzer, globalAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useAudioReactionStore } from '../../store/audioReactionStore';

interface AudioControlPanelProps {
  className?: string;
  onBeat?: () => void;
  onEnergyChange?: (energy: number) => void;
}

// Verfügbare Tracks
const tracks = [
  { src: "/music/gr1ftsword.mp3", name: "GR1FTSWORD" },
  { src: "/music/flashword.mp3", name: "FLASHWORD" },
  { src: "/music/funksword.mp3", name: "FUNKSWORD" },
  { src: "/music/atarisword.mp3", name: "ATARISWORD" },
  { src: "/music/DR4GONSWORD.mp3", name: "DR4GONSWORD" },
  { src: "/music/PUNCHSWORD.mp3", name: "PUNCHSWORD" },
  { src: "/music/NIGHTSWORD.mp3", name: "NIGHTSWORD" }
];

// Pseudo-zufällige Reihenfolge für Highlight-Position und Farbe
const highlightPattern = [
  { idx: 0, color: '#3EE6FF' }, // Cyan
  { idx: 2, color: '#FF3EC8' }, // Pink
  { idx: 1, color: '#F8E16C' }, // Gelb
  { idx: 4, color: '#00FCA6' }, // Grün
  { idx: 3, color: '#3EE6FF' },
  { idx: 5, color: '#FF3EC8' },
  { idx: 6, color: '#F8E16C' },
  { idx: 0, color: '#00FCA6' },
  { idx: 2, color: '#3EE6FF' },
  { idx: 1, color: '#FF3EC8' },
];

export default function AudioControlPanel({ className = '', onBeat, onEnergyChange }: AudioControlPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [analyzerInitialized, setAnalyzerInitialized] = useState(false);
  const [visualBeatActive, setVisualBeatActive] = useState(false);
  const [lastEnergy, setLastEnergy] = useState(0);
  
  const initializationAttemptedRef = useRef<boolean>(false);
  const lastLogTimeRef = useRef<number>(0);
  const logThrottleInterval = 1000;

  const throttledLog = (message: string, force: boolean = false) => {
    const now = Date.now();
    if (force || now - lastLogTimeRef.current > logThrottleInterval) {
      console.log(`[AudioControlPanel] ${message}`);
      lastLogTimeRef.current = now;
    }
  };
  
  // Audio-Reaction-Store
  const { setMusicPlaying, setAudioActive, energy, beatDetected, isIdleActive, swordColor } = useAudioReactionStore(state => ({
    setMusicPlaying: state.setMusicPlaying,
    setAudioActive: state.setAudioActive,
    energy: state.energy,
    beatDetected: state.beatDetected,
    isIdleActive: state.isIdleActive(),
    swordColor: state.swordColor
  }));
  
  // Audio-Analyzer Hook
  const {
    initialize,
    start,
    stop,
    isInitialized,
    isAnalyzing
  } = useAudioAnalyzer({
    energyThreshold: 0.03,
    analyzeInterval: 50,
    onBeat: () => {
      onBeat?.();
      setVisualBeatActive(true);
      setTimeout(() => setVisualBeatActive(false), 150);
    },
    onEnergy: (e) => {
      onEnergyChange?.(e);
      setLastEnergy(e);
    }
  });

  // Initialisiere Audio-Analyzer
  const initializeAudioAnalyzer = useCallback(async () => {
    if (!audioRef.current || analyzerInitialized || initializationAttemptedRef.current) {
      return;
    }
    
    initializationAttemptedRef.current = true;
    
    try {
      await initialize(audioRef.current);
      setAnalyzerInitialized(true);
      throttledLog('Audio analyzer initialized', true);
      
      if (isInitialized && !isAnalyzing && isPlaying) {
        start();
        throttledLog('Auto-starting audio analysis', true);
      }
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
    }
  }, [audioRef.current, initialize, isInitialized, isAnalyzing, start, isPlaying, analyzerInitialized]);
  
  useEffect(() => {
    if (audioRef.current && !analyzerInitialized) {
      initializeAudioAnalyzer();
    }
  }, [audioRef.current, analyzerInitialized, initializeAudioAnalyzer]);
  
  // Starte/Stoppe Analyzer basierend auf Wiedergabestatus
  useEffect(() => {
    if (isInitialized && !isAnalyzing && isPlaying) {
      start();
      throttledLog('Starting audio analysis', true);
    } else if (isInitialized && isAnalyzing && !isPlaying) {
      stop();
      throttledLog('Stopping audio analysis', true);
    }
  }, [isInitialized, isAnalyzing, start, stop, isPlaying]);
  
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
  
  // AudioContext aktivieren
  const resumeAudioContext = useCallback(async () => {
    if (globalAnalyzer && globalAnalyzer.getAudioContext) {
      const audioContext = globalAnalyzer.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        throttledLog('Resuming AudioContext', true);
        try {
          await audioContext.resume();
          
          if (!isAnalyzing && isPlaying) {
            start();
            throttledLog('Explicitly starting audio analysis', true);
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
  }, [isInitialized, isAnalyzing, isPlaying, start]);
  
  // Wiedergabe starten/pausieren
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      await resumeAudioContext();
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        if (isAnalyzing) {
          stop();
          throttledLog("Stopping audio analysis", true);
        }
        
        setMusicPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        
        if (isInitialized && !isAnalyzing) {
          start();
          throttledLog("Starting audio analysis", true);
        }
        
        setMusicPlaying(true);
        throttledLog("Music playback started", true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  // Nächsten Track
  const nextTrack = async (autoplay = false) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      setCurrentTrackIndex(nextIndex);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (audioRef.current) {
        audioRef.current.src = tracks[nextIndex].src;
        audioRef.current.volume = 0.5;
        
        if (isPlaying || autoplay) {
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error switching track:', err);
    }
  };

  // Vorherigen Track
  const prevTrack = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (audioRef.current) {
        audioRef.current.src = tracks[prevIndex].src;
        audioRef.current.volume = 0.5;
        
        if (isPlaying) {
          audioRef.current.play();
        }
      }
    } catch (err) {
      console.error('Error switching track:', err);
    }
  };

  // Highlight-Animation im 2s-Takt
  const [highlightStep, setHighlightStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightStep((prev) => (prev + 1) % highlightPattern.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fortschritt ändern
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  // Visualisierungs-Balken berechnen
  const activeBars = Math.max(1, Math.floor(Math.min(1, lastEnergy * 1.8) * 8));

  return (
    <div className={`flex flex-col ${className}`} style={{ width: '100%', maxWidth: '280px' }}>
      {/* Audio-Element */}
      <audio
        ref={audioRef}
        src={tracks[currentTrackIndex].src}
        preload="metadata"
        className="hidden"
      />
      
      {/* Header mit Titel */}
      <div className="flex flex-col mb-3">
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#3EE6FF]" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          AUDIO
        </div>
        
        {/* Audio Visualizer */}
        <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex"
             style={{ 
               boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          {isIdleActive ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs font-press-start-2p text-[#3EE6FF]">IDLE</span>
            </div>
          ) : (
            Array.from({ length: 10 }).map((_, index) => {
              const isActive = index < Math.floor(activeBars * 1.25); // Anpassung für 10 Tiles
              const tileColor = isActive ? 
                (lastEnergy > 0.7 ? 'bg-[#FF3EC8]' : lastEnergy > 0.4 ? 'bg-[#F8E16C]' : 'bg-[#3EE6FF]') : 
                'bg-gray-800';
              
              return (
                <div
                  key={index}
                  className={`h-full w-[10%] ${tileColor} border-r border-gray-900 last:border-r-0 transition-all duration-150`}
                  style={{
                    transform: visualBeatActive && isActive ? 'scaleY(1.2)' : 'scaleY(1)',
                    boxShadow: isActive ? 
                      (lastEnergy > 0.7 ? 'inset 0 0 3px rgba(255,62,200,0.8)' : 
                       lastEnergy > 0.4 ? 'inset 0 0 3px rgba(248,225,108,0.8)' : 
                       'inset 0 0 3px rgba(62,230,255,0.8)') : 
                      'none'
                  }}
                />
              );
            })
          )}
        </div>
      </div>
      
      {/* Track Info */}
      <div className="mb-3">
        <div className="text-xs font-bold font-press-start-2p text-left track-label-style">
          {tracks[currentTrackIndex].name.split("").map((char, i) => {
            const { idx, color } = highlightPattern[highlightStep];
            return (
              <span
                key={i}
                style={i === idx ? { color, textShadow: `0 0 2px ${color}` } : { color: swordColor, textShadow: `0 0 1px ${swordColor}` }}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden"
             style={{ 
               boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          <div 
            className="h-full bg-gradient-to-r from-[#3EE6FF] to-[#00FCA6] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-press-start-2p text-[#F8E16C]" style={{textShadow: '0 0 1px #F8E16C', letterSpacing: '0.05em'}}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => prevTrack()}
          className="w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-800 hover:border-[#3EE6FF] transition-colors"
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(62,230,255,0.3)',
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px'
          }}
        >
          <span className="text-xs text-[#3EE6FF]">◀</span>
        </button>
        
        <button
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center border border-[#3EE6FF] bg-[#3EE6FF] hover:border-[#2DD5E5] hover:bg-[#2DD5E5] transition-colors"
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3), 0 0 5px rgba(62,230,255,0.5)',
            imageRendering: 'pixelated'
          }}
        >
          <span className="text-sm text-black font-bold font-press-start-2p">
            {isPlaying ? '⏸' : '▶'}
          </span>
        </button>
        
        <button
          onClick={() => nextTrack()}
          className="w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-800 hover:border-[#3EE6FF] transition-colors"
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(62,230,255,0.3)',
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px'
          }}
        >
          <span className="text-xs text-[#3EE6FF]">▶</span>
        </button>
      </div>
      
      {/* Energy Display entfernt */}
      <style jsx>{`
        .track-label-style {
          text-shadow: 0 0 1px #3EE6FF;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
} 