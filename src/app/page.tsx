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
  const { energy, beatDetected } = useAudioReactionStore();
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Mobile-Erkennung
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Beat-Handler für Komponenten
  const handleBeat = () => {
    // Beat-Reaktionen können hier implementiert werden
  };
  
  // Energy-Handler für Komponenten
  const handleEnergyChange = (energy: number) => {
    // Energy-Reaktionen können hier implementiert werden
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">
      {isClient && (
        <>
          {/* Hauptinhalt */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <AsciiSword level={baseSwordLevel} />
          </div>
          
          {/* Desktop-Steuerelemente */}
          <div className="hidden md:block fixed bottom-8 right-8">
            <AudioControlPanel 
              onBeat={handleBeat}
              onEnergyChange={handleEnergyChange}
            />
          </div>
          
          {/* Seitliche Buttons (nur Desktop) */}
          <div className="hidden md:block fixed top-1/2 right-8 transform -translate-y-1/2">
            <SideButtons />
          </div>
          
          {/* Mobile-Steuerelemente */}
          <div className="md:hidden">
            <MobileControlsOverlay 
              onBeat={handleBeat}
              onEnergyChange={handleEnergyChange}
            />
          </div>
        </>
      )}
    </main>
  );
} 