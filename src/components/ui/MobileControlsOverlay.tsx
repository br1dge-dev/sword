"use client";

import React, { useState } from 'react';
import SideButtons from './SideButtons';
import MusicPlayer from './MusicPlayer';
import AudioVisualizer from './AudioVisualizer';
import { IoMdSettings } from 'react-icons/io';
import { useAudioReactionStore } from '@/store/audioReactionStore';

/**
 * MobileControlsOverlay Component
 * 
 * Provides touch controls for mobile devices, including music player and audio visualizer.
 * Uses the global audio reaction store instead of props for better state management.
 */
export default function MobileControlsOverlay() {
  const [showControls, setShowControls] = useState(false);
  const { energy, beatDetected, updateEnergy, triggerBeat } = useAudioReactionStore();
  
  // Handlers für Audio-Events
  const handleBeat = () => {
    triggerBeat();
  };
  
  const handleEnergyChange = (newEnergy: number) => {
    updateEnergy(newEnergy);
  };
  
  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* Schwebende Steuerungselemente */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <MusicPlayer
          onBeat={handleBeat}
          onEnergyChange={handleEnergyChange}
        />
      </div>
      
      {/* Audio-Visualizer */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <AudioVisualizer 
          energy={energy} 
          beatDetected={beatDetected}
        />
      </div>
      
      {/* Weitere mobile Steuerelemente können hier hinzugefügt werden */}
    </div>
  );
} 