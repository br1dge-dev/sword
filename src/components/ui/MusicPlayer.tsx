"use client";

/**
 * MusicPlayer Component
 * 
 * Ein einfacher Musik-Player im Retro-Stil, der zum Design der Anwendung passt.
 * Integriert mit Audio-Analyse für Beat-Erkennung.
 */
import React, { useState, useEffect } from 'react';
import { useAudioReactionStore } from '../../store/audioReactionStore';
import { useAudio, tracks } from '../../lib/audio/AudioProvider';

interface MusicPlayerProps {
  className?: string;
  onBeat?: () => void;
  onEnergyChange?: (energy: number) => void;
}

export default function MusicPlayer({ className = '', onBeat, onEnergyChange }: MusicPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [showAnalyzerInfo, setShowAnalyzerInfo] = useState(false);
  const [visualBeatActive, setVisualBeatActive] = useState(false);
  
  // Audio-Context aus dem Provider
  const {
    isPlaying,
    currentTrackIndex,
    progress,
    energy,
    beatDetected,
    togglePlay,
    nextTrack,
    prevTrack
  } = useAudio();
  
  // Effekt für visuellen Beat-Indikator
  useEffect(() => {
    if (beatDetected) {
      setVisualBeatActive(true);
      setTimeout(() => setVisualBeatActive(false), 150);
      onBeat?.();
    }
  }, [beatDetected, onBeat]);
  
  // Effekt für Energy-Änderungen
  useEffect(() => {
    onEnergyChange?.(energy);
  }, [energy, onEnergyChange]);
  
  // Aktuelle Track-Informationen
  const currentTrack = tracks[currentTrackIndex];
  
  // Fortschrittsbalken-Tiles
  const renderProgressTiles = () => {
    const tileCount = 20;
    const activeTiles = Math.floor((progress / 100) * tileCount);
    
    return Array.from({ length: tileCount }).map((_, index) => (
      <div
        key={index}
        className={`absolute top-0 h-full border-r border-gray-900 ${
          index < activeTiles ? 'bg-[#3EE6FF]' : 'bg-transparent'
        }`}
        style={{
          left: `${(index / tileCount) * 100}%`,
          width: `${100 / tileCount}%`,
          boxShadow: index < activeTiles ? '0 0 4px rgba(62,230,255,0.5)' : 'none'
        }}
      />
    ));
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-col w-full">
        {/* Track-Name und Audio-Sync-Hinweis */}
        <div className="mb-1 text-xs font-bold text-[#3EE6FF] flex justify-between items-center w-full" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em',
               fontFamily: 'var(--font-press-start-2p)'
             }}
        >
          <div className="truncate mr-2">DANKNESS</div>
          {!isPlaying && (
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
        <div className="flex items-center space-x-2">
          {/* Track-Name */}
          <div className="text-xs text-[#3EE6FF] font-mono truncate flex-grow">
            {currentTrack.name}
          </div>
          
          {/* Steuerungstasten */}
          <div className="flex items-center space-x-1">
            <button
              onClick={prevTrack}
              className="w-6 h-6 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
            >
              <span className="transform rotate-180 text-xs">►</span>
            </button>
            
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
              style={{
                boxShadow: isPlaying ? '0 0 8px rgba(62,230,255,0.6)' : 'none',
                borderColor: isPlaying ? '#3EE6FF' : '',
                color: isPlaying ? '#3EE6FF' : ''
              }}
            >
              {isPlaying ? '❚❚' : '►'}
            </button>
            
            <button
              onClick={() => nextTrack()}
              className="w-6 h-6 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
            >
              <span className="text-xs">►</span>
            </button>
          </div>
        </div>
        
        {/* Fehler-Anzeige */}
        {error && (
          <div className="mt-2 text-xs text-red-500">
            {error}
          </div>
        )}
        
        {/* Debug-Informationen */}
        {showAnalyzerInfo && (
          <div className="mt-2 text-xs text-gray-500">
            <div>Energy: {energy.toFixed(4)}</div>
            <div>Beat: {beatDetected ? 'YES' : 'no'}</div>
            <div>Track: {currentTrack.name}</div>
            <button
              onClick={() => setShowAnalyzerInfo(false)}
              className="text-[#3EE6FF] mt-1"
            >
              Hide
            </button>
          </div>
        )}
        
        {!showAnalyzerInfo && (
          <button
            onClick={() => setShowAnalyzerInfo(true)}
            className="mt-1 text-xs text-gray-600 hover:text-gray-400"
          >
            Debug
          </button>
        )}
      </div>
    </div>
  );
} 