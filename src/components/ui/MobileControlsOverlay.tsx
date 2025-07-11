"use client";

import React, { useState, useEffect } from 'react';
import SideButtons from './SideButtons';
import AudioControlPanel from './AudioControlPanel';
import { IoMdSettings } from 'react-icons/io';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface MobileControlsOverlayProps {
  onBeat: () => void;
  onEnergyChange: (energy: number) => void;
}

export default function MobileControlsOverlay({
  onBeat,
  onEnergyChange
}: MobileControlsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const { isMusicPlaying } = useAudioReactionStore();

  // Effekt, um Benutzerinteraktion zu erkennen und Audio zu initialisieren
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isAudioInitialized) {
        setIsAudioInitialized(true);
      }
    };

    // Event-Listener für Benutzerinteraktionen
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [isAudioInitialized]);

  return (
    <>
      {/* Audio-Element ist immer im DOM und aktiv, aber visuell versteckt */}
      <div className="fixed opacity-0 pointer-events-none" aria-hidden="true">
        <AudioControlPanel 
          onBeat={onBeat} 
          onEnergyChange={onEnergyChange} 
          alwaysActive={true} 
        />
      </div>
      
      {/* Overlay-Button (immer sichtbar) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
        style={{
          boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
        }}
      >
        <IoMdSettings 
          className={`text-grifter-blue text-2xl transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {/* Overlay (nur sichtbar wenn isOpen true ist) */}
      <div 
        className={`fixed inset-0 z-20 bg-black bg-opacity-90 transition-opacity duration-300 flex flex-col items-center justify-center ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-sm p-6 flex flex-col items-center gap-8">
          <div className="text-xl font-press-start-2p text-grifter-blue mb-4">CONTROLS</div>
          <div className="w-full flex flex-col items-center gap-8">
            <SideButtons className="items-center" />
            {/* Sichtbare UI */}
            <AudioControlPanel 
              onBeat={onBeat}
              onEnergyChange={onEnergyChange}
              className="items-center"
              controlOnly={true}
            />
          </div>
        </div>
      </div>
    </>
  );
} 