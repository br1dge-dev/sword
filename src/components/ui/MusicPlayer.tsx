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
  
  // Audio-Reaction-Store
  const { setMusicPlaying, setAudioActive } = useAudioReactionStore(state => ({
    setMusicPlaying: state.setMusicPlaying,
    setAudioActive: state.setAudioActive
  }));
  
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
    energyThreshold: 0.03, // Reduziert von 0.4 auf 0.03 für empfindlichere Beat-Erkennung
    analyzeInterval: 50, // Reduziert von 200ms auf 50ms für schnellere Reaktionen
    onBeat: () => {
      console.log('Beat callback triggered from analyzer');
      onBeat?.();
    },
    onEnergy: (e) => {
      onEnergyChange?.(e);
    }
  });

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
      console.log('Audio playback ended - starting next track');
      // Automatisch zum nächsten Track wechseln (Endlosschleife)
      nextTrack();
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
  
  // Wiedergabe starten/pausieren
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      // Aktiviere den AudioContext bei jeder Benutzerinteraktion
      await resumeAudioContext();
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        // Setze Musik als nicht spielend und aktiviere Idle
        setMusicPlaying(false);
        
        // Stoppe die Audio-Analyse
        if (isAnalyzing) {
          stop();
          console.log("Stopping audio analysis because playback stopped");
        }
      } else {
        // Erhöhe die Lautstärke, um sicherzustellen, dass Audio hörbar ist
        audioRef.current.volume = Math.max(0.5, audioRef.current.volume);
        
        // Spiele den Track ab
        await audioRef.current.play();
        setIsPlaying(true);
        
        // Setze Musik als spielend und deaktiviere Idle
        setMusicPlaying(true);
        
        // Starte die Audio-Analyse
        if (!isAnalyzing) {
          start();
          console.log("Music playback started, idle should deactivate");
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError('Fehler beim Abspielen der Musik.');
      setIsPlaying(false);
      
      // Bei Fehler Idle aktivieren
      setMusicPlaying(false);
    }
  };

  // Zum nächsten Track wechseln
  const nextTrack = async () => {
    const wasPlaying = isPlaying;
    
    // Pausiere den aktuellen Track, falls er abgespielt wird
    if (wasPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      // OPTIMIERT: Nicht sofort setMusicPlaying(false) setzen, um Idle-Konflikte zu vermeiden
      // setMusicPlaying(false);
    }
    
    // NEU: Reset der Track-Analyse für adaptive Sensitivität
    if (globalAnalyzer && globalAnalyzer.resetTrackAnalysis) {
      globalAnalyzer.resetTrackAnalysis();
      console.log('Track analysis reset for new track');
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
        // Bei Fehler setze Musik als nicht spielend
        setMusicPlaying(false);
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

  // OPTIMIERT: Effekt für bessere Audio-Analyzer-Koordination beim Track-Wechsel
  useEffect(() => {
    if (audioRef.current && isPlaying && isInitialized) {
      // Kurze Verzögerung, um sicherzustellen, dass der neue Track geladen ist
      const timer = setTimeout(() => {
        if (isPlaying && !isAnalyzing) {
          start();
          console.log('Starting audio analysis after track change');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [currentTrackIndex, isPlaying, isInitialized, isAnalyzing, start]);

  return (
    <div className={`flex flex-col ${className}`}>
      <audio 
        ref={audioRef} 
        src={currentTrack.src}
        preload="metadata"
        onCanPlayThrough={() => setError(null)}
      />
      
      <div className="flex flex-col w-full">
        {/* Track-Name und Audio-Sync-Hinweis */}
        <div className="mb-1 text-xs font-bold text-[#3EE6FF] flex justify-between items-center w-full" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em',
               fontFamily: 'var(--font-press-start-2p)'
             }}
        >
          <div className="truncate mr-2">{currentTrack.name}</div>
          {!isPlaying && !isAnalyzing && (
            <div className="text-[#FF3EC8] text-[8px] whitespace-nowrap">PRESS PLAY</div>
          )}
        </div>
        
        {/* Fortschrittsbalken */}
        <div 
          className="h-1.5 bg-gray-800 mb-2 relative overflow-hidden"
          style={{ 
            width: '100%',
            maxWidth: '200px',
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5)'
          }}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-[#3EE6FF]"
            style={{ 
              width: `${progress}%`,
              boxShadow: '0 0 8px rgba(62,230,255,0.6)'
            }}
          />
          {renderProgressTiles()}
        </div>
        
        {/* Steuerelemente */}
        <div className="flex justify-between items-center">
          {/* Play/Pause und Next-Buttons */}
          <div className="flex space-x-2">
            <button 
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 hover:bg-gray-800 focus:outline-none"
              style={{ boxShadow: '0 0 5px rgba(0,0,0,0.3)' }}
            >
              {isPlaying ? (
                <span className="text-[#3EE6FF]">||</span>
              ) : (
                <span className="text-[#3EE6FF]">▶</span>
              )}
            </button>
            
            <button 
              onClick={nextTrack}
              className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 hover:bg-gray-800 focus:outline-none"
              style={{ boxShadow: '0 0 5px rgba(0,0,0,0.3)' }}
            >
              <span className="text-[#3EE6FF]">≫</span>
            </button>
          </div>
          
          {/* Fehleranzeige */}
          {error && (
            <div className="text-red-500 text-xs ml-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 