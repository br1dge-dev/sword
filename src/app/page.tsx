/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 */
"use client";

import { useState, useEffect } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { useCalmIdleAnimation } from '@/hooks/useCalmIdleAnimation';
import AsciiSword from '@/components/ascii/AsciiSword';
import MusicPlayer from '@/components/ui/MusicPlayer';
import AudioVisualizer from '@/components/ui/AudioVisualizer';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import { IoMdSettings } from 'react-icons/io';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);
  const [showDesktopUI, setShowDesktopUI] = useState(true); // NEU
  const { energy, beatDetected, setMusicPlaying } = useAudioReactionStore();
  
  // Ruhige und dezent Idle-Animation aktivieren
  useCalmIdleAnimation();
  
  // Media Query für mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // UI-Elemente nur anzeigen, wenn:
  // - Desktop und showDesktopUI === true
  // - Mobile: nie anzeigen
  const showUI = !isMobile && showDesktopUI;

  // Beat-Effekt für Debugging
  useEffect(() => {
    if (beatDetected) {
      console.log('Beat detected in main component!');
    }
  }, [beatDetected]);
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Fallback-Animation deaktivieren, da wir die neue Idle-Animation verwenden
    const { setFallbackEnabled } = useAudioReactionStore.getState();
    setFallbackEnabled(false);
    
    // Musik als nicht spielend markieren, damit Idle-Animation startet
    setMusicPlaying(false);
    
    console.log('HomePage mounted, old fallback disabled, new idle animation will start');
    
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
        {showUI && (
          <div className="absolute left-[10%] top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-8">
            <AudioVisualizer 
              energy={energy} 
              beatDetected={beatDetected} 
            />
            <MusicPlayer 
              onBeat={handleBeat} 
              onEnergyChange={handleEnergyChange} 
              className="min-w-[200px]"
            />
            <SideButtons />
          </div>
        )}
        {/* Desktop Toggle-Button (Auge) */}
        {!isMobile && (
          <button
            onClick={() => setShowDesktopUI((v) => !v)}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{ boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)' }}
            aria-label={showDesktopUI ? 'UI ausblenden' : 'UI einblenden'}
          >
            {showDesktopUI ? (
              <IoEyeOutline className="text-grifter-blue text-2xl" />
            ) : (
              <IoEyeOffOutline className="text-grifter-blue text-2xl" />
            )}
          </button>
        )}
        {/* Mobile Steuerelemente (Zahnrad & Modal) */}
        {isMobile && (
          <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20">
            <MobileControlsOverlay
              audioEnergy={energy}
              beatDetected={beatDetected}
              onBeat={handleBeat}
              onEnergyChange={handleEnergyChange}
              isOpen={mobileOverlayOpen}
              setIsOpen={setMobileOverlayOpen}
            />
          </div>
        )}
      </div>
    </main>
  );
} 