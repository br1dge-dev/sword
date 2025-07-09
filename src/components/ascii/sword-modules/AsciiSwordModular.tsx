"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
 * OPTIMIERT: Direkte Reaktionen, einfachere State-Updates, sofortige Audio-Reaktivität
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useAudioReactionStore, useBeatReset, useFallbackAnimation } from '@/store/audioReactionStore';

// Importiere Typen
import {
  AsciiSwordProps,
  SwordPosition,
  EdgePosition,
  IntervalRefs
} from './types/swordTypes';

// Importiere Konstanten
import {
  swordLevels,
  edgeChars,
  edgeGlitchChars,
  vibrationIntensity,
  glitchIntensity,
  glitchFrequency,
  colorEffectFrequency,
  colorEffectIntensity,
  unicodeGlitchChars,
  veinIntensity,
  accentColors,
  glitchSymbols
} from './constants/swordConstants';

// Importiere Hilfsfunktionen
import {
  centerAsciiArt,
  isEdgeChar,
  isHandlePosition,
  getDarkerColor,
  getLighterColor,
  getComplementaryColor,
  generateCluster,
  getRandomOffset
} from './utils/swordUtils';

// Importiere Effekt-Generatoren
import { generateCaveBackground, generateColoredVeins } from './effects/backgroundEffects';
import { generateHarmonicColorPair } from './effects/colorEffects';
import {
  generateEdgeGlitches,
  generateUnicodeGlitches,
  generateBlurredChars,
  generateSkewedChars,
  generateFadedChars
} from './effects/glitchEffects';
import { generateColoredTiles, generateGlitchChars } from './effects/tileEffects';

