"use client";

/**
 * ForgeProgressBar Component
 * 
 * Zeigt das FORGE-Level an. Bei verbundenem Wallet wird das Level aus dem Contract gelesen,
 * ansonsten aus dem lokalen Store (Demo-Modus).
 */
import React from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useWalletStatus, useUserState, useGlobalState } from '@/hooks/useContract';

interface ForgeProgressBarProps {
  className?: string;
}

export default function ForgeProgressBar({ className = '' }: ForgeProgressBarProps) {
  // Local store (fallback/demo mode)
  const { currentLevel: localLevel } = usePowerUpStore();
  
  // Contract state
  const { isConnected } = useWalletStatus();
  const { levelForge: contractLevel, isLoading } = useUserState();
  const { activeAspect } = useGlobalState();
  
  // Use contract level if connected, otherwise local
  const displayLevel = isConnected ? contractLevel : localLevel;
  const isActiveAspect = isConnected && activeAspect === 'FORGE';
  
  // Convert level (1.0-3.0) to progress (0-100%)
  // Level 1.0 = 0%, Level 2.0 = 50%, Level 3.0 = 100%
  const levelProgress = ((displayLevel - 1) / 2) * 100;
  const isMaxLevel = displayLevel >= 3.0;
  
  // Berechne Farben für die Progress-Bar-Tiles
  const getTileColor = (index: number, totalTiles: number) => {
    const tileThreshold = (index / totalTiles) * 100;
    
    if (isMaxLevel) {
      return 'bg-orange-500'; // Alle Tiles sind glühend im MAX-Level
    } else if (tileThreshold >= levelProgress) {
      return 'bg-gray-800'; // Leere Tiles
    } else if (levelProgress < 25) {
      return 'bg-gray-400'; // Kaltes Metall (Level 1.0-1.5)
    } else if (levelProgress < 75) {
      return 'bg-yellow-600'; // Erwärmendes Metall (Level 1.5-2.5)
    } else {
      return 'bg-orange-500'; // Glühendes Metall (Level 2.5-3.0)
    }
  };
  
  // Generiere die Progress-Bar-Tiles
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];
    
    for (let i = 0; i < totalTiles; i++) {
      const tileThreshold = (i / totalTiles) * 100;
      const isActive = isMaxLevel || tileThreshold < levelProgress;
      
      tiles.push(
        <div 
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0 transition-all duration-300`}
          style={{
            boxShadow: isActive && (isMaxLevel || levelProgress >= 75) ? 'inset 0 0 3px rgba(255,165,0,0.8)' : 
                      isActive && levelProgress >= 25 ? 'inset 0 0 2px rgba(255,255,0,0.5)' : 
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
        {/* Überschrift "FORGE" mit Level-Anzeige */}
        <div className="mb-1 text-xs font-bold font-press-start-2p text-left flex items-center gap-2" 
             style={{ 
               color: isActiveAspect ? '#00FCA6' : '#F8E16C',
               textShadow: isActiveAspect ? '0 0 8px #00FCA6' : '0 0 1px #F8E16C',
               letterSpacing: '0.05em'
             }}>
          <span>FORGE</span>
          {isLoading ? (
            <span className="text-gray-500">...</span>
          ) : (
            <span>LVL {Math.floor(displayLevel)}</span>
          )}
        </div>
        
        {/* Fortschrittsbalken */}
        <div className={`relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex
                       ${isMaxLevel ? 'max-level-shine' : ''}`}
             style={{ 
               boxShadow: isActiveAspect ? '0 0 8px rgba(0,252,166,0.4)' : 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          {renderProgressTiles()}
          
          {/* MAX-Text bei maximalem Level */}
          {isMaxLevel && (
            <div className="max-level-text text-[#00FCA6]">MAX</div>
          )}
        </div>
      </div>
    </div>
  );
}
