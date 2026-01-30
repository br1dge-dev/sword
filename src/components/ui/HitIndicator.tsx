/**
 * HitIndicator - Optimized visual indicator for upcoming beats
 *
 * Uses direct DOM manipulation via requestAnimationFrame for 60fps performance
 * instead of React state updates which cause excessive re-renders.
 * Global click handler triggers hit effect regardless of cursor position.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface HitIndicatorProps {
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
  lookaheadMs = 2000,
  isActive,
  onHit,
  lastHitResult,
}: HitIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Flash feedback on hit/miss
  useEffect(() => {
    if (lastHitResult && flashRef.current) {
      const color = lastHitResult.hit ? '#00FCA6' : '#FF3EC8';
      flashRef.current.style.background = `radial-gradient(ellipse at center, ${color}40 0%, transparent 70%)`;
      flashRef.current.style.borderTop = `2px solid ${color}`;
      flashRef.current.style.boxShadow = `0 0 20px ${color}80, inset 0 0 15px ${color}40`;

      const timer = setTimeout(() => {
        if (flashRef.current) {
          flashRef.current.style.background = 'radial-gradient(ellipse at center, rgba(0, 252, 166, 0.2) 0%, transparent 70%)';
          flashRef.current.style.borderTop = '2px solid rgba(0, 252, 166, 0.5)';
          flashRef.current.style.boxShadow = '0 0 10px rgba(0, 252, 166, 0.3)';
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitResult]);

  // Global click handler - triggers hit effect anywhere on screen
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalClick = () => {
      if (onHit) {
        onHit();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('touchstart', handleGlobalClick);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [isActive, onHit]);

  // Animation loop - uses direct DOM manipulation for performance
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    const animate = (timestamp: number) => {
      // Throttle to ~60fps
      if (timestamp - lastTimeRef.current < 16) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = timestamp;

      // Get upcoming beats from global store via custom event
      const event = new CustomEvent('getUpcomingBeats');
      const result = window.dispatchEvent(event);
      // The result is set via a global variable for performance
      const upcomingBeats = (window as any).upcomingBeats || [];

      // Update dot positions directly
      dotsRef.current.forEach((dot, index) => {
        if (index < upcomingBeats.length) {
          const timeUntil = upcomingBeats[index];
          const progress = 1 - (timeUntil / lookaheadMs);
          const easedProgress = progress * progress;
          const position = easedProgress * (TRACK_HEIGHT - HIT_ZONE_HEIGHT);
          const opacity = 0.3 + (progress * 0.7);
          const scale = 0.7 + (progress * 0.3);

          dot.style.display = 'block';
          dot.style.transform = `translateX(-50%) scale(${scale})`;
          dot.style.top = `${position}px`;
          dot.style.opacity = String(opacity);
          dot.style.boxShadow = `0 0 ${8 * scale}px rgba(0, 252, 166, ${GLOW_INTENSITY * opacity})`;
        } else {
          dot.style.display = 'none';
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [isActive, lookaheadMs]);

  // Pre-create dots (max 10 for performance)
  const maxDots = 10;
  const dots = Array.from({ length: maxDots }, (_, i) => i);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="fixed right-8 top-1/2 -translate-y-1/2 z-20 select-none"
      style={{
        width: 60,
        height: TRACK_HEIGHT,
      }}
    >
      {/* Track background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 252, 166, 0.05) 0%, rgba(0, 252, 166, 0.1) 100%)',
          border: '1px solid rgba(0, 252, 166, 0.2)',
        }}
      />

      {/* Hit zone at bottom */}
      <div
        ref={flashRef}
        className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-100"
        style={{
          height: HIT_ZONE_HEIGHT,
          background: 'radial-gradient(ellipse at center, rgba(0, 252, 166, 0.2) 0%, transparent 70%)',
          borderTop: '2px solid rgba(0, 252, 166, 0.5)',
          boxShadow: '0 0 10px rgba(0, 252, 166, 0.3)',
        }}
      >
        {/* Hit zone label */}
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-mono"
          style={{
            color: 'rgba(0, 252, 166, 0.6)',
          }}
        >
          HIT
        </div>
      </div>

      {/* Pre-rendered dots (hidden by default) - centered with transform */}
      {dots.map((_, index) => (
        <div
          key={`dot-${index}`}
          ref={(el) => {
            if (el) dotsRef.current[index] = el;
          }}
          className="absolute rounded-full"
          style={{
            display: 'none',
            width: DOT_SIZE,
            height: DOT_SIZE,
            background: 'radial-gradient(circle, #00FCA6 0%, #00FCA6 100%)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      ))}

      {/* Center line guide */}
      <div
        className="absolute w-px"
        style={{
          left: '50%',
          marginLeft: -0.5,
          top: 0,
          bottom: HIT_ZONE_HEIGHT,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 252, 166, 0.3) 100%)',
        }}
      />

      {/* Tap hint */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap"
        style={{ color: 'rgba(0, 252, 166, 0.4)' }}
      >
        TAP
      </div>
    </div>
  );
}

export default HitIndicator;