export default function AsciiSwordModular({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Audio-Reaktionsdaten abrufen
  const { energy: storeEnergy, beatDetected: storeBeat } = useAudioReactionStore();
  
  // Verwende direkte Werte, wenn verfügbar, sonst aus dem Store
  const energy = directEnergy !== undefined ? directEnergy : storeEnergy;
  const beatDetected = directBeat !== undefined ? directBeat : storeBeat;
  
  // Automatisches Beat-Reset aktivieren
  useBeatReset(100);
  
  // Fallback-Animation aktivieren, wenn keine Audio-Reaktivität vorhanden ist
  useFallbackAnimation();
  
  // OPTIMIERT: Intelligentes Vein-Management-System
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const cleanupTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const lastVeinSeedRef = useRef<number>(0); // Pseudo-random Seed für Vein-Generierung
  const veinLifetimeRef = useRef<Map<string, number>>(new Map()); // Vein-Lebensdauer-Tracking
  const maxVeinsRef = useRef<number>(300); // Erhöht auf 300 für mehr rhythmische Dynamik
  
  // OPTIMIERT: Memoisierte Berechnungen für bessere Performance
  const getBackgroundDimensions = useCallback(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    const baseWidth = 160;
    const baseHeight = 100;
    
    let widthFactor, heightFactor;
    
    if (viewportWidth > 1440) {
      widthFactor = Math.min(1.5, Math.max(1, viewportWidth / 960));
      heightFactor = Math.min(1.5, Math.max(1, viewportHeight / 720));
    } else {
      widthFactor = Math.min(1.25, Math.max(1, viewportWidth / 1024));
      heightFactor = Math.min(1.25, Math.max(1, viewportHeight / 768));
    }
    
    return {
      width: Math.floor(baseWidth * widthFactor),
      height: Math.floor(baseHeight * heightFactor)
    };
  }, []);
  
  // OPTIMIERT: Memoisierte Schwert-Positionen (nur bei Level-Änderung neu berechnen)
  const swordPositions = useMemo(() => {
    const positions: Array<SwordPosition> = [];
    const activeLevel = currentLevel || level;
    const swordArt = swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1];
    const centeredSwordLines = centerAsciiArt(swordArt);
    
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (char !== ' ') {
          positions.push({x, y});
        }
      });
    });
    return positions;
  }, [currentLevel, level]);
  
  // OPTIMIERT: Memoisierte Edge-Positionen
  const edgePositions = useMemo(() => {
    const positions: Array<EdgePosition> = [];
    const activeLevel = currentLevel || level;
    const swordArt = swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1];
    const centeredSwordLines = centerAsciiArt(swordArt);
    
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines)) {
          positions.push({x, y, char});
        }
      });
    });
    return positions;
  }, [currentLevel, level]);
  
  // OPTIMIERT: Memoisierte Schwert-ASCII-Art
  const { swordArt, centeredSwordLines } = useMemo(() => {
    const activeLevel = currentLevel || level;
    const art = swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1];
    return {
      swordArt: art,
      centeredSwordLines: centerAsciiArt(art)
    };
  }, [currentLevel, level]);
  
  // OPTIMIERT: Effizientere Cleanup-Funktionen
  const clearAllIntervals = useCallback(() => {
    Object.keys(intervalsRef.current).forEach(key => {
      if (intervalsRef.current[key]) {
        clearInterval(intervalsRef.current[key] as NodeJS.Timeout);
        intervalsRef.current[key] = null;
      }
    });
    
    // OPTIMIERT: Cleanup aller Timeouts
    cleanupTimeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    cleanupTimeoutsRef.current.clear();
  }, []);
  
  const clearBackgroundCache = useCallback(() => {
    setCaveBackground([]);
    setColoredVeins([]);
  }, []);
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor('#00FCA6'));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(2000);
  const [coloredTiles, setColoredTiles] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [glitchChars, setGlitchChars] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [caveBackground, setCaveBackground] = useState<string[][]>([]);
  const [coloredVeins, setColoredVeins] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [edgeEffects, setEdgeEffects] = useState<Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>>([]);
  const [unicodeGlitches, setUnicodeGlitches] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [blurredChars, setBlurredChars] = useState<Array<{x: number, y: number}>>([]);
  const [skewedChars, setSkewedChars] = useState<Array<{x: number, y: number, angle: number}>>([]);
  const [fadedChars, setFadedChars] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  
  // Refs für Intervalle, um Speicherlecks zu vermeiden
  const intervalsRef = useRef<IntervalRefs>({
    glow: null,
    glitch: null,
    edge: null,
    unicodeGlitch: null,
    colorChange: null,
    background: null,
    veins: null,
    tileColors: null
  });
  
  // OPTIMIERT: Hintergrund initialisieren mit Lazy-Rendering
  useEffect(() => {
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    
    // OPTIMIERT: Verwende Viewport-Dimensionen für Lazy-Rendering
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
    
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
    
    // OPTIMIERT: Rhythmische initiale Vein-Generierung mit Lebensdauer-Tracking
    const baseVeins = Math.floor(40 + (glitchLevel * 20)); // Erhöht für bessere rhythmische Dynamik
    const maxVeins = Math.min(150, baseVeins); // Erhöht für mehr initiale Veins
    const initialVeins = generateColoredVeins(bgWidth, bgHeight, maxVeins, viewportWidth, viewportHeight);
    
    // Initialisiere Lebensdauer-Tracking für alle initialen Veins
    const currentTime = Date.now();
    initialVeins.forEach(vein => {
      const key = `${vein.x}-${vein.y}`;
      veinLifetimeRef.current.set(key, currentTime);
    });
    
    setColoredVeins(initialVeins);
    
    return () => {
      clearAllIntervals();
      clearBackgroundCache();
    };
  }, [glitchLevel, getBackgroundDimensions, clearAllIntervals, clearBackgroundCache]);
  
  // OPTIMIERT: Resize-Handler mit besserer Performance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let resizeTimeout: NodeJS.Timeout | null = null;
    
    const handleResize = () => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      
      // OPTIMIERT: Verwende aktuelle Viewport-Dimensionen für Lazy-Rendering
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      
      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins, viewportWidth, viewportHeight));
    };
    
    const debouncedResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(handleResize, 250);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [glitchLevel, getBackgroundDimensions]);
  
  // OPTIMIERT: Direkte Audio-reaktive Effekte - Sofortige Reaktion
  useEffect(() => {
    // OPTIMIERT: Minimales Throttling für unmittelbarere Reaktionen
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < 8) { // 8ms Throttling = 120fps für maximale Reaktivität
      return;
    }
    
    lastUpdateTimeRef.current = now;
    
    // OPTIMIERT: Direkte State-Updates ohne Batch-System
    
    // Glow-Effekte (höchste Priorität) - Sehr niedrige Schwellenwerte
    if (beatDetected || energy > 0.02) { // Reduziert auf 0.02 für maximale Reaktivität
      const randomIntensity = Math.random() * 0.8 + 0.2;
      setGlowIntensity(randomIntensity);
    }
    
    // Tile-Effekte - Sehr niedrige Schwellenwerte
    if (beatDetected || energy > 0.01) { // Reduziert auf 0.01
      const tempIntensity = { ...colorEffectIntensity };
      for (const level in tempIntensity) {
        if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
          const numLevel = Number(level) as keyof typeof colorEffectIntensity;
          tempIntensity[numLevel] = Math.min(4, tempIntensity[numLevel] + Math.floor(energy * (beatDetected ? 4 : 3)));
        }
      }
      
      setColoredTiles(generateColoredTiles(swordPositions, glitchLevel, tempIntensity));
      
      // Cleanup für Tile-Effekte
      const duration = beatDetected ? 600 : 500;
      const timeout = setTimeout(() => {
        setColoredTiles(generateColoredTiles(swordPositions, glitchLevel, colorEffectIntensity));
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
    
    // Unicode-Glitch-Effekte - Sehr niedrige Schwellenwerte
    if (beatDetected || energy > 0.03) { // Reduziert auf 0.03
      const tempGlitchLevel = Math.min(3, Math.floor(glitchLevel + (energy * 2.5)));
      
      setUnicodeGlitches(generateUnicodeGlitches(swordPositions, tempGlitchLevel));
      
      // Cleanup für Unicode-Glitch-Effekte
      const duration = beatDetected ? 150 : Math.max(120, Math.min(250, Math.floor(energy * 200)));
      const timeout = setTimeout(() => {
        setUnicodeGlitches([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
    
    // Hintergrund-Effekte - Erhöhte Chance auf 2% für mehr Stimmungswechsel
    if ((beatDetected && Math.random() < 0.02) || energy > 0.85) { // Erhöht auf 2% Chance bei Beat, 0.85 Energy-Schwelle
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
    }
    
    // OPTIMIERT: Rhythmische Vein-Dynamik - viele Veins, lange Lebensdauer, Beat-getrieben
    if ((beatDetected && Math.random() < 0.6) || energy > 0.05) { // Erhöht auf 0.6 Chance bei Beat, 0.05 Energy-Schwelle
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      // OPTIMIERT: Rhythmische Vein-Generierung mit Beat-Synchronisation
      const currentTime = Date.now();
      const baseVeins = Math.floor(30 + energy * 80); // Erhöht auf 30 Basis-Veins + 80 pro Energy
      const targetVeins = Math.min(maxVeinsRef.current, baseVeins);
      
      // Verwende einen deterministischen Seed basierend auf Energy und Beat für rhythmische Dynamik
      const timeSeed = Math.floor(currentTime / 1000); // 1-Sekunden-basiert für Beat-Synchronisation
      const energySeed = Math.floor(energy * 100);
      const beatSeed = beatDetected ? 1 : 0;
      const pseudoRandomSeed = timeSeed + energySeed + beatSeed;
      
      // Generiere neue Veins bei Beat oder wenn zu wenige vorhanden sind
      if (beatDetected || Math.abs(pseudoRandomSeed - lastVeinSeedRef.current) > 2 || coloredVeins.length < targetVeins * 0.4) {
        lastVeinSeedRef.current = pseudoRandomSeed;
        
        // OPTIMIERT: Beat-getriebene Vein-Generierung
        const newVeinsCount = beatDetected 
          ? Math.floor(targetVeins * 0.6) // Mehr Veins bei Beat
          : Math.floor(targetVeins * 0.3); // Weniger Veins bei normaler Energy
        
        const newVeins = generateColoredVeins(bgWidth, bgHeight, newVeinsCount, viewportWidth, viewportHeight);
        
        // Füge neue Veins zu bestehenden hinzu
        const combinedVeins = [...coloredVeins, ...newVeins];
        
        // OPTIMIERT: Sanfte Vein-Bereinigung - nur bei Überlast und nur die ältesten 10%
        if (combinedVeins.length > maxVeinsRef.current) {
          // Sortiere nach Lebensdauer und entferne nur die ältesten 10%
          const veinsToRemove = Math.floor(combinedVeins.length * 0.1); // Reduziert von 20% auf 10%
          const sortedVeins = combinedVeins.sort((a, b) => {
            const aKey = `${a.x}-${a.y}`;
            const bKey = `${b.x}-${b.y}`;
            const aLifetime = veinLifetimeRef.current.get(aKey) || 0;
            const bLifetime = veinLifetimeRef.current.get(bKey) || 0;
            return aLifetime - bLifetime;
          });
          
          // Entferne nur die ältesten Veins
          const filteredVeins = sortedVeins.slice(veinsToRemove);
          
          // Aktualisiere Lebensdauer-Tracking
          veinLifetimeRef.current.clear();
          filteredVeins.forEach(vein => {
            const key = `${vein.x}-${vein.y}`;
            veinLifetimeRef.current.set(key, currentTime);
          });
          
          setColoredVeins(filteredVeins);
        } else {
          // Füge neue Veins hinzu und aktualisiere Lebensdauer
          newVeins.forEach(vein => {
            const key = `${vein.x}-${vein.y}`;
            veinLifetimeRef.current.set(key, currentTime);
          });
          
          setColoredVeins(combinedVeins);
        }
      }
    }
    
  }, [beatDetected, energy, glitchLevel, swordPositions, getBackgroundDimensions]);
  
  // OPTIMIERT: Audio-reaktive Farb-Effekte - Reduzierte Empfindlichkeit um 50%
  useEffect(() => {
    if ((energy > 0.1 || beatDetected) && Date.now() - lastColorChangeTime > colorStability) { // Erhöht auf 0.1 (50% weniger empfindlich)
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      const newStability = energy > 0.6 // Erhöht auf 0.6 (50% weniger empfindlich)
        ? Math.max(200, Math.floor(800 - (energy * 600)))
        : Math.floor(800 + Math.random() * 1200);
      
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(newStability);
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // OPTIMIERT: Audio-reaktive Edge-Effekte - Sofortige Reaktion
  useEffect(() => {
    if (beatDetected || energy > 0.02) { // Reduziert auf 0.02
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
      
      const vibrationChance = vibrationIntensity[chargeLevel as keyof typeof vibrationIntensity] || 0.2;
      const glitchChance = glitchFrequency[chargeLevel as keyof typeof glitchFrequency] || 0.1;
      const colorChance = colorEffectFrequency[chargeLevel as keyof typeof colorEffectFrequency] || 0.15;
      
      const glitchMultiplier = chargeLevel === 2 ? 1.5 : 1;
      const energyMultiplier = 1 + (energy * 2.5);
      
      const effectiveVibrationChance = Math.min(0.98, vibrationChance * energyMultiplier);
      const effectiveGlitchChance = Math.min(0.98, glitchChance * glitchMultiplier * energyMultiplier);
      const effectiveColorChance = Math.min(0.98, colorChance * energyMultiplier);
      
      edgePositions.forEach(pos => {
        if (Math.random() < effectiveVibrationChance) {
          const offsetX = Math.random() < 0.5 ? -1 : 1;
          const offsetY = Math.random() < 0.5 ? -1 : 1;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
        }
        
        if (Math.random() < effectiveGlitchChance) {
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
        }
        
        if (Math.random() < effectiveColorChance) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // Cleanup für Edge-Effekte
      const duration = beatDetected ? 120 : Math.max(80, Math.min(150, Math.floor(energy * 150)));
      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
  }, [beatDetected, energy, chargeLevel, edgePositions]);
  
  // OPTIMIERT: Memoisierte Berechnungen für Rendering
  const shadowSize = useMemo(() => Math.floor(glowIntensity * 20), [glowIntensity]);
  const textShadow = useMemo(() => `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`, [shadowSize, glitchLevel, baseColor]);
  const backgroundColor = useMemo(() => getDarkerColor(bgColor), [bgColor]);
  const lighterBgColor = useMemo(() => getLighterColor(bgColor), [bgColor]);

  return (
    <div 
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ 
        backgroundColor,
        transition: 'background-color 0.03s ease',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Höhlen-Hintergrund */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: 0.45 + (glitchLevel * 0.08),
          color: lighterBgColor,
          filter: `brightness(${0.35 + (glitchLevel * 0.075)}) contrast(${0.65 + (glitchLevel * 0.05)})`,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0
        }}
      >
        <div 
          className="w-full h-full"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'scale(1.5)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <pre className="font-mono text-sm sm:text-base leading-[0.9] whitespace-pre select-none" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {caveBackground.map((row, y) => (
              <div key={y} style={{ lineHeight: '0.9', width: '100%', textAlign: 'center' }}>
                {row.map((char, x) => {
                  const vein = coloredVeins.find(v => v.x === x && v.y === y);
                  
                  const style: React.CSSProperties = vein ? {
                    color: vein.color,
                    textShadow: `0 0 ${2 + glitchLevel}px ${vein.color}`,
                    display: 'inline-block',
                    filter: `contrast(${0.65 + (glitchLevel * 0.05)})`,
                    transform: ''
                  } : { 
                    display: 'inline-block',
                    transform: ''
                  };
                  
                  const skewEffect = skewedChars.find(c => c.x === x && c.y === y);
                  if (skewEffect) {
                    style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
                  }
                  
                  const fadeEffect = fadedChars.find(c => c.x === x && c.y === y);
                  if (fadeEffect) {
                    style.opacity = String(fadeEffect.opacity);
                  }
                  
                  if (glitchLevel >= 2 && Math.random() < 0.001 * glitchLevel) {
                    style.color = accentColors[Math.floor(Math.random() * accentColors.length)];
                    style.textShadow = `0 0 ${2 + glitchLevel}px ${style.color}`;
                  }
                  
                  return (
                    <span 
                      key={`bg-${x}-${y}`}
                      style={style}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            ))}
          </pre>
        </div>
      </div>
      
      {/* Schwert im Vordergrund */}
      <pre
        className="relative z-10 font-mono text-xs sm:text-sm md:text-base lg:text-lg whitespace-pre select-none"
        style={{
          color: baseColor,
          textShadow,
          letterSpacing: '0.1em',
          textAlign: 'center',
          width: '100%',
          lineHeight: '1.2',
          transition: 'color 0.05s ease'
        }}
      >
        {centeredSwordLines.map((line, y) => (
          <div key={y} style={{ 
            display: 'block',
            width: '100%'
          }}>
            {Array.from(line).map((char, x) => {
              const glitch = glitchChars.find(g => g.x === x && g.y === y);
              const unicodeGlitch = unicodeGlitches.find(g => g.x === x && g.y === y);
              const coloredTile = coloredTiles.find(t => t.x === x && t.y === y);
              const edgeEffect = edgeEffects.find(e => e.x === x && e.y === y);
              const isEdge = isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines);
              
              let style: React.CSSProperties = { 
                display: 'inline-block',
                transform: '',
                filter: '',
                opacity: undefined,
                color: undefined,
                textShadow: undefined
              };
              
              if (edgeEffect?.color) {
                style.color = edgeEffect.color;
                style.textShadow = `0 0 ${shadowSize}px ${edgeEffect.color}`;
              } else if (coloredTile) {
                style.color = coloredTile.color;
                style.textShadow = `0 0 ${shadowSize}px ${coloredTile.color}`;
              }
              
              if (edgeEffect?.offset) {
                style.transform = `translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`;
              }
              
              const isBlurred = blurredChars.some(c => c.x === x && c.y === y);
              if (isBlurred) {
                style.filter = `${style.filter || ''} blur(1px)`.trim();
              }
              
              const skewEffect = skewedChars.find(c => c.x === x && c.y === y);
              if (skewEffect) {
                style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
              }
              
              const fadeEffect = fadedChars.find(c => c.x === x && c.y === y);
              if (fadeEffect) {
                style.opacity = String(fadeEffect.opacity);
              }
              
              const displayChar = unicodeGlitch ? unicodeGlitch.char : 
                                 glitch ? glitch.char : 
                                 edgeEffect?.char ? edgeEffect.char : 
                                 char;
              
              return (
                <span 
                  key={`sword-${x}-${y}`}
                  style={style}
                >
                  {displayChar}
                </span>
              );
            })}
          </div>
        ))}
      </pre>
    </div>
  );
}