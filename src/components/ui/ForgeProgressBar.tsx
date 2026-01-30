"use client";

/**
 * ForgeProgressBar Component - Progress bar only, no buttons
 *
 * Displays forge progress with level indicator from contract data.
 */
import React, { useEffect, useRef } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useSwordEvolutionV2 } from '@/hooks/useSwordEvolutionV2';

interface ForgeProgressBarProps {
  className?: string;
}

export default function ForgeProgressBar({ className = '' }: ForgeProgressBarProps) {
  const {
    forgeProgress: localProgress,
    isForgeComplete,
    currentLevel: localLevel,
    maxLevel
  } = usePowerUpStore();

  const { aspectLevels, isLoading } = useSwordEvolutionV2();
  const prevProgressRef = useRef<number>(0);
  const [animatingTiles, setAnimatingTiles] = React.useState<Set<number>>(new Set());

  // Use contract data if available, fallback to local
  const level = aspectLevels?.forge.level ?? localLevel;
  const progress = aspectLevels?.forge.progress ?? localProgress;
  const isMaxLevel = level >= maxLevel;

  // Detect progress changes and trigger animation
  useEffect(() => {
    if (progress > prevProgressRef.current) {
      const prevValue = prevProgressRef.current;
      const newValue = progress;
      
      // Find which tiles are newly activated
      const totalTiles = 10;
      const newlyActiveTiles = new Set<number>();
      
      for (let i = 0; i < totalTiles; i++) {
        const tileProgress = (i + 1) / totalTiles * 100;
        const wasActive = tileProgress <= prevValue;
        const isNowActive = tileProgress <= newValue;
        
        if (!wasActive && isNowActive) {
          newlyActiveTiles.add(i);
        }
      }
      
      if (newlyActiveTiles.size > 0) {
        setAnimatingTiles(new Set(newlyActiveTiles));
        
        // Clear animation after 1.5 seconds
        const timeout = setTimeout(() => {
          setAnimatingTiles(new Set());
        }, 1500);
        
        return () => clearTimeout(timeout);
      }
    }
    
    prevProgressRef.current = progress;
  }, [progress]);

  // Calculate tile colors based on progress
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;

    if (isMaxLevel) {
      return 'bg-orange-500';
    } else if (tileProgress > progress) {
      return 'bg-gray-800';
    } else if (progress < 50) {
      return 'bg-gray-400';
    } else if (progress < 90) {
      return 'bg-yellow-600';
    } else {
      return 'bg-orange-500';
    }
  };

  // Generate progress tiles
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];

    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = isMaxLevel || tileProgress <= progress;
      const isAnimating = animatingTiles.has(i);

      tiles.push(
        <div
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0 transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: isActive && (isMaxLevel || progress >= 90) ? 'inset 0 0 3px rgba(255,165,0,0.8)' :
                      isActive && progress >= 50 ? 'inset 0 0 2px rgba(255,255,0,0.5)' :
                      'none',
            filter: isAnimating ? 'brightness(1.5)' : 'none',
          }}
        />
      );
    }

    return tiles;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-col">
        {/* Header "FORGE" with level */}
        <div
          className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#00FCA6]"
          style={{
            textShadow: '0 0 1px #00FCA6',
            letterSpacing: '0.05em'
          }}
        >
          FORGE - LVL {level}{isLoading && '...'}
        </div>

        <div className="flex items-center gap-2">
          {/* Progress bar with 10 tiles */}
          <div
            className={`relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex ${isMaxLevel ? 'max-level-shine' : ''}`}
            style={{
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
              imageRendering: 'pixelated'
            }}
          >
            {renderProgressTiles()}

            {/* MAX text at max level */}
            {isMaxLevel && (
              <div className="max-level-text text-[#00FCA6]">MAX</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
