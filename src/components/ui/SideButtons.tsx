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
  const { startPowerUp } = usePowerUpStore();
  
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
          text="free-power-up" 
          variant="free"
          onClick={() => startPowerUp()}
        />
      </div>
      
      {/* Rechte Buttons */}
      <div className={`fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 ${className}`}>
        <GlitchButton 
          text="paid-lvl" 
          variant="paid"
          onClick={() => console.log('paid-lvl clicked')}
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