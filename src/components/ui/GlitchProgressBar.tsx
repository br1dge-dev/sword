"use client";

/**
 * GlitchProgressBar Component
 * 
 * Zeigt einen Fortschrittsbalken für den Glitch-Prozess an, mit Glitch- und Upgrade-Buttons.
 */
import React, { useState } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface GlitchProgressBarProps {
  className?: string;
}

export default function GlitchProgressBar({ className = '' }: GlitchProgressBarProps) {
  const { 
    glitchProgress, 
    isGlitchComplete, 
    increaseGlitchProgress, 
    increaseGlitchLevel, 
    glitchLevel,
    maxGlitchLevel
  } = usePowerUpStore();
  
  const [glitchButtonCooldown, setGlitchButtonCooldown] = useState(false);
  const [upgradeButtonPressed, setUpgradeButtonPressed] = useState(false);
  
  const isMaxLevel = glitchLevel >= maxGlitchLevel;
  
  // Glitch-Button-Handler
  const handleGlitchClick = () => {
    if (glitchButtonCooldown || isGlitchComplete || isMaxLevel) return;
    
    increaseGlitchProgress();
    setGlitchButtonCooldown(true);
    
    // Cooldown für den Glitch-Button
    setTimeout(() => {
      setGlitchButtonCooldown(false);
    }, 500);
  };
  
  // Upgrade-Button-Handler
  const handleUpgradeClick = () => {
    if (!isGlitchComplete || upgradeButtonPressed) return;
    
    setUpgradeButtonPressed(true);
    
    // Visueller Effekt beim Klicken
    setTimeout(() => {
      increaseGlitchLevel();
      setUpgradeButtonPressed(false);
    }, 300);
  };
  
  // Berechne Farben für die Progress-Bar-Tiles basierend auf dem Fortschritt
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;
    
    if (isMaxLevel) {
      // Bei MAX-Level einheitliche Farbe mit gelegentlichen Glitch-Effekten
      return 'bg-pink-500';
    } else if (tileProgress > glitchProgress) {
      return 'bg-gray-800'; // Leere Tiles
    } else if (glitchProgress < 50) {
      return 'bg-pink-300'; // Blasses Pink
    } else if (glitchProgress < 90) {
      return 'bg-pink-400'; // Mittleres Pink
    } else {
      return 'bg-pink-500'; // Tiefes Pink
    }
  };
  
  // Generiere die Progress-Bar-Tiles
  const renderProgressTiles = () => {
    const totalTiles = 10; // Genau 10 Tiles
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = isMaxLevel || tileProgress <= glitchProgress;
      
      // Zufällige Glitch-Effekte für aktive Tiles, aber weniger häufig im MAX-Level
      const isGlitching = isActive && (!isMaxLevel ? Math.random() > 0.85 : Math.random() > 0.7);
      const glitchColor = Math.random() > 0.5 ? 'bg-green-400' : 'bg-pink-400';
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${isGlitching ? glitchColor : getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive && (isMaxLevel || glitchProgress >= 90) ? 'inset 0 0 3px rgba(255,0,255,0.8)' : 
                      isActive && glitchProgress >= 50 ? 'inset 0 0 2px rgba(255,0,255,0.5)' : 
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
        {/* Überschrift "GLITCH" im Pixel-Font-Stil, linksbündig */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#FF3EC8]" 
             style={{ 
               textShadow: '0 0 1px #FF3EC8',
               letterSpacing: '0.05em'
             }}>
          GLITCH
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
              <div className="max-level-text text-[#FF3EC8]">MAX</div>
            )}
          </div>
          
          {/* Glitch-Button */}
          <button
            onClick={handleGlitchClick}
            disabled={glitchButtonCooldown || isGlitchComplete || isMaxLevel}
            className={`w-6 h-6 flex items-center justify-center 
                       border border-gray-700 bg-gray-800 
                       ${glitchButtonCooldown ? 'opacity-50' : 'hover:border-pink-400'} 
                       ${isGlitchComplete || isMaxLevel ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,0,255,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            {/* Glitch-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Glitch-Symbol */}
              <div className="absolute top-0 left-0 w-1 h-1 bg-pink-400"></div>
              <div className="absolute top-0 left-2 w-1 h-1 bg-green-400"></div>
              <div className="absolute top-1 left-1 w-1 h-1 bg-pink-500"></div>
              <div className="absolute top-2 left-0 w-1 h-1 bg-green-400"></div>
              <div className="absolute top-2 left-2 w-1 h-1 bg-pink-400"></div>
              {/* Glüheffekt */}
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(255,0,255,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
          
          {/* Upgrade-Button */}
          <button
            onClick={handleUpgradeClick}
            disabled={!isGlitchComplete}
            className={`w-6 h-6 flex items-center justify-center 
                       border ${isGlitchComplete ? 'border-green-700' : 'border-gray-700'} 
                       ${upgradeButtonPressed ? 'bg-green-900' : 'bg-gray-800'} 
                       ${isGlitchComplete ? 'hover:border-green-500' : 'opacity-50 cursor-not-allowed'}`}
            style={{ 
              boxShadow: isGlitchComplete ? 
                'inset 0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(0,255,170,0.5)' : 
                'inset 0 0 3px rgba(0,0,0,0.8)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Upgrade-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Pfeil nach oben */}
              <div className="absolute top-0 left-1 w-1 h-1 bg-green-400"></div>
              <div className="absolute top-1 left-0 w-1 h-1 bg-green-400"></div>
              <div className="absolute top-1 left-1 w-1 h-1 bg-green-500"></div>
              <div className="absolute top-1 left-2 w-1 h-1 bg-green-400"></div>
              <div className="absolute top-2 left-1 w-1 h-1 bg-green-400"></div>
              {/* Glüheffekt wenn aktiviert */}
              {isGlitchComplete && (
                <div className="absolute inset-0 opacity-70"
                     style={{ 
                       boxShadow: '0 0 3px rgba(0,255,170,0.8)',
                       animation: 'pulse 2s infinite alternate'
                     }}>
                </div>
              )}
            </div>
          </button>
        </div>
        
        {/* Level-Anzeige */}
        <div className="mt-1 text-[10px] text-left opacity-80 font-mono text-[#FF3EC8]">
          LVL {glitchLevel}/{maxGlitchLevel}
        </div>
      </div>
    </div>
  );
} 