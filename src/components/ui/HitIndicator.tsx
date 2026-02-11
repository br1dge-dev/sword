/**
 * HitIndicator - ASCII/Unicode styled dual-lane beat indicator
 *
 * Two mirrored lanes where Unicode symbols fly in from both sides and meet at center.
 * Styled to match the ASCII pixel aesthetic of the sword visualization.
 * Uses direct DOM manipulation via requestAnimationFrame for 60fps performance.
 */
'use client';

import { useEffect, useRef } from 'react';

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

// ASCII/Unicode symbols for the indicator
const SYMBOLS = {
  dot: '◆',        // Diamond for approaching beats
  dotSmall: '◇',   // Small diamond for distant beats
  center: '◈',     // Double diamond for hit zone
  centerHit: '✦',  // Star burst on hit
  centerMiss: '✕', // X on miss
  lane: '─',       // Lane track character
  laneEnd: '┄',    // Faded lane end
};

// Visual constants
const LANE_WIDTH = 240; // Width of each lane (longer)
const FONT_SIZE = 20;   // Larger font size for symbols

export function HitIndicator({
  lookaheadMs = 2000,
  isActive,
  onHit,
  lastHitResult,
}: HitIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftDotsRef = useRef<HTMLSpanElement[]>([]);
  const rightDotsRef = useRef<HTMLSpanElement[]>([]);
  const centerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastMissedCheckRef = useRef<number>(0);

  // Flash feedback on hit/miss from user click
  useEffect(() => {
    if (lastHitResult && centerRef.current) {
      const isHit = lastHitResult.hit;
      const color = isHit ? '#00FCA6' : '#FF3EC8';
      const symbol = isHit ? SYMBOLS.centerHit : SYMBOLS.centerMiss;
      
      centerRef.current.textContent = symbol;
      centerRef.current.style.color = color;
      centerRef.current.style.textShadow = `0 0 8px ${color}, 0 0 16px ${color}80`;
      centerRef.current.style.transform = 'translate(-50%, -50%) scale(1.4)';

      const timer = setTimeout(() => {
        if (centerRef.current) {
          centerRef.current.textContent = SYMBOLS.center;
          centerRef.current.style.color = '#00FCA6';
          centerRef.current.style.textShadow = '0 0 6px #00FCA680';
          centerRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitResult]);

  // Global click handler
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

  // Animation loop
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current < 16) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = timestamp;

      // Check for missed beat feedback
      const lastMissedTime = (window as any).lastMissedBeatTime || 0;
      if (lastMissedTime > lastMissedCheckRef.current && centerRef.current) {
        lastMissedCheckRef.current = lastMissedTime;
        const color = '#FF3EC8';
        centerRef.current.textContent = SYMBOLS.centerMiss;
        centerRef.current.style.color = color;
        centerRef.current.style.textShadow = `0 0 8px ${color}`;
        centerRef.current.style.transform = 'translate(-50%, -50%) scale(1.2)';
        
        setTimeout(() => {
          if (centerRef.current) {
            centerRef.current.textContent = SYMBOLS.center;
            centerRef.current.style.color = '#00FCA6';
            centerRef.current.style.textShadow = '0 0 6px #00FCA680';
            centerRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        }, 120);
      }

      // Get upcoming beats
      const upcomingBeats = (window as any).upcomingBeats || [];
      const maxDots = Math.min(upcomingBeats.length, leftDotsRef.current.length);
      
      for (let index = 0; index < leftDotsRef.current.length; index++) {
        const leftDot = leftDotsRef.current[index];
        const rightDot = rightDotsRef.current[index];
        
        if (index < maxDots) {
          const timeUntil = upcomingBeats[index];
          const progress = 1 - (timeUntil / lookaheadMs);
          const easedProgress = progress * progress;
          
          // Position from edge towards center
          const position = easedProgress * LANE_WIDTH;
          const opacity = 0.2 + (progress * 0.8);
          const scale = 0.6 + (progress * 0.4);
          
          // Use filled diamond when close, outline when far
          const symbol = progress > 0.5 ? SYMBOLS.dot : SYMBOLS.dotSmall;

          // Left dot
          leftDot.style.display = 'block';
          leftDot.style.left = `${position}px`;
          leftDot.style.opacity = String(opacity);
          leftDot.style.transform = `translateY(-50%) scale(${scale})`;
          leftDot.textContent = symbol;

          // Right dot (mirrored)
          rightDot.style.display = 'block';
          rightDot.style.right = `${position}px`;
          rightDot.style.opacity = String(opacity);
          rightDot.style.transform = `translateY(-50%) scale(${scale})`;
          rightDot.textContent = symbol;
        } else {
          leftDot.style.display = 'none';
          rightDot.style.display = 'none';
        }
      }

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

  const maxDots = 8;
  const dots = Array.from({ length: maxDots }, (_, i) => i);

  if (!isActive) return null;

  const totalWidth = LANE_WIDTH * 2 + 50; // 50px for center zone

  return (
    <div
      ref={containerRef}
      className="fixed left-1/2 -translate-x-1/2 z-10 select-none pointer-events-none font-mono"
      style={{
        width: totalWidth,
        height: 50,
        // Centered between top edge and sword tip (~35% from top)
        // Using clamp to ensure minimum 60px from top, max 18% from top
        top: 'clamp(60px, 15%, 18vh)',
      }}
    >
      {/* Left lane track - ASCII dashes */}
      <div
        className="absolute whitespace-nowrap overflow-hidden"
        style={{
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: LANE_WIDTH,
          color: '#00FCA620',
          fontSize: FONT_SIZE,
          letterSpacing: '2px',
          textAlign: 'right',
        }}
      >
        {SYMBOLS.laneEnd}{SYMBOLS.lane.repeat(24)}{SYMBOLS.lane}
      </div>

      {/* Right lane track - ASCII dashes */}
      <div
        className="absolute whitespace-nowrap overflow-hidden"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: LANE_WIDTH,
          color: '#00FCA620',
          fontSize: FONT_SIZE,
          letterSpacing: '2px',
          textAlign: 'left',
        }}
      >
        {SYMBOLS.lane}{SYMBOLS.lane.repeat(24)}{SYMBOLS.laneEnd}
      </div>

      {/* Center hit zone - Unicode symbol */}
      <span
        ref={centerRef}
        className="absolute transition-all duration-100"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 32,
          color: '#00FCA6',
          textShadow: '0 0 8px #00FCA6, 0 0 16px #00FCA660',
        }}
      >
        {SYMBOLS.center}
      </span>

      {/* Left lane dots - Unicode diamonds */}
      {dots.map((_, index) => (
        <span
          key={`left-dot-${index}`}
          ref={(el) => {
            if (el) leftDotsRef.current[index] = el;
          }}
          className="absolute"
          style={{
            display: 'none',
            fontSize: FONT_SIZE,
            color: '#00FCA6',
            textShadow: '0 0 6px #00FCA6, 0 0 12px #00FCA660',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          {SYMBOLS.dot}
        </span>
      ))}

      {/* Right lane dots - Unicode diamonds */}
      {dots.map((_, index) => (
        <span
          key={`right-dot-${index}`}
          ref={(el) => {
            if (el) rightDotsRef.current[index] = el;
          }}
          className="absolute"
          style={{
            display: 'none',
            fontSize: FONT_SIZE,
            color: '#00FCA6',
            textShadow: '0 0 6px #00FCA6, 0 0 12px #00FCA660',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          {SYMBOLS.dot}
        </span>
      ))}

      {/* Bracket markers at edges */}
      <span
        className="absolute"
        style={{
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: FONT_SIZE + 4,
          color: '#00FCA650',
          textShadow: '0 0 4px #00FCA640',
        }}
      >
        ╟
      </span>
      <span
        className="absolute"
        style={{
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: FONT_SIZE + 4,
          color: '#00FCA650',
          textShadow: '0 0 4px #00FCA640',
        }}
      >
        ╢
      </span>
    </div>
  );
}

export default HitIndicator;
