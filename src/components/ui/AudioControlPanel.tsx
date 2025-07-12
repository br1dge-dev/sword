"use client";

import React, { useState, useEffect } from 'react';
import { useAudioReactionStore } from '../../store/audioReactionStore';
import { useAudio, tracks } from '../../lib/audio/AudioProvider';

interface AudioControlPanelProps {
  className?: string;
  onBeat?: () => void;
  onEnergyChange?: (energy: number) => void;
}

// Visualisierungs-Balken
const VisualizerBar = ({ active, index }: { active: boolean; index: number }) => {
  return (
    <div
      className={`h-full w-1 mx-px ${active ? 'bg-[#3EE6FF]' : 'bg-gray-700'}`}
      style={{
        boxShadow: active ? '0 0 4px rgba(62,230,255,0.8)' : 'none',
        height: `${Math.max(15, 25 + index * 5)}%`,
        transition: 'background-color 0.1s ease, box-shadow 0.1s ease'
      }}
    />
  );
};

export default function AudioControlPanel({ className = '', onBeat, onEnergyChange }: AudioControlPanelProps) {
  const [visualBeatActive, setVisualBeatActive] = useState(false);
  const [lastEnergy, setLastEnergy] = useState(0);
  
  // Audio-Reaction-Store
  const { isIdleActive, swordColor } = useAudioReactionStore(state => ({
    isIdleActive: state.isIdleActive(),
    swordColor: state.swordColor
  }));
  
  // Audio-Context aus dem Provider
  const {
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
    prevTrack
  } = useAudio();
  
  // Effekt für visuellen Beat-Indikator
  useEffect(() => {
    if (beatDetected) {
      setVisualBeatActive(true);
      setTimeout(() => setVisualBeatActive(false), 150);
    }
  }, [beatDetected]);
  
  // Effekt für Energy-Änderungen
  useEffect(() => {
    setLastEnergy(energy);
    onEnergyChange?.(energy);
  }, [energy, onEnergyChange]);
  
  // Effekt für Beat-Erkennung
  useEffect(() => {
    if (beatDetected) {
      onBeat?.();
    }
  }, [beatDetected, onBeat]);

  // Visualisierungs-Balken berechnen
  const activeBars = Math.max(1, Math.floor(Math.min(1, lastEnergy * 1.8) * 8));

  return (
    <div className={`flex flex-col ${className}`} style={{ width: '100%', maxWidth: '280px' }}>
      {/* Header mit Titel */}
      <div className="flex flex-col mb-3">
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#3EE6FF]" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          DANKNESS
        </div>
        
        {/* Audio Visualizer */}
        <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex"
             style={{ 
               boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          {/* Balken */}
          <div className="flex items-end justify-around w-full h-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <VisualizerBar key={i} active={i < activeBars} index={i} />
            ))}
          </div>
          
          {/* Beat-Indikator */}
          {visualBeatActive && (
            <div className="absolute inset-0 bg-[#3EE6FF] opacity-20"></div>
          )}
        </div>
      </div>
      
      {/* Fortschrittsbalken */}
      <div className="relative w-full h-1 bg-gray-800 mb-2">
        <div 
          className="absolute top-0 left-0 h-full"
          style={{ 
            width: `${progress}%`, 
            backgroundColor: swordColor || '#3EE6FF',
            boxShadow: `0 0 4px ${swordColor || '#3EE6FF'}`
          }}
        />
      </div>
      
      {/* Track-Name */}
      <div className="text-xs text-[#3EE6FF] mb-2 font-mono truncate">
        {tracks[currentTrackIndex].name}
      </div>
      
      {/* Steuerelemente */}
      <div className="flex justify-between items-center">
        {/* Zurück-Button */}
        <button 
          onClick={prevTrack}
          className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
        >
          <span className="transform rotate-180">►</span>
        </button>
        
        {/* Play/Pause-Button */}
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
          style={{
            boxShadow: isPlaying ? `0 0 8px ${swordColor || '#3EE6FF'}` : 'none',
            borderColor: isPlaying ? swordColor || '#3EE6FF' : '',
            color: isPlaying ? swordColor || '#3EE6FF' : ''
          }}
        >
          {isPlaying ? '❚❚' : '►'}
        </button>
        
        {/* Weiter-Button */}
        <button 
          onClick={() => nextTrack()}
          className="w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-400 hover:text-[#3EE6FF] hover:border-[#3EE6FF] transition-colors"
        >
          ►
        </button>
      </div>
      
      {/* Debug-Anzeige */}
      {false && (
        <div className="mt-2 text-xs text-gray-500 font-mono">
          <div>Energy: {lastEnergy.toFixed(4)}</div>
          <div>Beat: {beatDetected ? 'YES' : 'no'}</div>
          <div>Analyzing: {isAnalyzing ? 'YES' : 'no'}</div>
          <div>Idle: {isIdleActive ? 'YES' : 'no'}</div>
        </div>
      )}
    </div>
  );
} 