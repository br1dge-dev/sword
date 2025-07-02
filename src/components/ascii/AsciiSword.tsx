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
import { usePowerUpStore } from '@/store/powerUpStore';

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
  2: `
      /██\\      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
      |██|      
    __▓██▓__    
   /███████\\   
      |██|      
      |██|      
      |██|      
       VV       
  `,
  3: `
      /███\\     
     /█████\\    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     |█████|    
     _▓███▓_    
    /███████\\   
      |███|     
      |███|     
      |███|     
       VVV      
  `,
};

// Highlight positions for the sword (x, y coordinates)
const highlightPositions = {
  1: [
    { x: 7, y: 1 },  // Tip of sword
    { x: 7, y: 14 }, // Handle top
    { x: 4, y: 15 }, // Left guard
    { x: 10, y: 15 }, // Right guard
    { x: 7, y: 19 }, // Bottom point
  ],
  2: [
    { x: 7, y: 1 },  // Tip of sword
    { x: 8, y: 1 },  // Tip of sword right
    { x: 7, y: 14 }, // Handle top
    { x: 8, y: 14 }, // Handle top right
    { x: 4, y: 15 }, // Left guard
    { x: 11, y: 15 }, // Right guard
    { x: 7, y: 19 }, // Bottom point
    { x: 8, y: 19 }, // Bottom point right
  ],
  3: [
    { x: 6, y: 1 },  // Tip of sword left
    { x: 7, y: 1 },  // Tip of sword middle
    { x: 8, y: 1 },  // Tip of sword right
    { x: 6, y: 14 }, // Handle top left
    { x: 7, y: 14 }, // Handle top middle
    { x: 8, y: 14 }, // Handle top right
    { x: 5, y: 15 }, // Left guard
    { x: 9, y: 15 }, // Right guard
    { x: 7, y: 19 }, // Bottom point
  ]
};

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

// Level 2 hat mehr Datenpatterns
const dataPatterns2 = [
  ...dataPatterns,
  '⚙', '⟲', '⟳', '⧉', '⧭',
];

// Level 3 hat noch mehr Datenpatterns
const dataPatterns3 = [
  ...dataPatterns2,
  '⧫', '⬢', '⬡', '⬣', '⬥',
  '⬦', '⬧', '⬨', '⬩', '⬪',
  '⬫', '⬬', '⬭', '⬮', '⬯',
  '◈', '◇', '◆', '◊', '○',
  '◌', '◍', '◎', '●', '◐',
  '◑', '◒', '◓', '◔', '◕',
  '◖', '◗', '◘', '◙', '◚',
  '◛', '◜', '◝', '◞', '◟',
  '◠', '◡', '◢', '◣', '◤',
  '◥', '◦', '◧', '◨', '◩',
  '◪', '◫', '◬', '◭', '◮',
  '◯', '◰', '◱', '◲', '◳',
  '◴', '◵', '◶', '◷', '◸',
  '◹', '◺', '◻', '◼', '◽',
  '◾', '◿', '★', '☆', '☀',
  '☁', '☂', '☃', '☄', '☇',
  '☈', '☉', '☊', '☋', '☌',
  '☍', '☎', '☏', '☐', '☑',
  '☒', '☓', '☔', '☕', '☖',
  '☗', '☘', '☙', '☚', '☛',
  '☜', '☝', '☞', '☟', '☠',
  '☡', '☢', '☣', '☤', '☥',
  '☦', '☧', '☨', '☩', '☪',
  '☫', '☬', '☭', '☮', '☯'
];

