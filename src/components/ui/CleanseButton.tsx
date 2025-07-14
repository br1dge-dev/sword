"use client";

/**
 * CleanseButton Component
 * 
 * Ein Button im Stil der Fortschrittsbalken, der alle Fortschritte zurücksetzt
 * und den Invertierungseffekt auslöst.
 */
import React, { useState } from 'react';
import { FaBroom } from 'react-icons/fa';

interface CleanseButtonProps {
  onClick: () => void;
  className?: string;
  cooldown?: number; // Cooldown-Zeit in ms
  iconOnly?: boolean;
}

export default function CleanseButton({ 
  onClick, 
  className = '',
  cooldown = 1500, // Standard-Cooldown: 1.5 Sekunden
  iconOnly = false
}: CleanseButtonProps) {
  const [buttonCooldown, setButtonCooldown] = useState(false);
  
  // Click-Handler mit Cooldown
  const handleClick = () => {
    if (buttonCooldown) return;
    
    onClick();
    setButtonCooldown(true);
    
    // Nach der Cooldown-Zeit zurücksetzen
    setTimeout(() => {
      setButtonCooldown(false);
    }, cooldown);
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        disabled={buttonCooldown}
        className={`w-6 h-6 flex items-center justify-center border border-gray-700 bg-gray-900 rounded hover:border-[#3EE6FF] ${buttonCooldown ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        style={{ boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(62,230,255,0.2)', imageRendering: 'pixelated' }}
        title="Cleanse"
      >
        <FaBroom className="text-[#3EE6FF] text-lg" />
      </button>
    );
  }

  // Standard-Button (nicht mehr benötigt, daher leer)
  return null;
} 