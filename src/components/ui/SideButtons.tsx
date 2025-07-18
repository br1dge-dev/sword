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
import CheatButtons from './CheatButtons';
import { usePowerUpStore } from '@/store/powerUpStore';
import { FaBroom } from 'react-icons/fa';

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
      // DEAKTIVIERT: Logging
      // console.error("Fehler beim Ausführen der Cleanse-Aktion:", error);
      
      // Bei zu vielen Fehlern alle Effekte zurücksetzen
      setErrorCount(prev => {
        if (prev > 3) {
          // DEAKTIVIERT: Logging
          // console.warn("Zu viele Fehler aufgetreten, setze alle Effekte zurück");
          try {
            // Reset aller Effekte
            resetAllEffects();
          } catch (e) {
            // DEAKTIVIERT: Logging
            // console.error("Fehler beim Zurücksetzen der Effekte:", e);
          }
          return 0;
        }
        return prev + 1;
      });
    }
  }, [resetAllEffects]);
  
  // Fehlerbehandlung
  const handleError = useCallback(() => {
    setErrorCount(prev => {
      // Bei zu vielen Fehlern alle Effekte zurücksetzen
      if (prev >= 3) {
        // DEAKTIVIERT: Logging
        // console.warn("Zu viele Fehler aufgetreten, setze alle Effekte zurück");
        try {
          resetAllEffects();
        } catch (e) {
          // DEAKTIVIERT: Logging
          // console.error("Fehler beim Zurücksetzen der Effekte:", e);
        }
        return 0;
      }
      return prev + 1;
    });
  }, [resetAllEffects]);
  
  return (
    <div className={`flex flex-col ${className}`} style={{ width: '100%', maxWidth: '200px' }}>
      {/* Cheat-Buttons + Cleanse-Besen in einer Zeile */}
      <div className="flex flex-row gap-2 items-center mb-4">
        <CheatButtons appendRight={<CleanseButton onClick={handleCleanse} cooldown={3000} iconOnly />} />
      </div>
      <div className="flex flex-col gap-4 mt-4">
        <ForgeProgressBar />
        <ChargeProgressBar />
        <GlitchProgressBar />
      </div>
    </div>
  );
} 