export default function AsciiSword({ level = 1 }: AsciiSwordProps) {
  const { currentLevel, chargeLevel } = usePowerUpStore();
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
    const swordLines = swordLevels[currentLevel as keyof typeof swordLevels].split('\n');
    
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
      // Anpassen der Pfadlänge je nach Level
      const pathLength = 
        currentLevel === 3 ? 18 : 
        currentLevel === 2 ? 14 : 
        12;
      
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
    }, 
      currentLevel === 3 ? 90 : 
      currentLevel === 2 ? 110 : 
      120
    );
    
    return () => clearInterval(flowInterval);
  }, [currentLevel]);
  
  // Create dynamic pulsing effect for the sword edges
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseEffect(prev => (prev + 1) % 100);
    }, 
      currentLevel === 3 ? 30 : 
      currentLevel === 2 ? 35 : 
      40
    );
    
    return () => clearInterval(pulseInterval);
  }, [currentLevel]);
  
  // Create cyberpunk data overlay effect
  useEffect(() => {
    // Generate random data patterns that appear and disappear
    const generateDataOverlay = () => {
      const newOverlay = [];
      
      // Anzahl der Elemente je nach Level
      const numElements = 
        currentLevel === 3 ? Math.floor(Math.random() * 14) + 7 : // 7-20 Elemente für längeres Level 3
        currentLevel === 2 ? Math.floor(Math.random() * 8) + 3 : // 3-10 Elemente für Level 2
        Math.floor(Math.random() * 5) + 2; // 2-6 Elemente für Level 1
      
      // Muster je nach Level
      const patterns = 
        currentLevel === 3 ? dataPatterns3 : 
        currentLevel === 2 ? dataPatterns2 : 
        dataPatterns;
      
      for (let i = 0; i < numElements; i++) {
        // Random position on or near the sword
        // Angepasste X-Koordinaten je nach Schwertbreite
        const x = Math.floor(Math.random() * (currentLevel === 3 ? 16 : 15)) + 2;
        
        // Angepasste Y-Koordinaten für längeres Schwert
        const maxY = currentLevel === 3 ? 20 : 18;
        const y = Math.floor(Math.random() * maxY) + 1;
        
        // Random data pattern
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
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
    const dataInterval = setInterval(
      generateDataOverlay, 
      currentLevel === 3 ? 350 : // Schneller für Dragon Slayer
      currentLevel === 2 ? 500 : 
      600
    );
    
    return () => clearInterval(dataInterval);
  }, [currentLevel]);
  
  // Simulate block finalization with a pulsing glow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 1000);
    }, 
      currentLevel === 3 ? 3000 : 
      currentLevel === 2 ? 4000 : 
      5000
    );
    
    return () => clearInterval(interval);
  }, [currentLevel]);

  // Get the appropriate sword ASCII art based on level
  const swordArt = swordLevels[currentLevel as keyof typeof swordLevels] || swordLevels[1];
  
  // Convert sword art to an array of lines for rendering
  const swordLines = swordArt.split('\n');

  // Get the appropriate highlight positions based on level
  const currentHighlightPositions = highlightPositions[currentLevel as keyof typeof highlightPositions] || highlightPositions[1];

  // Calculate edge detection for the sword
  const getEdgeIntensity = (x: number, y: number, char: string): number => {
    if (char === ' ') return 0;
    
    // Edges are characters that are likely at the boundary of the sword
    let isEdge = 
      char === '/' || 
      char === '\\' || 
      char === '_' || 
      char === 'V' ||
      char === '█' ||  // Hauptkörper des Schwertes
      char === '▓' ||  // Griff des Schwertes
      y === 1;  // Top
    
    // Angepasste Seitenkanten je nach Level
    if (char === '|') {
      if (currentLevel === 3) {
        isEdge = x === 6 || x === 8; // Kanten des 3-Tile-Schwertes
      } else if (currentLevel === 2) {
        isEdge = x === 6 || x === 9; // Kanten des 2-Tile-Schwertes
      } else {
        isEdge = x === 7; // Kante des 1-Tile-Schwertes
      }
    }
      
    // Intensität je nach Level
    const baseIntensity = 
      currentLevel === 3 ? 1.3 : 
      currentLevel === 2 ? 1.0 : 
      0.9;
    
    const pulseMultiplier = 
      currentLevel === 3 ? 0.5 : 
      currentLevel === 2 ? 0.35 : 
      0.3;
    
    return isEdge ? baseIntensity + (Math.sin(pulseEffect * 0.1) + 1) * pulseMultiplier : 0;
  };

  // Berechne die Skalierungsfaktoren für die verschiedenen Level
  const getScaleFactor = () => {
    switch(currentLevel) {
      case 1: return 0.9;  // Level 1: 10% kleiner
      case 2: return 0.95; // Level 2: 5% kleiner
      case 3: return 1.1;  // Level 3: 10% größer
      default: return 1;
    }
  };

  // Generiere Charge-Effekte basierend auf dem aktuellen Charge-Level
  const getChargeEffects = () => {
    if (chargeLevel <= 1) return null;
    
    // Dezentere Vibrationseffekte entlang der Klinge
    const getKlingenVibration = () => {
      const vibrationElements = [];
      const klingenLänge = 
        currentLevel === 3 ? 14 : 
        currentLevel === 2 ? 12 : 
        10;
      
      // Anzahl der Vibrationseffekte basierend auf dem Charge-Level
      const vibrationCount = Math.min(chargeLevel * 2, klingenLänge);
      
      // Verteile die Vibrationseffekte über die Länge der Klinge
      for (let i = 0; i < vibrationCount; i++) {
        // Position auf der Klinge (von oben nach unten)
        const yPos = 1 + Math.floor(i * (klingenLänge / vibrationCount));
        
        // Vibrationseffekt links oder rechts der Klinge
        const isLeft = Math.random() > 0.5;
        const xOffset = 
          currentLevel === 3 ? (isLeft ? -1 : 5) : 
          currentLevel === 2 ? (isLeft ? -1 : 4) : 
          (isLeft ? -1 : 3);
        
        // Vibrationszeichen basierend auf dem Charge-Level
        const vibrationChars = ['(', ')', '·', ':', '|', '/', '\\'];
        const vibrationChar = vibrationChars[Math.floor(Math.random() * (Math.min(chargeLevel, vibrationChars.length)))];
        
        // Intensität basierend auf dem Charge-Level
        const intensity = 0.4 + (chargeLevel * 0.1);
        
        vibrationElements.push(
          <div
            key={`vibration-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${xOffset * 0.6}ch)`,
              top: `calc(50% - 10ch + ${yPos}em)`,
              color: highlightColors[Math.floor(Math.random() * highlightColors.length)],
              textShadow: `0 0 ${chargeLevel}px var(--grifter-pink)`,
              opacity: Math.random() * 0.3 + intensity,
              fontSize: `${0.8 + (chargeLevel * 0.05)}em`,
              transform: `rotate(${isLeft ? -90 : 90}deg)`,
              animation: `vibrate ${0.5 + Math.random() * 0.5}s infinite alternate`,
              zIndex: 5,
              pointerEvents: 'none'
            }}
          >
            {vibrationChar}
          </div>
        );
      }
      
      return vibrationElements;
    };
    
    // Subtile Energieeffekte am Griff
    const getGriffEffekte = () => {
      if (chargeLevel < 3) return null;
      
      const griffEffekte = [];
      const numEffekte = chargeLevel - 2;
      
      for (let i = 0; i < numEffekte; i++) {
        const isLeft = Math.random() > 0.5;
        const xOffset = 
          currentLevel === 3 ? (isLeft ? -2 : 6) : 
          currentLevel === 2 ? (isLeft ? -2 : 5) : 
          (isLeft ? -2 : 4);
        
        griffEffekte.push(
          <div
            key={`griff-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${xOffset * 0.6}ch)`,
              top: `calc(50% + ${3 + Math.random()}em)`,
              color: highlightColors[Math.floor(Math.random() * highlightColors.length)],
              textShadow: `0 0 ${chargeLevel - 2}px var(--grifter-blue)`,
              opacity: 0.6 + (Math.random() * 0.4),
              fontSize: `${0.7 + (chargeLevel * 0.03)}em`,
              animation: `pulse ${0.8 + Math.random() * 0.7}s infinite alternate`,
              zIndex: 6,
              pointerEvents: 'none'
            }}
          >
            {chargeLevel >= 4 ? '✦' : '·'}
          </div>
        );
      }
      
      return griffEffekte;
    };
    
    // Energieaura an der Spitze (nur bei höheren Charge-Levels)
    const getSpitzenAura = () => {
      if (chargeLevel < 4) return null;
      
      const spitzenEffekte = [];
      const numEffekte = chargeLevel - 3;
      
      for (let i = 0; i < numEffekte; i++) {
        const angle = (Math.PI * 2 * i) / numEffekte;
        const distance = 1 + Math.random() * 0.5;
        
        // Berechne Position
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance - 10; // Position an der Spitze
        
        spitzenEffekte.push(
          <div
            key={`spitze-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}ch)`,
              top: `calc(50% + ${y}em)`,
              color: highlightColors[Math.floor(Math.random() * highlightColors.length)],
              textShadow: `0 0 ${chargeLevel - 2}px var(--grifter-yellow)`,
              opacity: 0.7 + (Math.random() * 0.3),
              fontSize: `${0.6 + (chargeLevel * 0.04)}em`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `pulse ${0.6 + Math.random() * 0.4}s infinite alternate`,
              zIndex: 7,
              pointerEvents: 'none'
            }}
          >
            {chargeLevel >= 5 ? '✧' : '·'}
          </div>
        );
      }
      
      return spitzenEffekte;
    };
    
    return (
      <>
        {getKlingenVibration()}
        {getGriffEffekte()}
        {getSpitzenAura()}
      </>
    );
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
          msUserSelect: 'none',
          position: 'relative'
        }}
      >
        {/* Charge-Effekte */}
        {getChargeEffects()}
        
        <motion.pre
          ref={swordRef}
          className="text-base sm:text-lg md:text-xl lg:text-2xl h-auto"
          style={{ 
            lineHeight: '1', 
            maxWidth: '100%',
            color: 
              currentLevel === 3 ? 'var(--grifter-blue)' : 
              currentLevel === 2 ? 'var(--grifter-green)' : 
              'var(--grifter-green)',
            textShadow: 
              currentLevel === 3 ? '0 0 4px var(--grifter-blue), 0 0 8px var(--grifter-pink)' : // Stärkerer Schatten für Dragon Slayer
              currentLevel === 2 ? '0 0 3px var(--grifter-green), 0 0 5px var(--grifter-blue)' :
              '0 0 2px var(--grifter-green), 0 0 4px var(--grifter-pink)',
            filter: 
              currentLevel === 3 ? 'contrast(2.2) brightness(1.6)' : // Stärkerer Kontrast für Dragon Slayer
              currentLevel === 2 ? 'contrast(1.8) brightness(1.4)' :
              'contrast(1.7) brightness(1.3)',
            position: 'relative',
            left: 0,
            transform: `scale(${getScaleFactor()})`,
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
            backgroundColor: 'transparent'
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
                const isSpecialPosition = currentHighlightPositions.some(
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
                        color: 
                          currentLevel === 3 ? 'var(--grifter-pink)' : 
                          currentLevel === 2 ? 'var(--grifter-blue)' : 
                          'var(--grifter-blue)',
                        textShadow: 
                          currentLevel === 3 ? '0 0 4px var(--grifter-pink), 0 0 8px var(--grifter-blue)' :
                          currentLevel === 2 ? '0 0 3px var(--grifter-blue), 0 0 7px var(--grifter-green)' :
                          '0 0 3px var(--grifter-blue), 0 0 6px var(--grifter-blue)',
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
                    : currentLevel === 3 ? 'var(--grifter-blue)' : 
                      currentLevel === 2 ? 'var(--grifter-green)' : 
                      'var(--grifter-green)';
                  
                  return (
                    <span 
                      key={charIndex} 
                      style={{ 
                        color: colorInfo ? colorInfo.color : highlightColor,
                        textShadow: `0 0 ${2 + edgeIntensity * (
                          currentLevel === 3 ? 5 : 
                          currentLevel === 2 ? 4 : 
                          3
                        )}px ${highlightColor}`,
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
                      color: colorInfo ? colorInfo.color : (char === ' ' ? 'transparent' : 'inherit'),
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
      
      {/* CSS für Charge-Effekte */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
          100% { opacity: 1.0; transform: scale(1.2) rotate(360deg); }
        }
        
        @keyframes vibrate {
          0% { transform: translateX(-1px) rotate(${Math.random() > 0.5 ? -90 : 90}deg); }
          25% { transform: translateX(0px) rotate(${Math.random() > 0.5 ? -90 : 90}deg); }
          50% { transform: translateX(1px) rotate(${Math.random() > 0.5 ? -90 : 90}deg); }
          75% { transform: translateX(0px) rotate(${Math.random() > 0.5 ? -90 : 90}deg); }
          100% { transform: translateX(-1px) rotate(${Math.random() > 0.5 ? -90 : 90}deg); }
        }
      `}</style>
    </div>
  );
} 