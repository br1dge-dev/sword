"use client";

/**
 * MusicPlayer Component
 * 
 * Ein einfacher Musik-Player im Retro-Stil, der zum Design der Anwendung passt.
 * Integriert mit Audio-Analyse für Beat-Erkennung.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioAnalyzer, globalAnalyzer } from '../../hooks/useAudioAnalyzer';
import { AudioAnalyzer } from '../../lib/audio/audioAnalyzer';
import { useAudioReactionStore } from '../../store/audioReactionStore';

interface MusicPlayerProps {
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

export default function MusicPlayer({ className = '', onBeat, onEnergyChange }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showAnalyzerInfo, setShowAnalyzerInfo] = useState(false);
  const [analyzerInitialized, setAnalyzerInitialized] = useState(false);
  const initializationAttemptedRef = useRef<boolean>(false);
  
  // Audio-Analyzer Hook
  const {
    initialize,
    start,
    stop,
    isInitialized,
    isAnalyzing,
    energy,
    beatDetected,
    beatInfo,
    error: analyzerError
  } = useAudioAnalyzer({
    energyThreshold: 0.4,
    analyzeInterval: 200, // 200ms zwischen Analysen (5 FPS) für bessere Performance
    onBeat: () => {
      console.log('Beat callback triggered from analyzer');
      onBeat?.();
    },
    onEnergy: (e) => {
      onEnergyChange?.(e);
    }
  });
  
  // Audio-Reaction-Store
  const setMusicPlaying = useAudioReactionStore(state => state.setMusicPlaying);
  
  // Initialisiere Audio-Analyzer, wenn Audio-Element verfügbar ist
  const initializeAudioAnalyzer = useCallback(async () => {
    if (!audioRef.current || analyzerInitialized || initializationAttemptedRef.current) {
      return;
    }
    
    initializationAttemptedRef.current = true;
    
    try {
      await initialize(audioRef.current);
      setAnalyzerInitialized(true);
      console.log('Audio analyzer initialized with audio element');
      
      // Starte die Analyse nur, wenn das Audio-Element tatsächlich abgespielt wird
      if (isInitialized && !isAnalyzing && isPlaying) {
        start();
        console.log('Auto-starting audio analysis after initialization');
      }
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
      // Wir setzen keinen Fehler mehr, da das die Benutzererfahrung nicht beeinträchtigen soll
      // setError('Analyzer-Fehler');
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
      console.log('Starting audio analysis based on playback status');
    } else if (isInitialized && isAnalyzing && !isPlaying) {
      stop();
      console.log('Stopping audio analysis because playback stopped');
    }
  }, [isInitialized, isAnalyzing, start, stop, isPlaying]);
  
  // Reagiere auf Beat-Erkennung mit visueller Anzeige
  useEffect(() => {
    if (beatDetected) {
      console.log('Beat detected!');
    }
  }, [beatDetected]);
  
  // Aktualisiere den Fortschritt während der Wiedergabe
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e);
      setError("Fehler beim Laden der Audiodatei");
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      console.log('Audio playback ended');
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as EventListener);
    
    // Setze die initiale Lautstärke
    audio.volume = volume;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);
    };
  }, []);
  
  // Aktiviere den AudioContext bei Benutzerinteraktion
  const resumeAudioContext = useCallback(async () => {
    if (globalAnalyzer && globalAnalyzer.getAudioContext) {
      const audioContext = globalAnalyzer.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        console.log('Resuming AudioContext from user interaction');
        try {
          await audioContext.resume();
          console.log('AudioContext resumed successfully:', audioContext.state);
          
          // Starte die Audio-Analyse explizit nach der Aktivierung des AudioContext
          if (!isAnalyzing && isPlaying) {
            start();
            console.log('Explicitly starting audio analysis after user interaction');
          }
          
          // Setze Audio als aktiv im Store
          const { setAudioActive } = useAudioReactionStore.getState();
          setAudioActive(true);
          
          return true;
        } catch (err) {
          console.error('Failed to resume AudioContext:', err);
          return false;
        }
      } else {
        console.log('AudioContext is already running or not available');
        return true;
      }
    }
    return false;
  }, [isInitialized, isAnalyzing, isPlaying, start]);
  
  // Play/Pause-Funktion
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    try {
      // Aktiviere den AudioContext bei jeder Benutzerinteraktion
      await resumeAudioContext();
      
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setMusicPlaying(false);
      } else {
        // Erhöhe die Lautstärke, um sicherzustellen, dass Audio hörbar ist
        audio.volume = Math.max(0.5, audio.volume);
        
        // Stelle sicher, dass der Analyzer initialisiert ist
        if (!analyzerInitialized) {
          await initializeAudioAnalyzer();
        }
        
        // Versuche zu spielen und fange Fehler ab
        await audio.play();
        setError(null);
        setIsPlaying(true);
        setMusicPlaying(true);
        console.log('Audio playback started successfully');
        
        // Starte die Analyse, wenn sie nicht bereits läuft
        if (isInitialized && !isAnalyzing) {
          start();
        }
        
        // Setze Audio als aktiv im Store
        const { setAudioActive } = useAudioReactionStore.getState();
        setAudioActive(true);
      }
    } catch (err) {
      console.error("Fehler beim Abspielen:", err);
      setError("Wiedergabe nicht möglich");
      setIsPlaying(false);
    }
  };
  
  // Zum nächsten Track wechseln
  const nextTrack = async () => {
    const wasPlaying = isPlaying;
    
    // Pausiere den aktuellen Track, falls er abgespielt wird
    if (wasPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setMusicPlaying(false);
    }
    
    // Wechsle zum nächsten Track (oder zurück zum ersten)
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
    
    // Setze den Fortschritt zurück
    setProgress(0);
    
    // Spiele den neuen Track ab, wenn der vorherige abgespielt wurde
    if (wasPlaying && audioRef.current) {
      try {
        // Kurze Verzögerung, um sicherzustellen, dass der neue Track geladen ist
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Aktiviere den AudioContext bei jedem Trackwechsel
        await resumeAudioContext();
        
        await audioRef.current.play();
        setIsPlaying(true);
        setMusicPlaying(true);
        setError(null);
        
        // Stelle sicher, dass die Analyse läuft
        if (isInitialized && !isAnalyzing) {
          start();
        }
      } catch (err) {
        console.error("Fehler beim Abspielen:", err);
        setError("Wiedergabe nicht möglich");
      }
    }
  };
  
  // Lautstärke ändern
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };
  
  // Fortschritt ändern (Scrubbing)
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };
  
  // Fortschrittsbalken-Tiles generieren
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = tileProgress <= progress;
      const isBeatActive = beatDetected && isActive;
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${isActive ? 'bg-[#3EE6FF]' : 'bg-gray-800'} border-r border-gray-900 last:border-r-0 transition-all duration-100`}
          style={{
            boxShadow: isBeatActive 
              ? 'inset 0 0 8px rgba(62,230,255,1)' 
              : isActive 
                ? 'inset 0 0 3px rgba(62,230,255,0.8)' 
                : 'none',
            transform: isBeatActive ? 'scaleY(1.1)' : 'scaleY(1)'
          }}
        />
      );
    }
    
    return tiles;
  };

  // Aktueller Track
  const currentTrack = tracks[currentTrackIndex];

  // Effekt für Laden des Tracks
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.load();
      
      // Wenn vorher abgespielt wurde, auch den neuen Track abspielen
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing new track:', error);
          setError('Neuer Track konnte nicht abgespielt werden.');
          setIsPlaying(false);
          setMusicPlaying(false);
        });
      }
    }
  }, [currentTrackIndex, currentTrack.src]);

  return (
    <div className={`flex flex-col ${className}`}>
      <audio 
        ref={audioRef} 
        src={currentTrack.src}
        preload="metadata"
        onCanPlayThrough={() => setError(null)}
      />
      
      <div className="flex flex-col w-full">
        <div className="mb-1 text-xs font-bold font-press-start-2p text-[#3EE6FF] flex justify-between items-center" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          <div>{currentTrack.name}</div>
          {!isPlaying && !isAnalyzing && (
            <div className="text-[#FF3EC8] text-[8px] animate-pulse">
              KLICK PLAY FÜR AUDIO SYNC
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex"
               style={{ 
                 boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
                 imageRendering: 'pixelated'
               }}>
            {renderProgressTiles()}
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress} 
              onChange={handleProgressChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label="Fortschritt"
            />
          </div>
          
          <button
            onClick={togglePlay}
            className="w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-800 hover:border-[#3EE6FF]"
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(62,230,255,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            <div className="relative w-3 h-3">
              {isPlaying ? (
                <>
                  <div className="absolute top-0 left-0 w-1 h-3 bg-[#3EE6FF]"></div>
                  <div className="absolute top-0 left-2 w-1 h-3 bg-[#3EE6FF]"></div>
                </>
              ) : (
                <>
                  <div className="absolute top-0 left-0 w-2 h-3 bg-[#3EE6FF] clip-triangle"></div>
                </>
              )}
              
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)'
                   }}>
              </div>
            </div>
          </button>
          
          <button
            onClick={nextTrack}
            className="w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-800 hover:border-[#3EE6FF]"
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(62,230,255,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            <div className="relative w-3 h-3">
              <div className="absolute top-0 left-0 w-1 h-3 bg-[#3EE6FF] clip-triangle"></div>
              <div className="absolute top-0 left-2 w-1 h-3 bg-[#3EE6FF] clip-triangle"></div>
              <div className="absolute top-0 left-3 w-[2px] h-3 bg-[#3EE6FF]"></div>
              
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)'
                   }}>
              </div>
            </div>
          </button>
        </div>
        
        {error && (
          <div className="mt-1 text-[10px] opacity-80 font-mono text-[#FF3EC8]">
            {error}
          </div>
        )}
        
        {showAnalyzerInfo && (
          <div className="mt-2 text-[8px] font-mono text-gray-400 border border-gray-800 p-1 w-full">
            <div>Energy: {energy.toFixed(3)}</div>
            {beatInfo && (
              <>
                <div>BPM: {beatInfo.bpm}</div>
                <div>Offset: {beatInfo.offset.toFixed(2)}s</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 