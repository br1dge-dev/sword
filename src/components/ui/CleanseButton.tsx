"use client";

/**
 * CleanseButton Component
 * 
 * Ein Button im Stil der Fortschrittsbalken, der alle Fortschritte zurücksetzt
 * und den Invertierungseffekt auslöst.
 */
import React, { useState } from 'react';

interface CleanseButtonProps {
  onClick: () => void;
  className?: string;
  cooldown?: number; // Cooldown-Zeit in ms
}

export default function CleanseButton({ 
  onClick, 
  className = '',
  cooldown = 1500 // Standard-Cooldown: 1.5 Sekunden
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

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-col">
        {/* Überschrift "CLEANSE" im Pixel-Font-Stil, linksbündig */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#3EE6FF]" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          CLEANSE
        </div>
        
        <div className="flex items-center">
          {/* Cleanse-Button im Stil der Fortschrittsbalken */}
          <button
            onClick={handleClick}
            disabled={buttonCooldown}
            className={`h-6 w-32 flex items-center justify-center 
                      border border-gray-700 bg-gray-900
                      ${buttonCooldown ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#3EE6FF]'}`}
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
              imageRendering: 'pixelated'
            }}
          >
            {/* Text im Inneren */}
            <span className="text-xs font-press-start-2p text-[#3EE6FF]">
              NOW
            </span>
            
            {/* Cooldown-Overlay */}
            {buttonCooldown && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-[#3EE6FF] bg-opacity-70"
                style={{
                  width: '100%',
                  animation: `cooldown ${cooldown}ms linear forwards`,
                  boxShadow: '0 0 5px #3EE6FF'
                }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 