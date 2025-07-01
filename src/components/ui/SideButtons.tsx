"use client";

/**
 * SideButtons Component
 * 
 * This component renders buttons on the left and right sides of the screen.
 */
import React from 'react';
import GlitchButton from './GlitchButton';

interface SideButtonsProps {
  className?: string;
}

export default function SideButtons({ className = '' }: SideButtonsProps) {
  return (
    <>
      {/* Linke Buttons */}
      <div className={`fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 ${className}`}>
        <GlitchButton 
          text="free-flash" 
          variant="free"
          onClick={() => console.log('free-flash clicked')}
        />
        <GlitchButton 
          text="free-power-up" 
          variant="free"
          onClick={() => console.log('free-power-up clicked')}
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