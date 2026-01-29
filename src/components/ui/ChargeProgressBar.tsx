"use client";

/**
 * ChargeProgressBar Component - Progress bar only, no buttons
 *
 * Displays charge progress with level indicator from contract data.
 */
import React from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useSwordEvolution } from '@/hooks/useSwordEvolution';

interface ChargeProgressBarProps {
  className?: string;
}

export default function ChargeProgressBar({ className = '' }: ChargeProgressBarProps) {
  const {
    chargeProgress: localProgress,
    isChargeComplete,
    chargeLevel: localLevel,
    maxChargeLevel: maxLevel
  } = usePowerUpStore();

  const { calculatedLevels, isLoading } = useSwordEvolution();

  // Use contract data if available, fallback to local
  const level = calculatedLevels?.charge.level ?? localLevel;
  const progress = calculatedLevels?.charge.progress ?? localProgress;
  const isMaxLevel = level >= maxLevel;

  // Calculate tile colors based on progress
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;

    if (isMaxLevel) {
      return 'bg-yellow-500';
    } else if (tileProgress > progress) {
      return 'bg-gray-800';
    } else if (progress < 50) {
      return 'bg-yellow-300';
    } else if (progress < 90) {
      return 'bg-yellow-400';
    } else {
      return 'bg-yellow-500';
    }
  };

  // Generate progress tiles
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];

    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = isMaxLevel || tileProgress <= progress;

      tiles.push(
        <div
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
          style={{
            boxShadow: isActive && (isMaxLevel || progress >= 90) ? 'inset 0 0 3px rgba(255,255,0,0.8)' :
                      isActive && progress >= 50 ? 'inset 0 0 2px rgba(255,255,0,0.5)' :
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
        {/* Header "CHARGE" with level */}
        <div
          className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#F8E16C]"
          style={{
            textShadow: '0 0 1px #F8E16C',
            letterSpacing: '0.05em'
          }}
        >
          CHARGE - LVL {level}{isLoading && '...'}
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