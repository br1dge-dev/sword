"use client";

/**
 * ForgeProgressBar Component - Progress bar only, no buttons
 *
 * Displays forge progress with level indicator.
 */
import React from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface ForgeProgressBarProps {
  className?: string;
}

export default function ForgeProgressBar({ className = '' }: ForgeProgressBarProps) {
  const {
    forgeProgress,
    isForgeComplete,
    currentLevel,
    maxLevel
  } = usePowerUpStore();

  const isMaxLevel = currentLevel >= maxLevel;

  // Calculate tile colors based on progress
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;

    if (isMaxLevel) {
      return 'bg-orange-500';
    } else if (tileProgress > forgeProgress) {
      return 'bg-gray-800';
    } else if (forgeProgress < 50) {
      return 'bg-gray-400';
    } else if (forgeProgress < 90) {
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
      const isActive = isMaxLevel || tileProgress <= forgeProgress;

      tiles.push(
        <div
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive && (isMaxLevel || forgeProgress >= 90) ? 'inset 0 0 3px rgba(255,165,0,0.8)' :
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
        {/* Header "FORGE" with level */}
        <div
          className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#00FCA6]"
          style={{
            textShadow: '0 0 1px #00FCA6',
            letterSpacing: '0.05em'
          }}
        >
          FORGE - LVL {currentLevel}
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