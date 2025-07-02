"use client";

/**
 * AsciiTitle Component
 * 
 * This component renders the main title of the application with ASCII art styling
 * and cyberpunk visual effects.
 */
import React, { useEffect, useState } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { motion } from 'framer-motion';

// Title text in ASCII art style
const titleArt = `
  ██████╗ ██████╗ ██╗███████╗████████╗██████╗ ██╗      █████╗ ██████╗ ███████╗
 ██╔════╝ ██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║     ██╔══██╗██╔══██╗██╔════╝
 ██║  ███╗██████╔╝██║█████╗     ██║   ██████╔╝██║     ███████║██║  ██║█████╗  
 ██║   ██║██╔══██╗██║██╔══╝     ██║   ██╔══██╗██║     ██╔══██║██║  ██║██╔══╝  
 ╚██████╔╝██║  ██║██║██║        ██║   ██████╔╝███████╗██║  ██║██████╔╝███████╗
  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
`;

// Glitch-Symbole
const glitchSymbols = ['░', '▒', '▓', '|', '/', '\\', '0', '1', '*', '>', '<', '×', '•', '¤', '§', '¶'];
const accentColors = [
  'var(--grifter-pink)',
  'var(--grifter-green)',
  'var(--grifter-blue)',
  'var(--grifter-yellow)'
];

export default function AsciiTitle() {
  const { currentLevel } = usePowerUpStore();
  const [glitchMap, setGlitchMap] = useState<{[key: number]: {[key: number]: {char: string, color: string}}}>(() => ({}));
  const [flash, setFlash] = useState<{y: number, x: number, color: string} | null>(null); // Einzelner Flash
  const [wideGlitch, setWideGlitch] = useState<{y: number, x: number, len: number, color: string} | null>(null); // Breiter Glitch
  const lines = titleArt.split('\n');
  const width = Math.max(...lines.map(l => l.length));
  const height = lines.length;

  // Animation: Glitch-Symbole und selektiver pinker Flash
  useEffect(() => {
    let frame = 0;
    let raf: number;
    function animate() {
      frame++;
      // Glitch-Symbole: alle 14 Frames (ca. 230ms)
      if (frame % 14 === 0) {
        const newGlitchMap: {[key: number]: {[key: number]: {char: string, color: string}}} = {};
        // 1-2 Glitches pro Frame, zufällige Akzentfarbe
        for (let i = 0; i < (Math.random() > 0.7 ? 2 : 1); i++) {
          const y = Math.floor(Math.random() * height);
          const x = Math.floor(Math.random() * width);
          const color = accentColors[Math.floor(Math.random() * accentColors.length)];
          if (!newGlitchMap[y]) newGlitchMap[y] = {};
          newGlitchMap[y][x] = { char: glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)], color };
        }
        setGlitchMap(newGlitchMap);
      }
      // Pinker/akzentfarbener Flash: alle 36 Frames (ca. 600ms)
      if (frame % 36 === 0) {
        if (Math.random() > 0.7) {
          const y = Math.floor(Math.random() * height);
          const line = lines[y];
          let x = Math.floor(Math.random() * width);
          let tries = 0;
          while (line[x] === ' ' && tries < 10) {
            x = Math.floor(Math.random() * width);
            tries++;
          }
          const color = accentColors[Math.floor(Math.random() * accentColors.length)];
          setFlash({ y, x, color });
        } else {
          setFlash(null);
        }
      }
      // Breiter Glitch: alle 90 Frames (ca. 1,5s), selten, 2-4 Zeichen, zufällige Akzentfarbe
      if (frame % 90 === 0) {
        if (Math.random() > 0.8) {
          const y = Math.floor(Math.random() * height);
          const len = 2 + Math.floor(Math.random() * 3); // 2-4 Zeichen
          let x = Math.floor(Math.random() * (width - len));
          const color = accentColors[Math.floor(Math.random() * accentColors.length)];
          setWideGlitch({ y, x, len, color });
        } else {
          setWideGlitch(null);
        }
      }
      raf = window.requestAnimationFrame(animate);
    }
    raf = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(raf);
  }, [height, width, lines]);

  // Berechne die Skalierung basierend auf dem aktuellen Level
  const getScaleBasedOnLevel = () => {
    switch(currentLevel) {
      case 3: return 0.85; // 15% kleiner für Level 3
      case 2: return 0.92; // 8% kleiner für Level 2
      default: return 1.0; // Normale Größe für Level 1
    }
  };

  // Berechne die vertikale Position basierend auf dem aktuellen Level
  const getPositionBasedOnLevel = () => {
    switch(currentLevel) {
      case 3: return '-0.5rem'; // Leicht nach oben für Level 3
      case 2: return '-0.25rem'; // Minimal nach oben für Level 2
      default: return '0'; // Normale Position für Level 1
    }
  };

  // Berechne den Skalierungsfaktor basierend auf der Viewport-Breite
  const getScaleFactor = () => {
    return typeof window !== 'undefined' ? 
      Math.min(Math.max(window.innerWidth / 1500, 0.7), 1) : 0.7;
  };

  const scale = getScaleBasedOnLevel();
  const topPosition = getPositionBasedOnLevel();

  return (
    <div className="w-full flex justify-center items-center py-8">
      <motion.pre
        className="text-base sm:text-lg md:text-xl lg:text-2xl"
        style={{
          fontFamily: 'monospace',
          lineHeight: '1',
          color: 'var(--grifter-blue)',
          textShadow: '0 0 5px var(--grifter-blue), 0 0 10px var(--grifter-pink)',
          filter: 'contrast(1.2) brightness(1.1)',
          transform: `scale(${getScaleFactor()})`,
          transformOrigin: 'center center',
          textAlign: 'center',
          whiteSpace: 'pre',
          userSelect: 'none'
        }}
      >
        {lines.map((line, y) => (
          <span key={y} style={{ display: 'block', position: 'relative' }}>
            {Array.from(line).map((char, x) => {
              // Breiter Glitch (Rechteck/Balken)
              if (wideGlitch && wideGlitch.y === y && x >= wideGlitch.x && x < wideGlitch.x + wideGlitch.len && char !== ' ') {
                return (
                  <span key={x} style={{
                    color: wideGlitch.color,
                    filter: 'brightness(2.2)',
                    textShadow: `0 0 8px ${wideGlitch.color}, 0 0 16px ${wideGlitch.color}`,
                    fontWeight: 'bold',
                    borderRadius: '2px',
                    background: 'rgba(0,0,0,0.08)',
                    padding: '0 1px',
                    transition: 'all 0.1s',
                  }}>{char}</span>
                );
              }
              // Einzelner Flash
              if (flash && flash.y === y && flash.x === x && char !== ' ') {
                return (
                  <span key={x} style={{
                    color: flash.color,
                    filter: 'brightness(2.2)',
                    textShadow: `0 0 8px ${flash.color}, 0 0 16px ${flash.color}`,
                    fontWeight: 'bold',
                    transition: 'all 0.1s',
                  }}>{char}</span>
                );
              }
              // Glitch-Symbol
              if (glitchMap[y]?.[x]) {
                return (
                  <span key={x} style={{ color: glitchMap[y][x].color, filter: 'brightness(1.3)' }}>{glitchMap[y][x].char}</span>
                );
              }
              return <span key={x}>{char}</span>;
            })}
          </span>
        ))}
      </motion.pre>
    </div>
  );
} 