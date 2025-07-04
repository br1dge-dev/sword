"use client";

/**
 * ChargeProgressBar Component
 * 
 * Zeigt einen Fortschrittsbalken für den Charge-Prozess an, mit Blitz- und Nuklear-Buttons.
 */
import React, { useState } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface ChargeProgressBarProps {
  className?: string;
}

export default function ChargeProgressBar({ className = '' }: ChargeProgressBarProps) {
  const { 
    chargeProgress, 
    isChargeComplete, 
    increaseChargeProgress, 
    increaseChargeLevel, 
    chargeLevel,
    maxChargeLevel
  } = usePowerUpStore();
  
  const [lightningButtonCooldown, setLightningButtonCooldown] = useState(false);
  const [nuclearButtonPressed, setNuclearButtonPressed] = useState(false);
  
  const isMaxLevel = chargeLevel >= maxChargeLevel;
  
  // Blitz-Button-Handler
  const handleLightningClick = () => {
    if (lightningButtonCooldown || isChargeComplete || isMaxLevel) return;
    
    increaseChargeProgress();
    setLightningButtonCooldown(true);
    
    // Cooldown für den Blitz-Button
    setTimeout(() => {
      setLightningButtonCooldown(false);
    }, 500);
  };
  
  // Nuklear-Button-Handler
  const handleNuclearClick = () => {
    if (!isChargeComplete || nuclearButtonPressed) return;
    
    setNuclearButtonPressed(true);
    
    // Visueller Effekt beim Klicken
    setTimeout(() => {
      increaseChargeLevel();
      setNuclearButtonPressed(false);
    }, 300);
  };
  
  // Berechne Farben für die Progress-Bar-Tiles basierend auf dem Fortschritt
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;
    
    if (isMaxLevel) {
      return 'bg-yellow-500'; // Alle Tiles sind gelb im MAX-Level
    } else if (tileProgress > chargeProgress) {
      return 'bg-gray-800'; // Leere Tiles
    } else if (chargeProgress < 50) {
      return 'bg-yellow-300'; // Blasses Gelb
    } else if (chargeProgress < 90) {
      return 'bg-yellow-400'; // Mittleres Gelb
    } else {
      return 'bg-yellow-500'; // Tiefes Gelb
    }
  };
  
  // Generiere die Progress-Bar-Tiles
  const renderProgressTiles = () => {
    const totalTiles = 10; // Genau 10 Tiles
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = isMaxLevel || tileProgress <= chargeProgress;
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive && (isMaxLevel || chargeProgress >= 90) ? 'inset 0 0 3px rgba(255,255,0,0.8)' : 
                      isActive && chargeProgress >= 50 ? 'inset 0 0 2px rgba(255,255,0,0.5)' : 
                      'none'
          }}
        />
      );
    }
    
    return tiles;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-col">
        {/* Überschrift "CHARGE" im Pixel-Font-Stil, linksbündig */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#F8E16C]" 
             style={{ 
               textShadow: '0 0 1px #F8E16C',
               letterSpacing: '0.05em'
             }}>
          CHARGE
        </div>
        
        <div className="flex items-center gap-2">
          {/* Fortschrittsbalken mit genau 10 Tiles */}
          <div className={`relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex
                         ${isMaxLevel ? 'max-level-shine' : ''}`}
               style={{ 
                 boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
                 imageRendering: 'pixelated'
               }}>
            {renderProgressTiles()}
            
            {/* MAX-Text bei maximalem Level */}
            {isMaxLevel && (
              <div className="max-level-text text-[#F8E16C]">MAX</div>
            )}
          </div>
          
          {/* Blitz-Button */}
          <button
            onClick={handleLightningClick}
            disabled={lightningButtonCooldown || isChargeComplete || isMaxLevel}
            className={`w-6 h-6 flex items-center justify-center 
                       border border-gray-700 bg-gray-800 
                       ${lightningButtonCooldown ? 'opacity-50' : 'hover:border-yellow-400'} 
                       ${isChargeComplete || isMaxLevel ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,255,0,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            {/* Blitz-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Blitz */}
              <div className="absolute top-0 left-1 w-1 h-1 bg-yellow-300"></div>
              <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-400"></div>
              <div className="absolute top-2 left-0 w-1 h-1 bg-yellow-400"></div>
              <div className="absolute top-2 left-1 w-1 h-1 bg-yellow-300"></div>
              {/* Glüheffekt */}
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(255,255,0,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
          
          {/* Nuklear-Button */}
          <button
            onClick={handleNuclearClick}
            disabled={!isChargeComplete}
            className={`w-6 h-6 flex items-center justify-center 
                       border ${isChargeComplete ? 'border-yellow-600' : 'border-gray-700'} 
                       ${nuclearButtonPressed ? 'bg-yellow-900' : 'bg-gray-800'} 
                       ${isChargeComplete ? 'hover:border-yellow-500' : 'opacity-50 cursor-not-allowed'}`}
            style={{ 
              boxShadow: isChargeComplete ? 
                'inset 0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(255,255,0,0.5)' : 
                'inset 0 0 3px rgba(0,0,0,0.8)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Nuklear-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Atom-Symbol */}
              <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-500"></div>
              <div className="absolute top-0 left-1 w-1 h-1 bg-yellow-400"></div>
              <div className="absolute top-1 left-0 w-1 h-1 bg-yellow-400"></div>
              <div className="absolute top-1 left-2 w-1 h-1 bg-yellow-400"></div>
              <div className="absolute top-2 left-1 w-1 h-1 bg-yellow-400"></div>
              {/* Glüheffekt wenn aktiviert */}
              {isChargeComplete && (
                <div className="absolute inset-0 opacity-70"
                     style={{ 
                       boxShadow: '0 0 3px rgba(255,255,0,0.8)',
                       animation: 'pulse 2s infinite alternate'
                     }}>
                </div>
              )}
            </div>
          </button>
        </div>
        
        {/* Level-Anzeige */}
        <div className="mt-1 text-[10px] text-left opacity-80 font-mono text-[#F8E16C]">
          LVL {chargeLevel}/{maxChargeLevel}
        </div>
      </div>
    </div>
  );
} 