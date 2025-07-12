/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 * OPTIMIERT: Reduzierte Logs, bessere Performance
 */
"use client";

import { useState, useEffect } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import AsciiSword from '@/components/ascii/AsciiSword';
import AudioControlPanel from '@/components/ui/AudioControlPanel';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const { energy, beatDetected, setMusicPlaying } = useAudioReactionStore();
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Musik als nicht spielend markieren, damit Idle aktiviert wird
    setMusicPlaying(false);
  }, [setMusicPlaying]);
  
  // Beat-Handler für Komponenten
  const handleBeat = () => {
    // Beat-Reaktionen können hier implementiert werden
  };
  
  // Energy-Handler für Komponenten
  const handleEnergyChange = (energy: number) => {
    // Energy-Reaktionen können hier implementiert werden
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden">
      {isClient && (
        <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Hauptbereich mit dem ASCII-Schwert */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AsciiSword level={baseSwordLevel} />
          </div>
          
          {/* UI-Elemente auf der rechten Seite */}
          <div className="hidden sm:flex absolute top-1/2 right-8 transform -translate-y-1/2 z-10">
            <AudioControlPanel 
              onBeat={handleBeat} 
              onEnergyChange={handleEnergyChange} 
            />
          </div>
          
          {/* SideButtons auf der linken Seite */}
          <div className="hidden sm:flex absolute top-1/2 left-8 transform -translate-y-1/2 z-10">
            <SideButtons />
          </div>
          
          {/* Mobile Steuerelemente */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20">
            <MobileControlsOverlay
              onBeat={handleBeat}
              onEnergyChange={handleEnergyChange}
            />
          </div>
        </div>
      )}
    </main>
  );
} 