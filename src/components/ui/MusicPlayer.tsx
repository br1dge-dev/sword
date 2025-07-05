"use client";

/**
 * MusicPlayer Component
 * 
 * Ein einfacher Musik-Player im Retro-Stil, der zum Design der Anwendung passt.
 * Erweitert mit Web Audio API für Beat-Erkennung.
 */
import React, { useState, useRef, useEffect } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface MusicPlayerProps {
  className?: string;
}

// Verfügbare Tracks
const tracks = [
  { src: "/music/gr1ftsword.mp3", name: "GR1FTSWORD" },
  { src: "/music/flashword.mp3", name: "FLASHWORD" },
  { src: "/music/funksword.mp3", name: "FUNKSWORD" },
  { src: "/music/atarisword.mp3", name: "ATARISWORD" }
];

export default function MusicPlayer({ className = '' }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  // Web Audio API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSetupCompleteRef = useRef<boolean>(false);
  
  // Beat-Erkennung
  const { setBeatDetected, setBeatEnergy } = usePowerUpStore();
  const lastVolumeRef = useRef<number>(0);
  const beatThresholdRef = useRef<number>(0.025); // Niedriger Schwellenwert für Beat-Erkennung
  const beatCooldownRef = useRef<boolean>(false);
  const lastBeatTimeRef = useRef<number>(0);
  const beatDetectionRunningRef = useRef<boolean>(false);
  
  // Initialisiere Web Audio API
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        console.log("%c[AUDIO_DEBUG] AudioContext erstellt: ", "color: #44AAFF; font-weight: bold;", audioContextRef.current);
      } catch (err) {
        console.error("Fehler bei der Initialisierung der Web Audio API:", err);
      }
    }
    
    // Cleanup beim Unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.error("Fehler beim Schließen des AudioContext:", err);
        });
      }
    };
  }, []);
  
  // Setup der Audio-Analyse
  const setupAudioAnalysis = () => {
    if (audioSetupCompleteRef.current) {
      console.log("%c[AUDIO_DEBUG] Audio-Setup bereits abgeschlossen", "color: #44AAFF; font-weight: bold;");
      return true;
    }
    
    if (!audioRef.current || !audioContextRef.current) {
      console.error("%c[AUDIO_ERROR] Audio-Element oder AudioContext nicht verfügbar", "color: red; font-weight: bold;");
      return false;
    }
    
    try {
      console.log("%c[AUDIO_DEBUG] Initialisiere Web Audio API...", "color: #44AAFF; font-weight: bold;");
      
      // Erstelle MediaElementSource
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      
      // Erstelle Analyser mit optimierten Einstellungen für Beat-Erkennung
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Analysator konfigurieren - kleinere FFT-Größe für schnellere Reaktion
      analyserRef.current.fftSize = 256; // Kleinere FFT-Größe für schnellere Reaktion
      analyserRef.current.smoothingTimeConstant = 0.6; // Weniger Glättung für schnellere Reaktion
      
      console.log("%c[AUDIO_DEBUG] Analyser konfiguriert: fftSize=" + analyserRef.current.fftSize + 
                 ", frequencyBinCount=" + analyserRef.current.frequencyBinCount + 
                 ", smoothingTimeConstant=" + analyserRef.current.smoothingTimeConstant, 
                 "color: #44AAFF; font-weight: bold;");
      
      // Verbindungen herstellen
      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      console.log("%c[AUDIO] Web Audio API initialisiert beim Play", "color: #44AAFF; font-weight: bold;");
      
      audioSetupCompleteRef.current = true;
      return true;
    } catch (err) {
      console.error("%c[AUDIO_ERROR] Fehler bei der Initialisierung der Web Audio API:", "color: red; font-weight: bold;", err);
      return false;
    }
  };
  
  // Beat-Erkennung
  const startBeatDetection = () => {
    if (beatDetectionRunningRef.current) {
      console.log("%c[AUDIO_DEBUG] Beat-Erkennung läuft bereits", "color: #44AAFF; font-weight: bold;");
      return;
    }
    
    if (!analyserRef.current) {
      console.error("%c[AUDIO_ERROR] Analyser nicht verfügbar!", "color: red; font-weight: bold;");
      return;
    }
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Speichere die letzten Werte für bessere Beat-Erkennung
    const energyHistory = new Array(8).fill(0);
    let energyIndex = 0;
    let frameCount = 0;
    
    console.log("%c[AUDIO_DEBUG] Beat detection gestartet mit bufferLength: " + bufferLength, "color: #44AAFF; font-weight: bold;");
    beatDetectionRunningRef.current = true;
    
    const detectBeat = () => {
      if (!analyserRef.current) {
        console.log("%c[AUDIO_DEBUG] Analyser nicht mehr verfügbar", "color: #44AAFF; font-weight: bold;");
        beatDetectionRunningRef.current = false;
        return;
      }
      
      frameCount++;
      
      // Frequenzdaten abrufen
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Fokus auf niedrige Frequenzen (Bass) für Beat-Erkennung
      const bassRange = dataArray.slice(0, 10);
      const bassVolume = bassRange.reduce((sum, value) => sum + value, 0) / bassRange.length / 255;
      
      // Energie-Level setzen (0-1)
      setBeatEnergy(bassVolume);
      
      // Speichere den aktuellen Wert im History-Array
      energyHistory[energyIndex] = bassVolume;
      energyIndex = (energyIndex + 1) % energyHistory.length;
      
      // Berechne den Durchschnitt der letzten Werte
      const averageEnergy = energyHistory.reduce((sum, val) => sum + val, 0) / energyHistory.length;
      
      // Berechne die lokale Energie-Variation
      const energyVariation = bassVolume / (averageEnergy || 0.1);
      
      // Beat-Erkennung durch plötzlichen Anstieg
      const volumeDelta = bassVolume - lastVolumeRef.current;
      
      // Logge alle 10 Frames die Audio-Analyse-Daten
      if (frameCount % 10 === 0) {
        console.log(`%c[AUDIO_ANALYSIS] Volume: ${bassVolume.toFixed(2)}, Avg: ${averageEnergy.toFixed(2)}, Variation: ${energyVariation.toFixed(2)}, Delta: ${volumeDelta.toFixed(2)}, Cooldown: ${beatCooldownRef.current}`, 
                   'color: #44AAFF; font-weight: bold;');
      }
      
      // Beat-Erkennung mit niedrigen Schwellenwerten
      if (!beatCooldownRef.current && 
          ((volumeDelta > beatThresholdRef.current && bassVolume > 0.03) || 
           (energyVariation > 1.02 && bassVolume > 0.04) || 
           (bassVolume > 0.1 && volumeDelta > 0.015) || 
           // Notfall-Bedingung: Erzeuge künstliche Beats, wenn längere Zeit kein Beat erkannt wurde
           (Date.now() - lastBeatTimeRef.current > 800 && bassVolume > 0.08))) {   
        
        // Beat erkannt
        setBeatDetected(true);
        beatCooldownRef.current = true;
        const now = Date.now();
        lastBeatTimeRef.current = now;
        
        // Beat-Feedback in der Konsole
        console.log(`%c[BEAT_DETECTED] Beat erkannt! Energie: ${bassVolume.toFixed(2)}, Delta: ${volumeDelta.toFixed(2)}, Variation: ${energyVariation.toFixed(2)}`, 
                   'color: #FF3EC8; font-weight: bold;');
        
        // Debug-Log für den Store-Zustand nach setBeatDetected
        setTimeout(() => {
          const storeState = usePowerUpStore.getState();
          console.log(`%c[BEAT_DEBUG_STORE] Store-Status nach setBeatDetected(true): beatDetected=${storeState.beatDetected}, beatEnergy=${storeState.beatEnergy.toFixed(2)}`, 
                     'color: #FF3EC8; background-color: #222222; font-weight: bold;');
        }, 10);
        
        // Beat-Signal nach kurzer Zeit zurücksetzen
        setTimeout(() => {
          setBeatDetected(false);
          console.log(`%c[BEAT_RESET] Beat-Signal zurückgesetzt`, 'color: #FF3EC8; font-weight: bold;');
          
          // Debug-Log für den Store-Zustand nach setBeatDetected(false)
          setTimeout(() => {
            const storeState = usePowerUpStore.getState();
            console.log(`%c[BEAT_DEBUG_STORE] Store-Status nach setBeatDetected(false): beatDetected=${storeState.beatDetected}, beatEnergy=${storeState.beatEnergy.toFixed(2)}`, 
                       'color: #FF3EC8; background-color: #222222; font-weight: bold;');
          }, 10);
        }, 100);
        
        // Cooldown für nächste Beat-Erkennung
        setTimeout(() => {
          beatCooldownRef.current = false;
          console.log(`%c[BEAT_COOLDOWN] Beat-Cooldown beendet, bereit für nächsten Beat`, 'color: #FF3EC8; font-weight: bold;');
        }, 120); // Kürzerer Cooldown
      }
      
      // Aktuelles Volumen für nächsten Vergleich speichern
      lastVolumeRef.current = bassVolume;
      
      // Nächsten Frame anfordern, solange die Komponente gemountet ist
      if (beatDetectionRunningRef.current) {
        requestAnimationFrame(detectBeat);
      }
    };
    
    // Beat-Erkennung starten
    detectBeat();
    console.log(`%c[AUDIO] Beat detection started`, 'color: #44AAFF; font-weight: bold;');
  };
  
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
  
  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      beatDetectionRunningRef.current = false;
      
      // Verbindungen trennen
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, []);
  
  // Play/Pause-Funktion
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // AudioContext starten, falls nötig
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Audio-Analyse einrichten, falls noch nicht geschehen
      const setupComplete = setupAudioAnalysis();
      
      // Versuche zu spielen und fange Fehler ab
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setError(null);
            setIsPlaying(true);
            console.log("%c[AUDIO] Wiedergabe gestartet", "color: #44AAFF; font-weight: bold;");
            
            // Wenn die Wiedergabe erfolgreich gestartet wurde und das Setup abgeschlossen ist,
            // starte die Beat-Erkennung
            if (setupComplete && analyserRef.current) {
              startBeatDetection();
            }
          })
          .catch(err => {
            console.error("%c[AUDIO_ERROR] Fehler beim Abspielen:", "color: red; font-weight: bold;", err);
            setError("Wiedergabe nicht möglich");
            setIsPlaying(false);
          });
      }
    }
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
    
    // Spiele den neuen Track ab, wenn der vorherige abgespielt wurde
    setTimeout(() => {
      if (wasPlaying && audioRef.current) {
        // AudioContext starten, falls nötig
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
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
  
  // Fortschrittsbalken-Tiles generieren
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = tileProgress <= progress;
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${isActive ? 'bg-[#3EE6FF]' : 'bg-gray-800'} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive ? 'inset 0 0 3px rgba(62,230,255,0.8)' : 'none'
          }}
        />
      );
    }
    
    return tiles;
  };

  // Aktueller Track
  const currentTrack = tracks[currentTrackIndex];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Audio-Element (unsichtbar) */}
      <audio 
        ref={audioRef} 
        src={currentTrack.src}
        preload="metadata"
        onCanPlayThrough={() => setError(null)}
        crossOrigin="anonymous"
      />
      
      <div className="flex flex-col">
        {/* Überschrift "MUSIC" im Pixel-Font-Stil, linksbündig */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#3EE6FF]" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          {currentTrack.name}
        </div>
        
        {/* Fortschrittsbalken und Play/Pause-Button */}
        <div className="flex items-center gap-2">
          {/* Fortschrittsbalken mit Tiles (dient jetzt auch als Lautstärkeregler) */}
          <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex"
               style={{ 
                 boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
                 imageRendering: 'pixelated'
               }}>
            {renderProgressTiles()}
            
            {/* Unsichtbarer Range-Input für Scrubbing und Lautstärke */}
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
          
          {/* Play/Pause-Button */}
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
            {/* Play/Pause-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {isPlaying ? (
                <>
                  {/* Pause-Icon */}
                  <div className="absolute top-0 left-0 w-1 h-3 bg-[#3EE6FF]"></div>
                  <div className="absolute top-0 left-2 w-1 h-3 bg-[#3EE6FF]"></div>
                </>
              ) : (
                <>
                  {/* Play-Icon */}
                  <div className="absolute top-0 left-0 w-2 h-3 bg-[#3EE6FF] clip-triangle"></div>
                </>
              )}
              
              {/* Glüheffekt */}
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
          
          {/* Next-Button */}
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
            {/* Next-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Zwei Dreiecke für Next-Symbol */}
              <div className="absolute top-0 left-0 w-1 h-3 bg-[#3EE6FF] clip-triangle"></div>
              <div className="absolute top-0 left-2 w-1 h-3 bg-[#3EE6FF] clip-triangle"></div>
              <div className="absolute top-0 left-3 w-[2px] h-3 bg-[#3EE6FF]"></div>
              
              {/* Glüheffekt */}
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(62,230,255,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
        </div>
        
        {/* Fehleranzeige (nur wenn ein Fehler vorliegt) */}
        {error && (
          <div className="mt-1 text-[10px] text-left opacity-80 font-mono text-[#FF3EC8]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 