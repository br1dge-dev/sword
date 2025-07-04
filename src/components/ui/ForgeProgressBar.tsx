"use client";

/**
 * ForgeProgressBar Component
 * 
 * Zeigt einen Fortschrittsbalken für den Schmiedeprozess an, mit Feuer- und Hammer-Buttons.
 */
import React, { useState, useEffect } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface ForgeProgressBarProps {
  className?: string;
}

export default function ForgeProgressBar({ className = '' }: ForgeProgressBarProps) {
  const { 
    forgeProgress, 
    isForgeComplete, 
    increaseForgeProgress, 
    startPowerUp, 
    currentLevel 
  } = usePowerUpStore();
  
  const [fireButtonCooldown, setFireButtonCooldown] = useState(false);
  const [hammerButtonPressed, setHammerButtonPressed] = useState(false);
  
  // Feuer-Button-Handler
  const handleFireClick = () => {
    if (fireButtonCooldown || isForgeComplete) return;
    
    increaseForgeProgress();
    setFireButtonCooldown(true);
    
    // Cooldown für den Feuer-Button
    setTimeout(() => {
      setFireButtonCooldown(false);
    }, 500);
  };
  
  // Hammer-Button-Handler
  const handleHammerClick = () => {
    if (!isForgeComplete || hammerButtonPressed) return;
    
    setHammerButtonPressed(true);
    
    // Visueller Effekt beim Klicken
    setTimeout(() => {
      startPowerUp();
      setHammerButtonPressed(false);
    }, 300);
  };
  
  // Berechne Farben für die Progress-Bar-Tiles basierend auf dem Fortschritt
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;
    
    if (tileProgress > forgeProgress) {
      return 'bg-gray-800'; // Leere Tiles
    } else if (forgeProgress < 50) {
      return 'bg-gray-400'; // Kaltes Metall
    } else if (forgeProgress < 90) {
      return 'bg-yellow-600'; // Erwärmendes Metall
    } else {
      return 'bg-orange-500'; // Glühendes Metall
    }
  };
  
  // Generiere die Progress-Bar-Tiles
  const renderProgressTiles = () => {
    const totalTiles = 10; // Genau 10 Tiles
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = tileProgress <= forgeProgress;
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive && forgeProgress >= 90 ? 'inset 0 0 3px rgba(255,165,0,0.8)' : 
                      isActive && forgeProgress >= 50 ? 'inset 0 0 2px rgba(255,255,0,0.5)' : 
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
        {/* Überschrift "FORGE" im Pixel-Font-Stil, linksbündig */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#00FCA6]" 
             style={{ 
               textShadow: '0 0 1px #00FCA6',
               letterSpacing: '0.05em'
             }}>
          FORGE
        </div>
        
        <div className="flex items-center gap-2">
          {/* Fortschrittsbalken mit genau 10 Tiles */}
          <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex"
               style={{ 
                 boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
                 imageRendering: 'pixelated'
               }}>
            {renderProgressTiles()}
          </div>
          
          {/* Feuer-Button */}
          <button
            onClick={handleFireClick}
            disabled={fireButtonCooldown || isForgeComplete}
            className={`w-6 h-6 flex items-center justify-center 
                       border border-gray-700 bg-gray-800 
                       ${fireButtonCooldown ? 'opacity-50' : 'hover:border-orange-500'} 
                       ${isForgeComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(255,165,0,0.3)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px'
            }}
          >
            {/* Feuer-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Basis-Flamme */}
              <div className="absolute bottom-0 left-0 w-1 h-1 bg-orange-500"></div>
              <div className="absolute bottom-0 left-1 w-1 h-2 bg-orange-400"></div>
              <div className="absolute bottom-0 left-2 w-1 h-1 bg-orange-500"></div>
              <div className="absolute bottom-1 left-1 w-1 h-1 bg-yellow-400"></div>
              {/* Glüheffekt */}
              <div className="absolute inset-0 opacity-70"
                   style={{ 
                     boxShadow: '0 0 3px rgba(255,165,0,0.8)',
                     animation: 'pulse 1.5s infinite alternate'
                   }}>
              </div>
            </div>
          </button>
          
          {/* Hammer-Button */}
          <button
            onClick={handleHammerClick}
            disabled={!isForgeComplete}
            className={`w-6 h-6 flex items-center justify-center 
                       border ${isForgeComplete ? 'border-blue-700' : 'border-gray-700'} 
                       ${hammerButtonPressed ? 'bg-blue-900' : 'bg-gray-800'} 
                       ${isForgeComplete ? 'hover:border-blue-500' : 'opacity-50 cursor-not-allowed'}`}
            style={{ 
              boxShadow: isForgeComplete ? 
                'inset 0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(100,149,237,0.5)' : 
                'inset 0 0 3px rgba(0,0,0,0.8)',
              imageRendering: 'pixelated',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h2v2H0z'/%3E%3Cpath d='M2 2h2v2H2z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '4px 4px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Hammer-Icon (Pixel-Art-Stil) */}
            <div className="relative w-3 h-3">
              {/* Hammerkopf */}
              <div className="absolute top-0 left-0 w-2 h-1 bg-gray-400"></div>
              {/* Hammerstiel */}
              <div className="absolute top-1 left-1 w-1 h-2 bg-yellow-800"></div>
              {/* Glüheffekt wenn aktiviert */}
              {isForgeComplete && (
                <div className="absolute inset-0 opacity-70"
                     style={{ 
                       boxShadow: '0 0 3px rgba(100,149,237,0.8)',
                       animation: 'pulse 2s infinite alternate'
                     }}>
                </div>
              )}
            </div>
          </button>
        </div>
        
        {/* Level-Anzeige */}
        <div className="mt-1 text-[10px] text-left opacity-80 font-mono text-[#00FCA6]">
          LVL {currentLevel}/{usePowerUpStore.getState().maxLevel}
        </div>
      </div>
    </div>
  );
} 