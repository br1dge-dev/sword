"use client";

/**
 * SideButtons Component
 * 
 * This component renders buttons on the left and right sides of the screen.
 */
import React from 'react';
import GlitchButton from './GlitchButton';
import { useFlashStore } from '@/store/flashStore';
import { usePowerUpStore } from '@/store/powerUpStore';

interface SideButtonsProps {
  className?: string;
}

export default function SideButtons({ className = '' }: SideButtonsProps) {
  const { startFlash } = useFlashStore();
  const { currentLevel, startPowerUp, chargeLevel, increaseChargeLevel } = usePowerUpStore();
  
  // Bestimme den Text für den Power-Up-Button basierend auf dem aktuellen Level
  const getPowerUpText = () => {
    return `sword-lvl-${currentLevel}`;
  };
  
  // Bestimme den Text für den Charge-Button basierend auf dem aktuellen Charge-Level
  const getChargeText = () => {
    return `charge-lvl-${chargeLevel}`;
  };
  
  return (
    <>
      {/* Linke Buttons */}
      <div className={`fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 ${className}`}>
        <GlitchButton 
          text="free-flash" 
          variant="free"
          onClick={() => startFlash()}
        />
        <GlitchButton 
          text={getPowerUpText()} 
          variant="free"
          onClick={() => startPowerUp()}
        />
      </div>
      
      {/* Rechte Buttons */}
      <div className={`fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 ${className}`}>
        <GlitchButton 
          text={getChargeText()} 
          variant="paid"
          onClick={() => increaseChargeLevel()}
        />
        <GlitchButton 
          text="paid-invert" 
          variant="paid"
          onClick={() => console.log('paid-invert clicked')}
        />
      </div>
    </>
  );
} 