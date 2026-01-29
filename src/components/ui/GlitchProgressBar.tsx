"use client";

/**
 * GlitchProgressBar Component - Progress bar only, no buttons
 *
 * Displays glitch progress with level indicator.
 */
import React from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface GlitchProgressBarProps {
  className?: string;
}

export default function GlitchProgressBar({ className = '' }: GlitchProgressBarProps) {
  const {
    glitchProgress,
    isGlitchComplete,
    glitchLevel,
    maxGlitchLevel
  } = usePowerUpStore();

  const isMaxLevel = glitchLevel >= maxGlitchLevel;

  // Calculate tile colors based on progress
  const getTileColor = (index: number, totalTiles: number) => {
    const tileProgress = (index + 1) / totalTiles * 100;

    if (isMaxLevel) {
      return 'bg-pink-500';
    } else if (tileProgress > glitchProgress) {
      return 'bg-gray-800';
    } else if (glitchProgress < 50) {
      return 'bg-pink-300';
    } else if (glitchProgress < 90) {
      return 'bg-pink-400';
    } else {
      return 'bg-pink-500';
    }
  };

  // Generate progress tiles
  const renderProgressTiles = () => {
    const totalTiles = 10;
    const tiles = [];

    for (let i = 0; i < totalTiles; i++) {
      const tileProgress = (i + 1) / totalTiles * 100;
      const isActive = isMaxLevel || tileProgress <= glitchProgress;

      tiles.push(
        <div
          key={i}
          className={`h-full w-[10%] ${getTileColor(i, totalTiles)} border-r border-gray-900 last:border-r-0`}
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
        {/* Header "GLITCH" with level */}
        <div
          className="mb-1 text-xs font-bold font-press-start-2p text-left text-[#FF3EC8]"
          style={{
            textShadow: '0 0 1px #FF3EC8',
            letterSpacing: '0.05em'
          }}
        >
          GLITCH - LVL {glitchLevel}
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