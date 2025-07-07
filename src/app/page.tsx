/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 */
"use client";

import { useState, useEffect } from 'react';
import { useAudioReactionStore, useFallbackAnimation } from '@/store/audioReactionStore';
import AsciiSword from '@/components/ascii/AsciiSword';
import MusicPlayer from '@/components/ui/MusicPlayer';
import AudioVisualizer from '@/components/ui/AudioVisualizer';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const { energy, beatDetected, setMusicPlaying } = useAudioReactionStore();
  
  // Beat-Effekt für Debugging
  useEffect(() => {
    if (beatDetected) {
      console.log('Beat detected in main component!');
    }
  }, [beatDetected]);
  
  // Client-Side Rendering aktivieren und Fallback starten
  useEffect(() => {
    setIsClient(true);
    
    // Musik als nicht spielend markieren, damit Fallback aktiviert wird
    setMusicPlaying(false);
    
    console.log('HomePage mounted, fallback should start');
    
    return () => {
      console.log('HomePage unmounted');
    };
  }, [setMusicPlaying]);
  
  // Energie- und Beat-Änderungen loggen
  useEffect(() => {
    console.log(`Energy changed: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
  }, [energy, beatDetected]);
  
  // Handle beat detection
  const handleBeat = () => {
    console.log('Beat detected in main component!');
    
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
        
        {/* UI-Elemente auf der linken Seite, untereinander angeordnet */}
        <div className="absolute left-[10%] top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-8">
          {/* AudioVisualizer oben */}
          <AudioVisualizer 
            energy={energy} 
            beatDetected={beatDetected} 
          />
          
          {/* MusicPlayer in der Mitte */}
          <MusicPlayer 
            onBeat={handleBeat} 
            onEnergyChange={handleEnergyChange} 
            className="min-w-[200px]"
          />
          
          {/* SideButtons unten */}
          <SideButtons />
        </div>
        
        {/* Mobile Steuerelemente */}
        <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20">
          <MobileControlsOverlay
            audioEnergy={energy}
            beatDetected={beatDetected}
            onBeat={handleBeat}
            onEnergyChange={handleEnergyChange}
          />
        </div>
      </div>
    </main>
  );
} 