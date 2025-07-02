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
    // Basis-Skalierungsfaktor abhängig von der Viewport-Breite
    const baseScale = typeof window !== 'undefined' ? 
      Math.min(Math.max(window.innerWidth / 1500, 0.7), 1) : 0.7;
    
    switch(currentLevel) {
      case 1: return baseScale * 0.9;  // Level 1: 10% kleiner als Basis
      case 2: return baseScale * 0.95; // Level 2: 5% kleiner als Basis
      case 3: return baseScale * 1.1;  // Level 3: 10% größer als Basis
      default: return baseScale;
    }
  };

  // Generiere Charge-Effekte basierend auf dem aktuellen Charge-Level
  const getChargeEffects = () => {
    if (chargeLevel <= 1) return null;
    
    // ASCII-Zeichen für elektrostatische Effekte, nach Intensität sortiert
    const staticChars = [
      ['·', ':', '·', '·'],                             // Level 1 - subtil
      ['·', ':', '·', ':', '\'', '.', ','],             // Level 2 - leicht
      ['·', ':', '\'', '.', ',', '`', '"', '-'],        // Level 3 - mittel
      ['·', ':', '\'', '.', ',', '`', '"', '-', '~'],   // Level 4 - stark
      ['·', ':', '\'', '.', ',', '`', '"', '-', '~', '*', '+', '=', '×'] // Level 5 - intensiv
    ];
    
    // Funken-Zeichen für höhere Levels
    const sparkChars = ['*', '+', '×', '✦', '✧', '✶', '✷', '✸', '⚡'];
    
    // Elektrostatische Aufladung entlang der Klinge
    const renderStaticLayer = () => {
      const staticElements = [];
      const currentLevelChars = staticChars[Math.min(chargeLevel - 1, staticChars.length - 1)];
      
      // Bestimme Klingenlänge und -breite basierend auf dem Level
      const klingenLänge = 
        currentLevel === 3 ? 14 : 
        currentLevel === 2 ? 14 : 
        14;
      
      const klingenBreite = 
        currentLevel === 3 ? 5 : 
        currentLevel === 2 ? 4 : 
        3;
      
      // Anzahl der statischen Elemente basierend auf dem Charge-Level
      const staticCount = Math.max(5, chargeLevel * 8);
      
      // Erzeuge statische Elemente entlang der Klinge
      for (let i = 0; i < staticCount; i++) {
        // Position entlang der Klinge (von oben nach unten)
        const yPos = Math.floor(Math.random() * klingenLänge);
        
        // Position seitlich der Klinge (abhängig von der Breite)
        const xOffset = Math.floor(Math.random() * klingenBreite) - Math.floor(klingenBreite / 2);
        
        // Zentriere die X-Position basierend auf dem Level
        const xCenter = 
          currentLevel === 3 ? 7 : 
          currentLevel === 2 ? 7.5 : 
          7;
        
        const xPos = xCenter + xOffset;
        
        // Wähle ein zufälliges statisches Zeichen
        const staticChar = currentLevelChars[Math.floor(Math.random() * currentLevelChars.length)];
        
        // Berechne Opazität und Animation basierend auf Charge-Level
        const opacity = 0.5 + (Math.random() * 0.5);
        const animationDuration = Math.max(0.2, 1 - (chargeLevel * 0.15)) + (Math.random() * 0.3);
        const animationDelay = Math.random() * 0.5;
        
        staticElements.push(
          <div
            key={`static-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${(xPos - 7) * 0.6}ch)`,
              top: `calc(50% - ${10 - yPos}ch)`,
              color: highlightColors[Math.floor(Math.random() * highlightColors.length)],
              opacity: opacity,
              fontSize: '1em',
              fontFamily: 'monospace',
              animation: `staticFlicker ${animationDuration}s infinite alternate ${animationDelay}s`,
              zIndex: 4,
              pointerEvents: 'none',
              textShadow: `0 0 ${chargeLevel}px var(--grifter-blue)`,
            }}
          >
            {staticChar}
          </div>
        );
      }
      
      return staticElements;
    };
    
    // Funken, die vom Schwert stieben (nur bei höheren Charge-Levels)
    const renderSparks = () => {
      if (chargeLevel < 3) return null;
      
      const sparks = [];
      const sparkCount = (chargeLevel - 2) * 3; // Mehr Funken bei höherem Level
      
      for (let i = 0; i < sparkCount; i++) {
        // Bestimme, ob der Funke vom Knauf oder der Klinge ausgeht
        const isHilt = Math.random() > 0.7;
        
        // Position des Funkens
        let yPos, xPos;
        
        if (isHilt) {
          // Funke vom Knauf
          yPos = 15 + Math.floor(Math.random() * 3);
          xPos = 7 + (Math.random() * 2 - 1);
        } else {
          // Funke von der Klinge
          yPos = Math.floor(Math.random() * 14);
          
          // X-Position abhängig vom Level (Klingenbreite)
          const xOffset = 
            currentLevel === 3 ? (Math.random() > 0.5 ? 1.5 : -1.5) : 
            currentLevel === 2 ? (Math.random() > 0.5 ? 1 : -1) : 
            (Math.random() > 0.5 ? 0.7 : -0.7);
          
          xPos = 7 + xOffset;
        }
        
        // Bewegungsrichtung und -geschwindigkeit
        const direction = Math.random() * Math.PI * 2; // Zufällige Richtung
        const distance = 1 + Math.random() * (chargeLevel - 2); // Größere Distanz bei höherem Level
        
        // Zufälliges Funken-Zeichen
        const sparkChar = sparkChars[Math.floor(Math.random() * sparkChars.length)];
        
        // Animation basierend auf Charge-Level
        const animationDuration = Math.max(0.3, 1 - (chargeLevel * 0.1)) + (Math.random() * 0.5);
        
        sparks.push(
          <div
            key={`spark-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${(xPos - 7) * 0.6}ch)`,
              top: `calc(50% - ${10 - yPos}ch)`,
              color: chargeLevel >= 5 ? 'var(--grifter-yellow)' : 'var(--grifter-pink)',
              opacity: 0.8 + (Math.random() * 0.2),
              fontSize: `${0.8 + (Math.random() * 0.3)}em`,
              fontFamily: 'monospace',
              animation: `sparkFly${Math.floor(Math.random() * 3) + 1} ${animationDuration}s infinite`,
              zIndex: 5,
              pointerEvents: 'none',
              textShadow: `0 0 ${chargeLevel}px var(--grifter-pink)`,
              transform: `translate(${Math.cos(direction) * distance}ch, ${Math.sin(direction) * distance}em)`,
            }}
          >
            {sparkChar}
          </div>
        );
      }
      
      return sparks;
    };
    
    // Elektrische Entladungen zwischen verschiedenen Teilen des Schwertes (nur bei Level 4+)
    const renderDischarges = () => {
      if (chargeLevel < 4) return null;
      
      const discharges = [];
      const dischargeCount = (chargeLevel - 3) * 2;
      
      // Mögliche Entladungspunkte (x, y Koordinaten)
      const dischargePoints = [
        // Klingenspitze
        { x: 7, y: 1 },
        // Klingenmitte
        { x: 7, y: 7 },
        // Knauf
        { x: 7, y: 15 },
        // Griff
        { x: 7, y: 17 }
      ];
      
      for (let i = 0; i < dischargeCount; i++) {
        // Wähle zwei zufällige Punkte für die Entladung
        const pointIndex1 = Math.floor(Math.random() * dischargePoints.length);
        let pointIndex2 = Math.floor(Math.random() * dischargePoints.length);
        
        // Stelle sicher, dass wir zwei verschiedene Punkte haben
        while (pointIndex2 === pointIndex1) {
          pointIndex2 = Math.floor(Math.random() * dischargePoints.length);
        }
        
        const point1 = dischargePoints[pointIndex1];
        const point2 = dischargePoints[pointIndex2];
        
        // Berechne die Mitte zwischen den beiden Punkten für die Entladung
        const midX = (point1.x + point2.x) / 2 + (Math.random() * 2 - 1);
        const midY = (point1.y + point2.y) / 2 + (Math.random() * 2 - 1);
        
        // Entladungszeichen
        const dischargeChar = Math.random() > 0.5 ? '/' : '\\';
        
        discharges.push(
          <div
            key={`discharge-${i}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${(midX - 7) * 0.6}ch)`,
              top: `calc(50% - ${10 - midY}ch)`,
              color: 'var(--grifter-yellow)',
              opacity: 0.6 + (Math.random() * 0.4),
              fontSize: '1em',
              fontFamily: 'monospace',
              animation: `dischargePulse ${0.2 + Math.random() * 0.3}s infinite alternate`,
              zIndex: 6,
              pointerEvents: 'none',
              textShadow: `0 0 ${chargeLevel}px var(--grifter-yellow)`,
            }}
          >
            {dischargeChar}
          </div>
        );
      }
      
      return discharges;
    };
    
    return (
      <>
        {renderStaticLayer()}
        {renderSparks()}
        {renderDischarges()}
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
              currentLevel === 3 ? '0 0 4px var(--grifter-blue), 0 0 8px var(--grifter-pink)' : 
              currentLevel === 2 ? '0 0 3px var(--grifter-green), 0 0 5px var(--grifter-blue)' :
              '0 0 2px var(--grifter-green), 0 0 4px var(--grifter-pink)',
            filter: 
              currentLevel === 3 ? 'contrast(2.2) brightness(1.6)' : 
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
        
        @keyframes staticFlicker {
          0% { opacity: 0.2; transform: translateX(-1px); }
          100% { opacity: 0.8; transform: translateX(1px); }
        }
        
        @keyframes sparkFly1 {
          0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--x, 2ch), var(--y, -1em)) scale(0.5); }
        }
        
        @keyframes sparkFly2 {
          0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--x, -2ch), var(--y, 1em)) scale(0.5); }
        }
        
        @keyframes sparkFly3 {
          0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--x, 1ch), var(--y, 1em)) scale(0.5); }
        }
        
        @keyframes dischargePulse {
          0% { opacity: 0.3; transform: scale(0.9); }
          100% { opacity: 1.0; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
} 