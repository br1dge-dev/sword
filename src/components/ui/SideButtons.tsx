"use client";

/**
 * SideButtons Component
 * 
 * This component renders the level progress bars on the side of the screen.
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
