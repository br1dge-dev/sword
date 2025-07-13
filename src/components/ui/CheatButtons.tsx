"use client";

/**
 * CheatButtons Component
 * 
 * Zeigt Buttons für direkte Level-Ups der Power-Ups an (nur für Entwicklung).
 */
import React, { useState } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface CheatButtonsProps {
  className?: string;
}

export default function CheatButtons({ className = '' }: CheatButtonsProps) {
  const { 
    cheatForgeLevel, 
    cheatChargeLevel, 
    cheatGlitchLevel,
    currentLevel,
    chargeLevel,
    glitchLevel,
    maxLevel,
    maxChargeLevel,
    maxGlitchLevel
  } = usePowerUpStore();
  
  const [forgeButtonPressed, setForgeButtonPressed] = useState(false);
  const [chargeButtonPressed, setChargeButtonPressed] = useState(false);
  const [glitchButtonPressed, setGlitchButtonPressed] = useState(false);
  
  const isForgeMax = currentLevel >= maxLevel;
  const isChargeMax = chargeLevel >= maxChargeLevel;
  const isGlitchMax = glitchLevel >= maxGlitchLevel;
  
  // Forge Cheat-Button-Handler
  const handleForgeCheat = () => {
    if (isForgeMax || forgeButtonPressed) return;
    
    setForgeButtonPressed(true);
    cheatForgeLevel();
    
    setTimeout(() => {
      setForgeButtonPressed(false);
    }, 300);
  };
  
  // Charge Cheat-Button-Handler
  const handleChargeCheat = () => {
    if (isChargeMax || chargeButtonPressed) return;
    
    setChargeButtonPressed(true);
    cheatChargeLevel();
    
    setTimeout(() => {
      setChargeButtonPressed(false);
    }, 300);
  };
  
  // Glitch Cheat-Button-Handler
  const handleGlitchCheat = () => {
    if (isGlitchMax || glitchButtonPressed) return;
    
    setGlitchButtonPressed(true);
    cheatGlitchLevel();
    
    setTimeout(() => {
      setGlitchButtonPressed(false);
    }, 300);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Überschrift "CHEAT" */}
      <div className="mb-2 text-xs font-bold font-press-start-2p text-left text-red-500" 
           style={{ 
             textShadow: '0 0 1px #ff0000',
             letterSpacing: '0.05em'
           }}>
        CHEAT MODE
      </div>
      
      <div className="flex gap-2">
        {/* Forge Cheat-Button */}
        <button
          onClick={handleForgeCheat}
          disabled={isForgeMax || forgeButtonPressed}
          className={`w-6 h-6 flex items-center justify-center 
                     border border-gray-700 bg-gray-800 
                     ${forgeButtonPressed ? 'bg-orange-900' : 'hover:border-orange-500'} 
                     ${isForgeMax ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,165,0,0.3)',
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px'
          }}
          title={`Forge Level ${currentLevel} → ${Math.min(currentLevel + 1, maxLevel)}`}
        >
          <div className="text-xs font-bold text-orange-400">F</div>
        </button>
        
        {/* Charge Cheat-Button */}
        <button
          onClick={handleChargeCheat}
          disabled={isChargeMax || chargeButtonPressed}
          className={`w-6 h-6 flex items-center justify-center 
                     border border-gray-700 bg-gray-800 
                     ${chargeButtonPressed ? 'bg-yellow-900' : 'hover:border-yellow-500'} 
                     ${isChargeMax ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,255,0,0.3)',
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px'
          }}
          title={`Charge Level ${chargeLevel} → ${Math.min(chargeLevel + 1, maxChargeLevel)}`}
        >
          <div className="text-xs font-bold text-yellow-400">C</div>
        </button>
        
        {/* Glitch Cheat-Button */}
        <button
          onClick={handleGlitchCheat}
          disabled={isGlitchMax || glitchButtonPressed}
          className={`w-6 h-6 flex items-center justify-center 
                     border border-gray-700 bg-gray-800 
                     ${glitchButtonPressed ? 'bg-pink-900' : 'hover:border-pink-500'} 
                     ${isGlitchMax ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,0,255,0.3)',
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '4px 4px'
          }}
          title={`Glitch Level ${glitchLevel} → ${Math.min(glitchLevel + 1, maxGlitchLevel)}`}
        >
          <div className="text-xs font-bold text-pink-400">G</div>
        </button>
      </div>
    </div>
  );
} 