"use client";

/**
 * SideButtons Component - Progress bars only, no manual buttons
 *
 * Displays Forge/Charge/Glitch progress bars without upgrade buttons.
 */
import React from 'react';
import ForgeProgressBar from './ForgeProgressBar';
import ChargeProgressBar from './ChargeProgressBar';
import GlitchProgressBar from './GlitchProgressBar';

interface SideButtonsProps {
  className?: string;
}

export default function SideButtons({ className = '' }: SideButtonsProps) {
  return (
    <div className={`flex flex-col ${className}`} style={{ width: '100%', maxWidth: '200px' }}>
      <div className="flex flex-col gap-4">
        <ForgeProgressBar />
        <ChargeProgressBar />
        <GlitchProgressBar />
      </div>
    </div>
  );
} 