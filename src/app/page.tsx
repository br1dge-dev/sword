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
  
  const [isClient, setIsClient] = useState(false);
  const { energy, beatDetected, setAudioActive, setMusicPlaying } = useAudioReactionStore();
  
  // Beat-Effekt für Debugging
  useEffect(() => {
    if (beatDetected) {
      console.log('Beat detected in main component!');
    }
  }, [beatDetected]);
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Audio als aktiv markieren, damit Fallback nicht sofort startet
    setAudioActive(false);
    
    // Musik als nicht spielend markieren, damit Fallback aktiviert wird
    setMusicPlaying(false);
    
    console.log('HomePage mounted, audio set to active');
    
    return () => {
      console.log('HomePage unmounted');
    };
  }, [setAudioActive, setMusicPlaying]);
  
  // Energie- und Beat-Änderungen loggen
  useEffect(() => {
    console.log(`Energy changed: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
  }, [energy, beatDetected]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-2 px-4 overflow-hidden bg-black">
      <div className="flex-grow flex items-center justify-center w-full h-full">
        <div className="w-full h-full flex items-center justify-center">
          <AsciiSword 
            level={baseSwordLevel} 
            directEnergy={energy} 
            directBeat={beatDetected} 
          />
        </div>
      </div>
      
      {/* UI-Elemente auf der linken Seite - nur auf größeren Bildschirmen sichtbar */}
      <div className="fixed left-[10%] top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col items-start gap-6">
        <SideButtons />
        <MusicPlayer 
          onBeat={() => {}} 
          onEnergyChange={(e) => {}} 
        />
        <AudioVisualizer 
          energy={energy} 
          beatDetected={beatDetected} 
        />
      </div>
      
      {/* Mobiles Overlay - nur auf kleinen Bildschirmen sichtbar */}
      <div className="sm:hidden">
        <MobileControlsOverlay
          audioEnergy={energy}
          beatDetected={beatDetected}
          onBeat={() => {}}
          onEnergyChange={(e) => {}}
        />
      </div>
    </main>
  );
} 