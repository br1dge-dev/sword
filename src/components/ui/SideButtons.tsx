"use client";

/**
 * SideButtons Component
 * 
 * This component renders buttons on the left and right sides of the screen.
 */
import React, { useState, useCallback } from 'react';
import CleanseButton from './CleanseButton';
import ForgeProgressBar from './ForgeProgressBar';
import ChargeProgressBar from './ChargeProgressBar';
import GlitchProgressBar from './GlitchProgressBar';
import { usePowerUpStore } from '@/store/powerUpStore';

interface SideButtonsProps {
  className?: string;
}

export default function SideButtons({ className = '' }: SideButtonsProps) {
  const { resetAllEffects } = usePowerUpStore();
  
  // Zustandsvariablen für Fehlerbehandlung
  const [errorCount, setErrorCount] = useState(0);
  
  // Handler für den CLEANSE-Button
  const handleCleanse = useCallback(() => {
    try {
      // Alle Fortschritte zurücksetzen
      resetAllEffects();
    } catch (error) {
      console.error("Fehler beim Ausführen der Cleanse-Aktion:", error);
      handleError();
    }
  }, [resetAllEffects]);
  
  // Fehlerbehandlung
  const handleError = useCallback(() => {
    setErrorCount(prev => {
      // Bei zu vielen Fehlern alle Effekte zurücksetzen
      if (prev >= 3) {
        console.warn("Zu viele Fehler aufgetreten, setze alle Effekte zurück");
        try {
          resetAllEffects();
        } catch (e) {
          console.error("Fehler beim Zurücksetzen der Effekte:", e);
        }
        return 0;
      }
      return prev + 1;
    });
  }, [resetAllEffects]);
  
  return (
    <>
      {/* Linke Seite mit allen Buttons und Progress-Bars */}
      <div className={`fixed left-[12%] top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 ${className}`}>
        {/* CLEANSE Button */}
        <CleanseButton 
          onClick={handleCleanse}
          cooldown={3000} // 3 Sekunden Cooldown für CLEANSE
        />
        
        {/* Alle Progress-Bars */}
        <div className="flex flex-col gap-5 mt-4">
          {/* Forge-Fortschrittsbalken */}
          <ForgeProgressBar />
          
          {/* Charge-Fortschrittsbalken */}
          <ChargeProgressBar />
          
          {/* Glitch-Fortschrittsbalken */}
          <GlitchProgressBar />
        </div>
      </div>
    </>
  );
} 