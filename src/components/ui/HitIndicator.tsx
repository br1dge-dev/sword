/**
 * HitIndicator - Visual indicator for upcoming beats during challenge
 * 
 * Displays a vertical track on the right side with dots falling down
 * representing upcoming beats. Dots accelerate as they approach the hit zone.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface HitIndicatorProps {
  /** Array of times until upcoming beats (in ms) */
  upcomingBeats: number[];
  /** Lookahead window in ms */
  lookaheadMs?: number;
  /** Whether challenge is active */
  isActive: boolean;
  /** Callback when user clicks/taps to hit */
  onHit?: () => void;
  /** Last hit result for feedback */
  lastHitResult?: { hit: boolean; delta: number } | null;
}

// Visual constants
const TRACK_HEIGHT = 300;
const HIT_ZONE_HEIGHT = 40;
const DOT_SIZE = 12;
const GLOW_INTENSITY = 0.8;

export function HitIndicator({
  upcomingBeats,
  lookaheadMs = 2000,
  isActive,
  onHit,
  lastHitResult,
}: HitIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  
  // Flash feedback on hit/miss
  useEffect(() => {
    if (lastHitResult) {
      const color = lastHitResult.hit ? '#00FCA6' : '#FF3EC8';
      setFlashColor(color);
      const timer = setTimeout(() => setFlashColor(null), 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitResult]);
  
  // Handle click/tap
  const handleClick = useCallback(() => {
    if (isActive && onHit) {
      onHit();
    }
  }, [isActive, onHit]);
  
  // Calculate dot position based on time until beat
  const getDotPosition = (timeUntil: number): number => {
    // Easing: dots accelerate as they approach
    const progress = 1 - (timeUntil / lookaheadMs);
    // Quadratic easing for acceleration effect
    const easedProgress = progress * progress;
    return easedProgress * (TRACK_HEIGHT - HIT_ZONE_HEIGHT);
  };
  
  // Get dot opacity based on position
  const getDotOpacity = (timeUntil: number): number => {
    const progress = 1 - (timeUntil / lookaheadMs);
    // Fade in as dots approach
    return 0.3 + (progress * 0.7);
  };
  
  // Get dot scale based on position
  const getDotScale = (timeUntil: number): number => {
    const progress = 1 - (timeUntil / lookaheadMs);
    // Grow slightly as dots approach
    return 0.7 + (progress * 0.3);
  };
  
  if (!isActive) return null;
  
  return (
    <div
      ref={containerRef}
      className="fixed right-8 top-1/2 -translate-y-1/2 z-20 cursor-pointer select-none"
      onClick={handleClick}
      style={{
        width: 60,
        height: TRACK_HEIGHT,
      }}
    >
      {/* Track background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(62, 230, 255, 0.05) 0%, rgba(62, 230, 255, 0.1) 100%)',
          border: '1px solid rgba(62, 230, 255, 0.2)',
        }}
      />
      
      {/* Hit zone at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-100"
        style={{
          height: HIT_ZONE_HEIGHT,
          background: flashColor 
            ? `radial-gradient(ellipse at center, ${flashColor}40 0%, transparent 70%)`
            : 'radial-gradient(ellipse at center, rgba(62, 230, 255, 0.2) 0%, transparent 70%)',
          borderTop: `2px solid ${flashColor || 'rgba(62, 230, 255, 0.5)'}`,
          boxShadow: flashColor 
            ? `0 0 20px ${flashColor}80, inset 0 0 15px ${flashColor}40`
            : '0 0 10px rgba(62, 230, 255, 0.3)',
        }}
      >
        {/* Hit zone label */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-xs font-mono"
          style={{ 
            color: flashColor || 'rgba(62, 230, 255, 0.6)',
            textShadow: flashColor ? `0 0 8px ${flashColor}` : 'none',
          }}
        >
          HIT
        </div>
      </div>
      
      {/* Falling dots */}
      {upcomingBeats.map((timeUntil, index) => {
        const position = getDotPosition(timeUntil);
        const opacity = getDotOpacity(timeUntil);
        const scale = getDotScale(timeUntil);
        
        return (
          <div
            key={`beat-${index}-${timeUntil}`}
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: DOT_SIZE * scale,
              height: DOT_SIZE * scale,
              top: position,
              opacity,
              background: 'radial-gradient(circle, #3EE6FF 0%, #00FCA6 100%)',
              boxShadow: `0 0 ${8 * scale}px rgba(62, 230, 255, ${GLOW_INTENSITY * opacity})`,
              transition: 'none', // No transition for smooth animation
            }}
          />
        );
      })}
      
      {/* Center line guide */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-px"
        style={{
          top: 0,
          bottom: HIT_ZONE_HEIGHT,
          background: 'linear-gradient(180deg, transparent 0%, rgba(62, 230, 255, 0.3) 100%)',
        }}
      />
      
      {/* Tap hint */}
      <div 
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap"
        style={{ color: 'rgba(62, 230, 255, 0.4)' }}
      >
        TAP
      </div>
    </div>
  );
}

export default HitIndicator;
