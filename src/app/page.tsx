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
import MusicPlayer from '@/components/ui/MusicPlayer';
import AudioVisualizer from '@/components/ui/AudioVisualizer';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const { energy, beatDetected, setMusicPlaying } = useAudioReactionStore();
  
  // OPTIMIERT: Reduzierte Logs für bessere Performance
  const lastLogTimeRef = useRef(0);
  const lastEnergyRef = useRef(energy);
  
  // OPTIMIERT: Beat-Effekt für Debugging (nur bei wichtigen Events)
  useEffect(() => {
    if (beatDetected) {
      console.log('Beat detected in main component!');
    }
  }, [beatDetected]);
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Musik als nicht spielend markieren, damit Idle aktiviert wird
    setMusicPlaying(false);
    
    console.log('HomePage mounted');
    
    return () => {
      console.log('HomePage unmounted');
      // KEIN Cleanup beim Unmount, da die Idle-Animation im Layout läuft
    };
  }, [setMusicPlaying]);
  
  // OPTIMIERT: Reduzierte Energie- und Beat-Logs
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastLog = now - lastLogTimeRef.current;
    
    // OPTIMIERT: Log nur alle 10 Sekunden oder bei signifikanten Änderungen (erhöht von 5s auf 10s)
    if (timeSinceLastLog > 10000 || Math.abs(energy - lastEnergyRef.current) > 0.5 || beatDetected) { // Erhöht von 0.3 auf 0.5
      console.log(`Energy changed: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
      lastLogTimeRef.current = now;
      lastEnergyRef.current = energy;
    }
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
        <div className="hidden sm:flex absolute left-[10%] top-1/2 transform -translate-y-1/2 z-10 flex-col gap-8">
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