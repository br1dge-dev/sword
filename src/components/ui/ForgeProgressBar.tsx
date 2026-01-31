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
    maxLevel,
    isClaimPending,
    pendingAspect
  } = usePowerUpStore();

  const { aspectLevels, isLoading } = useSwordEvolutionV2();
  
  // Check if this aspect is pending a claim
  const isThisAspectPending = isClaimPending && pendingAspect === 'forge';
  const prevProgressRef = useRef<number>(0);
  const [animatingTiles, setAnimatingTiles] = React.useState<Set<number>>(new Set());

  // Use contract data if available, fallback to local
  const level = aspectLevels?.forge.level ?? localLevel;
  // Use local store progress (synced from contract and scaled 0-100)
  const progress = localProgress;
  const isMaxLevel = level >= maxLevel;

  // Detect progress changes and trigger level-up animation
  const [showLevelUp, setShowLevelUp] = React.useState(false);
  
  useEffect(() => {
    if (progress > prevProgressRef.current && prevProgressRef.current > 0) {
      // Level up detected!
      setShowLevelUp(true);
      
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
      }
      
      // Clear animations after 3 seconds
      const timeout = setTimeout(() => {
        setAnimatingTiles(new Set());
        setShowLevelUp(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
    
    prevProgressRef.current = progress;
  }, [progress]);

  // Calculate tile colors based on progress - returns background color string
  const getTileColor = (index: number, totalTiles: number): string => {
    const tileProgress = (index + 1) / totalTiles * 100;

    if (isMaxLevel) {
      return '#34d399'; // emerald-400
    } else if (tileProgress > progress) {
      return '#1f2937'; // gray-800
    } else if (progress < 30) {
      return '#22d3ee'; // cyan-400
    } else if (progress < 60) {
      return '#facc15'; // yellow-400
    } else if (progress < 90) {
      return '#fb923c'; // orange-400
    } else {
      return '#f472b6'; // pink-400
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
          className={`h-full w-[10%] border-r border-gray-900 last:border-r-0 transition-all duration-300 ${isAnimating ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: getTileColor(i, totalTiles),
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
          className="mb-1 text-xs font-bold font-press-start-2p text-left text-emerald-400"
          style={{
            textShadow: '0 0 1px #34d399',
            letterSpacing: '0.05em'
          }}
        >
          FORGE - LVL {level}{isLoading && '...'}
        </div>

        <div className="flex items-center gap-2">
          {/* Progress bar with 10 tiles */}
          <div
            className={`relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex ${isMaxLevel ? 'max-level-shine' : ''} ${isThisAspectPending ? 'pending-pulse' : ''}`}
            style={{
              boxShadow: isThisAspectPending 
                ? 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,252,166,0.8), 0 0 16px rgba(0,252,166,0.4)'
                : 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
              imageRendering: 'pixelated'
            }}
          >
            {renderProgressTiles()}

            {/* MAX text at max level */}
            {isMaxLevel && (
              <div className="max-level-text text-emerald-400">MAX</div>
            )}
            
            {/* Pending indicator overlay */}
            {isThisAspectPending && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-[scan_1.5s_linear_infinite]" />
            )}
            
            {/* Level Up animation overlay */}
            {showLevelUp && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-400/30 animate-pulse">
                <span className="text-[10px] font-bold text-emerald-400 font-press-start-2p animate-bounce">
                  +0.1!
                </span>
              </div>
            )}
          </div>
          
          {/* Pending text indicator */}
          {isThisAspectPending && (
            <span className="text-[8px] font-mono text-emerald-400 animate-pulse">
              pending...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
