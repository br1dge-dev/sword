"use client";

/**
 * AsciiSword - ASCII Art Sword Component
 * 
 * This component renders an ASCII art sword with various visual effects.
 * 
 * @param {Object} props - Component properties
 * @param {number} props.level - The level of the sword (affects appearance)
 * @returns {JSX.Element} The rendered ASCII sword
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AsciiSwordProps {
  level?: number;
}

// ASCII art for different sword levels with a more cyber/crypto-style look
// Dickere Zeichen für das Schwert - Alle Zeilen mit gleicher Länge für stabile Positionierung
// Jede Zeile hat exakt die gleiche Länge, um Verschiebungen zu verhindern
const swordLevels = {
  1: `
       /█\\     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
       |█|     
     __▓█▓__   
    /███████\\  
       |█|     
       |█|     
       |█|     
        V      
  `,
  // More levels can be added as the sword evolves
};

// Highlight positions for the sword (x, y coordinates)
const highlightPositions = [
  { x: 7, y: 1 },  // Tip of sword
  { x: 7, y: 14 }, // Handle top
  { x: 4, y: 15 }, // Left guard
  { x: 10, y: 15 }, // Right guard
  { x: 7, y: 19 }, // Bottom point
];

// Colors for the sword highlights - updated mit Grifter-Classic
const highlightColors = [
  'var(--grifter-green)', // Hauptgrün
  'var(--grifter-pink)', // Pink
  'var(--grifter-blue)', // Blau
  'var(--grifter-yellow)', // Gelb
];

// Cyberpunk data patterns that occasionally appear on the sword
const dataPatterns = [
  '01', '10', '00', '11',
  'FF', 'A0', 'D3', 'E7',
  '※', '⟨⟩', '⌘', '⌥', '⎔',
  '⚠', '⚡', '⟁', '⟰', '⟱'
];

export default function AsciiSword({ level = 1 }: AsciiSwordProps) {
  const [isGlowing, setIsGlowing] = useState(false);
  const [coloredChars, setColoredChars] = useState<Array<{
    x: number;
    y: number;
    color: string;
  }>>([]);
  const [pulseEffect, setPulseEffect] = useState<number>(0);
  const [dataOverlay, setDataOverlay] = useState<Array<{
    x: number;
    y: number;
    char: string;
    opacity: number;
  }>>([]);
  const swordRef = useRef<HTMLPreElement>(null);
  
  // Create flowing color effect through the sword
  useEffect(() => {
    const swordLines = swordLevels[level as keyof typeof swordLevels].split('\n');
    
    // Find all characters that can be colored (non-space characters)
    const allChars: Array<{x: number, y: number, char: string}> = [];
    swordLines.forEach((line, y) => {
      // Convert string to array safely for TypeScript
      Array.from(line).forEach((char, x) => {
        if (char !== ' ' && char !== '\n') {
          allChars.push({ x, y, char });
        }
      });
    });
    
    // Create a flowing animation that colors characters along a path
    let currentIndex = 0;
    const flowInterval = setInterval(() => {
      // Define a path through the sword (we'll use a simple top-to-bottom approach)
      const pathLength = 12; // Mehr Zeichen auf einmal färben
      const newColoredChars = [];
      
      // Select a color for this flow
      const flowColor = highlightColors[Math.floor(Math.random() * highlightColors.length)];
      
      // Color characters along the path
      for (let i = 0; i < pathLength; i++) {
        const idx = (currentIndex + i) % allChars.length;
        newColoredChars.push({
          x: allChars[idx].x,
          y: allChars[idx].y,
          color: flowColor
        });
      }
      
      // Move to the next starting position
      currentIndex = (currentIndex + 3) % allChars.length;
      
      setColoredChars(newColoredChars);
    }, 120); // Etwas schneller
    
    return () => clearInterval(flowInterval);
  }, [level]);
  
  // Create dynamic pulsing effect for the sword edges
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseEffect(prev => (prev + 1) % 100);
    }, 40); // Schnelleres Pulsieren
    
    return () => clearInterval(pulseInterval);
  }, []);
  
  // Create cyberpunk data overlay effect
  useEffect(() => {
    // Generate random data patterns that appear and disappear
    const generateDataOverlay = () => {
      const newOverlay = [];
      const numElements = Math.floor(Math.random() * 7) + 2; // 2-8 Elemente (mehr als zuvor)
      
      for (let i = 0; i < numElements; i++) {
        // Random position on or near the sword
        const x = Math.floor(Math.random() * 15) + 2;
        const y = Math.floor(Math.random() * 18) + 1;
        
        // Random data pattern
        const pattern = dataPatterns[Math.floor(Math.random() * dataPatterns.length)];
        
        newOverlay.push({
          x,
          y,
          char: pattern,
          opacity: Math.random() * 0.7 + 0.3 // 0.3 - 1.0 opacity
        });
      }
      
      setDataOverlay(newOverlay);
    };
    
    // Update data overlay periodically
    const dataInterval = setInterval(generateDataOverlay, 600); // Etwas schneller
    
    return () => clearInterval(dataInterval);
  }, []);
  
  // Simulate block finalization with a pulsing glow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 1000);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Get the appropriate sword ASCII art based on level
  const swordArt = swordLevels[level as keyof typeof swordLevels] || swordLevels[1];
  
  // Convert sword art to an array of lines for rendering
  const swordLines = swordArt.split('\n');

  // Calculate edge detection for the sword
  const getEdgeIntensity = (x: number, y: number, char: string): number => {
    if (char === ' ') return 0;
    
    // Edges are characters that are likely at the boundary of the sword
    const isEdge = 
      char === '/' || 
      char === '\\' || 
      char === '_' || 
      char === 'V' ||
      char === '|' && (x === 6 || x === 8) ||  // Side edges
      char === '█' ||  // Hauptkörper des Schwertes
      char === '▓' ||  // Griff des Schwertes
      y === 1 || y === 19;  // Top and bottom
      
    return isEdge ? 0.9 + (Math.sin(pulseEffect * 0.1) + 1) * 0.3 : 0;
  };

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden select-none">
      <div 
        className="relative flex justify-center items-center" 
        style={{ 
          width: '100%', 
          height: '100%',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        <motion.pre
          ref={swordRef}
          className="text-base sm:text-lg md:text-xl lg:text-2xl h-auto"
          animate={{
            filter: isGlowing ? 'brightness(2.0)' : 'brightness(1.5)',
          }}
          transition={{ duration: 0.5 }}
          style={{ 
            lineHeight: '1', 
            maxWidth: '100%',
            background: 'linear-gradient(180deg, var(--grifter-green), var(--grifter-blue), var(--grifter-green))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 2px var(--grifter-green), 0 0 4px var(--grifter-pink)',
            filter: 'contrast(1.7) brightness(1.3)',
            position: 'relative',
            left: 0,
            transform: 'translateX(0)',
            width: 'auto',
            display: 'inline-block',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            letterSpacing: 0,
            textAlign: 'center',
            transformOrigin: 'center center',
            willChange: 'transform',
            margin: '0 auto',
            userSelect: 'none',
          }}
        >
          {swordLines.map((line, lineIndex) => (
            <div 
              key={lineIndex} 
              className="relative" 
              style={{ 
                whiteSpace: 'pre',
                width: '100%',
                textAlign: 'center',
                overflow: 'visible',
                position: 'relative'
              }}
            >
              {/* Render each character with potential coloring */}
              {Array.from(line).map((char, charIndex) => {
                // Check if this character should be colored
                const colorInfo = coloredChars.find(c => c.x === charIndex && c.y === lineIndex);
                
                // Calculate edge effect intensity
                const edgeIntensity = getEdgeIntensity(charIndex, lineIndex, char);
                
                // Check if this is a special position (like tip, guard, etc)
                const isSpecialPosition = highlightPositions.some(
                  pos => pos.x === charIndex && pos.y === lineIndex
                );
                
                // Check if there's a data overlay at this position
                const dataOverlayInfo = dataOverlay.find(d => d.x === charIndex && d.y === lineIndex);
                
                // If there's a data overlay, render it instead of the original character
                if (dataOverlayInfo && char !== ' ') {
                  return (
                    <span 
                      key={charIndex} 
                      style={{ 
                        color: 'var(--grifter-blue)',
                        textShadow: '0 0 3px var(--grifter-blue), 0 0 6px var(--grifter-blue)',
                        opacity: dataOverlayInfo.opacity,
                        position: 'relative',
                        zIndex: 3,
                        fontWeight: 'bold',
                        userSelect: 'none',
                        display: 'inline-block',
                        width: '1ch',
                        textAlign: 'center'
                      }}
                    >
                      {dataOverlayInfo.char}
                    </span>
                  );
                }
                
                // Apply special styling for edges and highlights
                if ((edgeIntensity > 0 || isSpecialPosition) && char !== ' ') {
                  const highlightColor = isSpecialPosition 
                    ? highlightColors[Math.floor(Math.random() * highlightColors.length)]
                    : 'var(--grifter-green)';
                  
                  return (
                    <span 
                      key={charIndex} 
                      style={{ 
                        color: colorInfo ? colorInfo.color : highlightColor,
                        textShadow: `0 0 ${2 + edgeIntensity * 4}px ${highlightColor}`,
                        position: 'relative',
                        zIndex: 2,
                        fontWeight: 'bold',
                        userSelect: 'none',
                        display: 'inline-block',
                        width: '1ch',
                        textAlign: 'center'
                      }}
                    >
                      {char}
                    </span>
                  );
                }
                
                return (
                  <span 
                    key={charIndex} 
                    style={{ 
                      color: colorInfo ? colorInfo.color : 'inherit',
                      transition: 'color 0.3s ease',
                      fontWeight: 'bold',
                      userSelect: 'none',
                      display: 'inline-block',
                      width: char === ' ' ? '1ch' : 'auto',
                      textAlign: 'center'
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </motion.pre>
      </div>
    </div>
  );
} 