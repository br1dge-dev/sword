/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 * OPTIMIERT: Reduzierte Logs, bessere Performance
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import AsciiSword from '@/components/ascii/AsciiSword';
import AudioControlPanel from '@/components/ui/AudioControlPanel';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { energy, beatDetected, setMusicPlaying } = useAudioReactionStore();
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Prüfe, ob es ein mobiles Gerät ist
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Event-Listener für Resize
    window.addEventListener('resize', checkMobile);
    
    // Musik als nicht spielend markieren, damit Idle aktiviert wird
    setMusicPlaying(false);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setMusicPlaying]);
  
  // Handle beat detection
  const handleBeat = () => {
    // Aktualisiere den Audio-Reaction-Store direkt
    const { triggerBeat } = useAudioReactionStore.getState();
    triggerBeat();
  };
  
  // Handle energy changes
  const handleEnergyChange = (energy: number) => {
    // Aktualisiere den Audio-Reaction-Store direkt
    const { updateEnergy, setAudioActive } = useAudioReactionStore.getState();
    updateEnergy(energy);
    setAudioActive(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden">
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Hauptbereich mit dem ASCII-Schwert */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AsciiSword 
            level={baseSwordLevel} 
            directEnergy={energy} 
            directBeat={beatDetected} 
          />
        </div>
        
        {/* Gemeinsamer Audio-Player (immer aktiv, aber nur auf Desktop sichtbar) */}
        <div className={`absolute top-1/2 left-[75vw] transform -translate-x-1/2 -translate-y-1/2 z-10 ${isMobile ? 'hidden' : 'flex'}`}>
          <AudioControlPanel 
            onBeat={handleBeat} 
            onEnergyChange={handleEnergyChange} 
            alwaysActive={true}
          />
        </div>
        
        {/* SideButtons auf der linken Seite */}
        <div className="hidden sm:flex absolute top-1/2 left-[25vw] transform -translate-x-1/2 -translate-y-1/2 z-10">
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
    </main>
  );
} 