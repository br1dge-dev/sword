"use client";

/**
 * MusicPlayer Component
 * 
 * Ein einfacher Musik-Player im Retro-Stil, der zum Design der Anwendung passt.
 * Integriert mit Audio-Analyse für Beat-Erkennung.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';

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
  { src: "/music/atarisword.mp3", name: "ATARISWORD" }
];

export default function MusicPlayer({ className = '', onBeat, onEnergyChange }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [tempo, setTempo] = useState<number | null>(null);
  const [showAnalyzerInfo, setShowAnalyzerInfo] = useState(false);
  const [analyzerInitialized, setAnalyzerInitialized] = useState(false);
  
  // Audio-Analyzer Hook
  const {
    initialize,
    start,
    stop,
    detectTempo,
    guessBeat,
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
  
  // Initialisiere Audio-Analyzer, wenn Audio-Element verfügbar ist
  useEffect(() => {
    // Nur einmal initialisieren
    if (audioRef.current && !analyzerInitialized) {
      setAnalyzerInitialized(true);
      
      initialize(audioRef.current)
        .then(() => {
          console.log('Audio analyzer initialized with audio element');
        })
        .catch(err => {
          console.error('Failed to initialize audio analyzer:', err);
          // Wir setzen keinen Fehler mehr, da das die Benutzererfahrung nicht beeinträchtigen soll
          // setError('Analyzer-Fehler');
        });
    }
  }, [audioRef.current, initialize, analyzerInitialized]);
  
  // Starte/Stoppe Analyzer basierend auf Wiedergabestatus
  useEffect(() => {
    if (isInitialized) {
      if (isPlaying && !isAnalyzing) {
        start();
        console.log('Starting audio analysis');
      } else if (!isPlaying && isAnalyzing) {
        stop();
        console.log('Stopping audio analysis');
      }
    }
  }, [isPlaying, isInitialized, isAnalyzing, start, stop]);
  
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
    
    const handleError = () => {
      setError("Fehler beim Laden der Audiodatei");
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('error', handleError);
    
    // Setze die initiale Lautstärke
    audio.volume = volume;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', () => setIsPlaying(false));
      audio.removeEventListener('error', handleError);
    };
  }, []);
  
  // Play/Pause-Funktion
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      // Versuche zu spielen und fange Fehler ab
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setError(null);
          })
          .catch(err => {
            console.error("Fehler beim Abspielen:", err);
            setError("Wiedergabe nicht möglich");
            setIsPlaying(false);
          });
      }
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Zum nächsten Track wechseln
  const nextTrack = () => {
    const wasPlaying = isPlaying;
    
    // Pausiere den aktuellen Track, falls er abgespielt wird
    if (wasPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    // Wechsle zum nächsten Track (oder zurück zum ersten)
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
    
    // Setze den Fortschritt zurück
    setProgress(0);
    setTempo(null);
    
    // Spiele den neuen Track ab, wenn der vorherige abgespielt wurde
    setTimeout(() => {
      if (wasPlaying && audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setError(null);
            })
            .catch(err => {
              console.error("Fehler beim Abspielen:", err);
              setError("Wiedergabe nicht möglich");
            });
        }
      }
    }, 100);
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
  
  // BPM erkennen
  const handleDetectTempo = async () => {
    try {
      const detectedTempo = await detectTempo();
      setTempo(detectedTempo);
      console.log('Detected tempo:', detectedTempo);
    } catch (err) {
      console.error('Failed to detect tempo:', err);
      // Wir setzen keinen Fehler mehr, da das die Benutzererfahrung nicht beeinträchtigen soll
      // setError('Tempo-Erkennung fehlgeschlagen');
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

  return (
    <div className={`flex flex-col items-start ${className}`}>
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
          {tempo && <div className="text-[10px]">{Math.round(tempo)} BPM</div>}
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
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
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
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
          
          <button
            onClick={handleDetectTempo}
            title="BPM erkennen"
            className="w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-800 hover:border-[#3EE6FF] text-[8px] font-mono text-[#3EE6FF]"
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(62,230,255,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            BPM
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