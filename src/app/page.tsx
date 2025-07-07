/**
 * HomePage - Main application page
 * 
 * This component renders the main page of the SWORD application,
 * featuring the central ASCII sword and blockchain visualization.
 */
"use client";

import AsciiSword from '@/components/ascii/AsciiSword';
import SideButtons from '@/components/ui/SideButtons';
import MusicPlayer from '@/components/ui/MusicPlayer';
import AudioVisualizer from '@/components/ui/AudioVisualizer';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { useEffect, useState } from "react";

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  // Audio analysis state
  const [audioEnergy, setAudioEnergy] = useState(0);
  const [beatDetected, setBeatDetected] = useState(false);
  
  // Handle beat detection
  const handleBeat = () => {
    console.log('Beat detected in main component!');
    setBeatDetected(true);
    
    // Aktualisiere den Audio-Reaction-Store direkt
    const { triggerBeat } = useAudioReactionStore.getState();
    triggerBeat();
    
    // Reset beat detection after a short delay
    setTimeout(() => {
      setBeatDetected(false);
    }, 100);
  };
  
  // Handle energy changes
  const handleEnergyChange = (energy: number) => {
    setAudioEnergy(energy);
    
    // Aktualisiere den Audio-Reaction-Store direkt
    const { updateEnergy } = useAudioReactionStore.getState();
    updateEnergy(energy);
  };

  // Setze Audio als aktiv, wenn die Komponente geladen wird
  useEffect(() => {
    const { setAudioActive } = useAudioReactionStore.getState();
    // Starte mit aktivem Audio, damit Fallback-Animation nicht aktiviert wird
    setAudioActive(true);
    
    // Debug-Log zur Überprüfung der Audio-Reaktivität
    console.log('HomePage mounted, audio set to active');
    
    return () => {
      console.log('HomePage unmounted');
    };
  }, []);
  
  // Debug-Effekt, um Audio-Reaktivität zu überwachen
  useEffect(() => {
    console.log(`Energy changed: ${audioEnergy.toFixed(2)}, Beat: ${beatDetected}`);
  }, [audioEnergy, beatDetected]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-2 px-4 overflow-hidden bg-black">
      <div className="flex-grow flex items-center justify-center w-full h-full">
        <div className="w-full h-full flex items-center justify-center">
          <AsciiSword 
            level={baseSwordLevel} 
            directEnergy={audioEnergy} 
            directBeat={beatDetected} 
          />
        </div>
      </div>
      
      {/* UI-Elemente auf der linken Seite - nur auf größeren Bildschirmen sichtbar */}
      <div className="fixed left-[10%] top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col items-start gap-6">
        <SideButtons />
        <MusicPlayer 
          onBeat={handleBeat} 
          onEnergyChange={handleEnergyChange} 
        />
        <AudioVisualizer 
          energy={audioEnergy} 
          beatDetected={beatDetected} 
        />
      </div>
      
      {/* Mobiles Overlay - nur auf kleinen Bildschirmen sichtbar */}
      <div className="sm:hidden">
        <MobileControlsOverlay
          audioEnergy={audioEnergy}
          beatDetected={beatDetected}
          onBeat={handleBeat}
          onEnergyChange={handleEnergyChange}
        />
      </div>
    </main>
  );
} 