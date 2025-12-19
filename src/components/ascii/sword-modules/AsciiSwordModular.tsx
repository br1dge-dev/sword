"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
 * OPTIMIERT: Direkte Reaktionen, einfachere State-Updates, sofortige Audio-Reaktivität
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAudioReactionStore, useBeatReset } from '@/store/audioReactionStore';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';


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
import { generateCaveBackground, generateColoredVeins, generateIdleVeinSequence, generateBeatVeins } from './effects/backgroundEffects';
import { generateHarmonicColorPair } from './effects/colorEffects';
import { computeAdaptiveColorCycle, computeOptimizedColorCycle } from './effects/colorCycle';
import { computeBeatVeinLifetimeMs, mapToVeins, pruneVeinsByLifetime, replaceVeinsInMap } from './effects/veinLifecycle';
import {
  generateEdgeGlitches,
  generateUnicodeGlitches,
  generateBlurredChars,
  generateSkewedChars,
  generateFadedChars
} from './effects/glitchEffects';
import { generateColoredTiles, generateGlitchChars } from './effects/tileEffects';
import { generateFrequencyVeins } from './effects/frequencyVeins';
import { getIdleTilesForIndex, nextIdleTilesColorIndex } from './effects/idleTiles';
import { generateReactiveEdgeEffects } from './effects/edgeEffects';
import React from 'react'; // Added missing import for React
import AsciiBackgroundCanvas from './AsciiBackgroundCanvas';
import { useSwordAudioState, useSwordPowerUpState } from './hooks/useSwordStores';

export default function AsciiSwordModular({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = useSwordPowerUpState();
  
  // Audio-Reaktionsdaten abrufen
  const { energy: storeEnergy, beatDetected: storeBeat, isMusicPlaying, idle } = useSwordAudioState();
  
  // Verwende direkte Werte, wenn verfügbar, sonst aus dem Store
  const energy = directEnergy !== undefined ? directEnergy : storeEnergy;
  const beatDetected = directBeat !== undefined ? directBeat : storeBeat;
  
  // Automatisches Beat-Reset aktivieren
  useBeatReset(500);
  
  // Idle-Animation läuft jetzt im Layout, nicht mehr hier
  

  
  // OPTIMIERT: Intelligentes Vein-Management-System
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const cleanupTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const lastVeinSeedRef = useRef<number>(0); // Pseudo-random Seed für Vein-Generierung
  const veinLifetimeRef = useRef<Map<string, number>>(new Map()); // Vein-Lebensdauer-Tracking
  const maxVeinsRef = useRef<number>(500); // Erhöht auf 500 für mehr Veins
  const veinCleanupIntervalRef = useRef<number>(20000); // Erhöht von 15000ms auf 20000ms für bessere Performance
  const veinGenerationIntervalRef = useRef<number>(12000); // Erhöht von 8000ms auf 12000ms für bessere Performance
  const lastVeinLogTimeRef = useRef<number>(0);
  const idleStepRef = useRef<number>(0); // Für Idle-Animation Schritte
  
  // NEU: Tile-Management-System
  const currentTilesRef = useRef<Array<{x: number, y: number, color: string}>>([]);
  const tileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tileBirthTimeRef = useRef<number>(0); // Geburtszeit der aktuellen Tiles
  // --- TILE-LOCK für Mindestlebensdauer ---
  const TILE_LOCK_MS = 200;
  const tileLockedRef = useRef(false);

  // OPTIMIERT: Log-Throttling für bessere Performance
  const lastLogTimeRef = useRef<number>(0);
  const logThrottleInterval = 1000; // 1 Sekunde zwischen Logs

  const throttledLog = (message: string, force: boolean = false) => {
    const now = Date.now();
    if (force || now - lastLogTimeRef.current > logThrottleInterval) {
      console.log(`[AsciiSword] ${message}`);
      lastLogTimeRef.current = now;
    }
  };

  // Vein-Handling als Map
  const veinsMapRef = useRef(new Map<string, {vein: {x: number, y: number, color: string}, birth: number}>());

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

  // Effizientere Cleanup-Funktionen
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
    // setCaveBackground([]); // Entfernt
    // setColoredVeins([]); // Entfernt
  }, []);
  
  // Initialisierung/Background-Update: Veins ergänzen und State setzen
  useEffect(() => {
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
    const currentTime = Date.now();
    const baseVeins = Math.floor(10 + (glitchLevel * 5));
    const maxVeins = Math.min(50, baseVeins);
    const initialVeins = generateColoredVeins(bgWidth, bgHeight, maxVeins, viewportWidth, viewportHeight);
    initialVeins.forEach(vein => {
      const key = `${vein.x}-${vein.y}`;
      // Wenn schon vorhanden, Zeitstempel aktualisieren
      veinsMapRef.current.set(key, { vein, birth: currentTime });
    });
    setColoredVeins(mapToVeins(veinsMapRef.current));
    return () => {
      clearAllIntervals();
      clearBackgroundCache();
    };
  }, [glitchLevel, getBackgroundDimensions, clearAllIntervals, clearBackgroundCache]);

  // Resize-Handler: Veins ergänzen und State setzen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      const currentTime = Date.now();
      const newVeins = generateColoredVeins(bgWidth, bgHeight, numVeins, viewportWidth, viewportHeight);
      newVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      });
      setColoredVeins(mapToVeins(veinsMapRef.current));
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

  // Vein-Generierung: Mehr Aktivität, Debug-Log
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Hole aktuelle Background-Dimensionen
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      let changed = false;
      // Entferne abgelaufene Veins
      veinsMapRef.current.forEach((value, key) => {
        if (now - value.birth > 10000) {
          veinsMapRef.current.delete(key);
          changed = true;
        }
      });
      // Dynamische Vein-Generierung
      let newVeins = 0;
      if (energy > 0.05 && veinsMapRef.current.size < maxVeinsRef.current) {
        const count = Math.floor(Math.random() * 11) + 10; // 10–20 neue Veins (erhöht von 1-3)
        for (let i = 0; i < count; i++) {
          let x, y, pos, tries = 0;
          do {
            x = Math.floor(Math.random() * bgWidth);
            y = Math.floor(Math.random() * bgHeight);
            pos = `${x}_${y}`;
            tries++;
          } while (veinsMapRef.current.has(pos) && tries < 10);
          if (!veinsMapRef.current.has(pos)) {
            const color = accentColors[Math.floor(Math.random() * accentColors.length)];
            veinsMapRef.current.set(pos, { vein: { x, y, color }, birth: now });
            newVeins++;
            changed = true;
          }
        }
      }
      if (beatDetected && veinsMapRef.current.size < maxVeinsRef.current) {
        const count = Math.floor(Math.random() * 21) + 30; // 30–50 neue Veins (erhöht von 3-5)
        for (let i = 0; i < count; i++) {
          let x, y, pos, tries = 0;
          do {
            x = Math.floor(Math.random() * bgWidth);
            y = Math.floor(Math.random() * bgHeight);
            pos = `${x}_${y}`;
            tries++;
          } while (veinsMapRef.current.has(pos) && tries < 10);
          if (!veinsMapRef.current.has(pos)) {
            const color = accentColors[Math.floor(Math.random() * accentColors.length)];
            veinsMapRef.current.set(pos, { vein: { x, y, color }, birth: now });
            newVeins++;
            changed = true;
          }
        }
      }
      if (changed) {
        setColoredVeins(mapToVeins(veinsMapRef.current));
      }
      // Debug-Log nur bei signifikanten Änderungen
      if (newVeins > 0) {
        const now = Date.now();
        if (now - lastVeinLogTimeRef.current > 10000) {
          throttledLog(`Veins active: ${veinsMapRef.current.size}, new: ${newVeins}, energy: ${energy.toFixed(2)}`);
          lastVeinLogTimeRef.current = now;
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [energy, beatDetected, getBackgroundDimensions]);

  // Intervall: Entferne abgelaufene Veins und aktualisiere das Overlay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      veinsMapRef.current.forEach((value, key) => {
        if (now - value.birth > 10000) {
          veinsMapRef.current.delete(key);
          changed = true;
        }
      });
      if (changed) {
        setColoredVeins(mapToVeins(veinsMapRef.current));
      }
    }, 100);
    return () => clearInterval(interval);
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
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor('#00FCA6'));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(3000); // Erhöht von 2000 auf 3000 für sanftere Farbübergänge
  const [coloredTiles, setColoredTiles] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [glitchChars, setGlitchChars] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [caveBackground, setCaveBackground] = useState<string[][]>([]);
  const [coloredVeins, setColoredVeins] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [edgeEffects, setEdgeEffects] = useState<Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}, rotation?: number, fontSize?: number}>>([]);
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
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
    setBackgroundGenerated(false);
    // Initialisiere Lebensdauer-Tracking für alle initialen Veins
    const currentTime = Date.now();
    const baseVeins = Math.floor(10 + (glitchLevel * 5));
    const maxVeins = Math.min(50, baseVeins);
    const initialVeins = generateColoredVeins(bgWidth, bgHeight, maxVeins, viewportWidth, viewportHeight);
    initialVeins.forEach(vein => {
      const key = `${vein.x}-${vein.y}`;
      if (!veinsMapRef.current.has(key)) {
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      }
    });
    // KEIN setColoredVeins mehr hier!
    return () => {
      clearAllIntervals();
      clearBackgroundCache();
    };
    // Intentionally run only on mount: re-running on `glitchLevel` changes would
    // reset background/veins mid-session and can feel jarring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getBackgroundDimensions, clearAllIntervals, clearBackgroundCache]);
  
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
      
      // OPTIMIERT: Statischen Hintergrund zurücksetzen, damit er neu generiert wird
      setBackgroundGenerated(false);

      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      const currentTime = Date.now();
      const newVeins = generateColoredVeins(bgWidth, bgHeight, numVeins, viewportWidth, viewportHeight);
      newVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        if (!veinsMapRef.current.has(key)) {
          veinsMapRef.current.set(key, { vein, birth: currentTime });
        }
      });
      // KEIN setColoredVeins mehr hier!
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
  
  // Pattern-Wechsel: alle 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      
      // OPTIMIERT: Statischen Hintergrund zurücksetzen, damit er neu generiert wird
      setBackgroundGenerated(false);
      
      throttledLog('Background pattern changed');
    }, 10000);
    return () => clearInterval(interval);
  }, [getBackgroundDimensions]);

  // Beim Setzen von caveBackground: Padding jeder Zeile auf gleiche Länge
  function padBackgroundRows(bg: string[][]): string[][] {
    const maxLen = Math.max(...bg.map(row => row.length));
    return bg.map(row => {
      if (row.length < maxLen) {
        return [...row, ...Array(maxLen - row.length).fill(' ')];
      }
      return row;
    });
  }

  // OPTIMIERT: Statischer Hintergrund - nur einmal generieren und dann konstant halten
  const [staticBackground, setStaticBackground] = useState<string[][]>([]);
  const [backgroundGenerated, setBackgroundGenerated] = useState(false);

  // OPTIMIERT: Statischen Hintergrund nur einmal generieren
  useEffect(() => {
    if (caveBackground.length > 0 && !backgroundGenerated) {
      const paddedBackground = padBackgroundRows(caveBackground);
      setStaticBackground(paddedBackground);
      setBackgroundGenerated(true);
    }
  }, [caveBackground, backgroundGenerated]);

  // OPTIMIERT: Reaktive Audio-Effekte für visuellen Impact
  useEffect(() => {
    // OPTIMIERT: Niedrige Latenz für visuellen Impact
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < 50) { // Reduziert von 100ms auf 50ms für maximale Reaktivität
      return;
    }
    
    // OPTIMIERT: Empfindlichere Reaktion für visuellen Impact
    if (energy < 0.005 && !beatDetected) { // Noch empfindlicher: ab 0.005
      return;
    }
    
    lastUpdateTimeRef.current = now;
    
    // OPTIMIERT: Reaktive Effekt-Aktivität für visuellen Impact
    let effectsTriggered = 0;
    const MAX_EFFECTS_PER_UPDATE = 1; // Zurück zu 1 Effekt pro Update für besseren visuellen Impact
    
    // Glow-Effekte - Reaktiver für visuellen Impact
    if ((beatDetected && effectsTriggered < MAX_EFFECTS_PER_UPDATE) || energy > 0.03) { // Noch empfindlicher: ab 0.03
      const randomIntensity = Math.random() * 0.15 + 0.05; // Zurück zu 0.15 für besseren visuellen Impact
      setGlowIntensity(randomIntensity);
      effectsTriggered++;
    }
    
    // Tile-Effekte - REAKTIVER: Bei jedem Beat oder höherer Energy
    if (beatDetected || energy > 0.02) { // Empfindlicher: ab 0.02 statt 0.03
      const now = Date.now();
      // Wenn Tiles gelockt sind, keine neue Generierung zulassen
      if (tileLockedRef.current) {
        return;
      }
      // Wenn Tiles existieren, entferne sie (nach Ablauf des Locks)
      if (currentTilesRef.current.length > 0) {
        const removeAge = now - tileBirthTimeRef.current;
        if (removeAge < TILE_LOCK_MS) {
          if (tileTimeoutRef.current) {
            clearTimeout(tileTimeoutRef.current);
            tileTimeoutRef.current = null;
          }
          tileLockedRef.current = true;
          tileTimeoutRef.current = setTimeout(() => {
            currentTilesRef.current = [];
            setColoredTiles([]);
            tileBirthTimeRef.current = 0;
            tileLockedRef.current = false;
            // Nach Ablauf des Locks: neue Tiles generieren, falls Event noch gültig
            if (beatDetected || energy > 0.02) {
              // (Kopiere den Generierungsblock von unten hierher)
              const tempIntensity = { ...colorEffectIntensity };
              for (const level in tempIntensity) {
                if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
                  const numLevel = Number(level) as keyof typeof colorEffectIntensity;
                  tempIntensity[numLevel] = Math.min(2, tempIntensity[numLevel] + Math.floor(energy * (beatDetected ? 1 : 0.5)));
                }
              }
              const generatedTiles = generateColoredTiles(swordPositions, glitchLevel, tempIntensity, energy);
              currentTilesRef.current = generatedTiles;
              tileBirthTimeRef.current = Date.now();
              setColoredTiles(generatedTiles);
              // Lock erneut setzen
              tileLockedRef.current = true;
              if (tileTimeoutRef.current) {
                clearTimeout(tileTimeoutRef.current);
              }
              tileTimeoutRef.current = setTimeout(() => {
                const removeAge2 = Date.now() - tileBirthTimeRef.current;
                currentTilesRef.current = [];
                tileBirthTimeRef.current = 0;
                setColoredTiles([]);
                tileTimeoutRef.current = null;
                tileLockedRef.current = false;
              }, TILE_LOCK_MS);
            }
          }, TILE_LOCK_MS - removeAge);
          return;
        }
        // Tiles sind alt genug, können entfernt werden
        currentTilesRef.current = [];
        setColoredTiles([]);
        tileBirthTimeRef.current = 0;
        tileLockedRef.current = false;
        if (tileTimeoutRef.current) {
          clearTimeout(tileTimeoutRef.current);
          tileTimeoutRef.current = null;
        }
      }
      // Jetzt neue Tiles generieren
      const tempIntensity = { ...colorEffectIntensity };
      for (const level in tempIntensity) {
        if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
          const numLevel = Number(level) as keyof typeof colorEffectIntensity;
          tempIntensity[numLevel] = Math.min(2, tempIntensity[numLevel] + Math.floor(energy * (beatDetected ? 1 : 0.5)));
        }
      }
      const generatedTiles = generateColoredTiles(swordPositions, glitchLevel, tempIntensity, energy);
      currentTilesRef.current = generatedTiles;
      tileBirthTimeRef.current = now;
      setColoredTiles(generatedTiles);
      effectsTriggered++;
      // Lock setzen
      tileLockedRef.current = true;
      if (tileTimeoutRef.current) {
        clearTimeout(tileTimeoutRef.current);
      }
      tileTimeoutRef.current = setTimeout(() => {
        const removeAge = Date.now() - tileBirthTimeRef.current;
        currentTilesRef.current = [];
        tileBirthTimeRef.current = 0;
        setColoredTiles([]);
        tileTimeoutRef.current = null;
        tileLockedRef.current = false;
      }, TILE_LOCK_MS);
    } else {
    }
    // ENTFERNT: Sofortiges Entfernen der Tiles wenn keine Bedingungen erfüllt sind
    // Tiles leben jetzt bis zu 3 Sekunden, auch wenn keine neuen Effekte ausgelöst werden
    
    // OPTIMIERT: Reduzierte Unicode-Glitch-Effekte für bessere Performance
    if (beatDetected && effectsTriggered < MAX_EFFECTS_PER_UPDATE) {
      const tempGlitchLevel = Math.min(1, Math.floor(glitchLevel + (energy * 1.0))); // Reduziert von 2/1.5 auf 1/1.0
      
      setUnicodeGlitches(generateUnicodeGlitches(swordPositions, tempGlitchLevel));
      
      // OPTIMIERT: Längere Cleanup-Dauer
      const duration = beatDetected ? 500 : Math.max(400, Math.min(600, Math.floor(energy * 300))); // Erhöht von 300/250-400 auf 500/400-600 für weniger Flackern
      const timeout = setTimeout(() => {
        setUnicodeGlitches([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
    
    // OPTIMIERT: Reduzierte Hintergrund-Effekte für bessere Performance
    if ((beatDetected && Math.random() < 0.0008) || energy > 0.95) { // Reduziert von 0.001 auf 0.0008 (20% weniger)
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      
      // OPTIMIERT: Statischen Hintergrund zurücksetzen, damit er neu generiert wird
      setBackgroundGenerated(false);
    }
    
  }, [beatDetected, energy, glitchLevel, swordPositions, getBackgroundDimensions]);
  
  // OPTIMIERT: Separater useEffect für Idle-Animation (nur wenn Musik NICHT spielt)
  useEffect(() => {
    if (idle) {
      // WICHTIG: Stoppe Idle-Animation sofort wenn Musik spielt
      if (isMusicPlaying) {
        return;
      }
      
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      // Erhöhe den Idle-Schritt bei jedem Beat
      if (beatDetected) {
        idleStepRef.current = (idleStepRef.current + 1) % 10; // 10 Schritte pro Loop
      }
      
      // Generiere vordefinierte Vein-Sequenz für den aktuellen Schritt
      const idleVeins = generateIdleVeinSequence(bgWidth, bgHeight, idleStepRef.current, viewportWidth, viewportHeight);
      
      // Ersetze alle bestehenden Veins mit der Idle-Sequenz
      const currentTime = Date.now();
      replaceVeinsInMap(veinsMapRef.current, idleVeins, currentTime);
      
      // Setze das State-Array für das Rendering
      setColoredVeins(mapToVeins(veinsMapRef.current));
    }
  }, [beatDetected, getBackgroundDimensions, isMusicPlaying, idle]);
  
  // NEU: Adaptive Audio-reaktive Farb-Effekte basierend auf tatsächlichen Energy-Werten
  useEffect(() => {
    const nowCheck = Date.now();
    const result = computeAdaptiveColorCycle({
      energy,
      beatDetected,
      lastColorChangeTime,
      colorStability,
      nowMs: nowCheck,
    });

    if (result) {
      setBaseColor(result.swordColor);
      setBgColor(result.bgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(result.newStability);
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // OPTIMIERT: Verbesserte Audio-reaktive Edge-Effekte basierend auf Charge-Level
  useEffect(() => {
    if (beatDetected || energy > 0.03) { // Noch empfindlicher: ab 0.03
      if (edgePositions.length === 0) return;

      const { effects, cleanupMs } = generateReactiveEdgeEffects({
        edgePositions,
        chargeLevel,
        energy,
        beatDetected,
      });

      setEdgeEffects(effects);

      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, cleanupMs);
      cleanupTimeoutsRef.current.add(timeout);
    }
  }, [beatDetected, energy, chargeLevel, edgePositions]);
  
  // --- IDLE TILE COLOR CYCLE ---
  useEffect(() => {
    if (idle) {
      // WICHTIG: Stoppe Idle-Animation sofort wenn Musik spielt
      if (isMusicPlaying) {
        // ENTFERNT: Sofortiges Entfernen der Tiles - Musik-Effekte sollen leben bleiben
        return;
      }
      
      // Im Idle: Alle Animationen stoppen
      setGlowIntensity(0);
      setGlitchChars([]);
      setUnicodeGlitches([]);
      setEdgeEffects([]);
      setBlurredChars([]);
      setSkewedChars([]);
      setFadedChars([]);
      // Starte sanften Farbwechsel für Tiles
      let colorIndex = 0;
      
      // NEU: Nur Idle-Tiles setzen wenn keine Musik-Tiles leben
      if (currentTilesRef.current.length === 0) {
        const idleTiles = getIdleTilesForIndex(swordPositions, colorIndex);
        currentTilesRef.current = idleTiles;
        tileBirthTimeRef.current = Date.now(); // Setze Geburtszeit für Idle-Tiles
        setColoredTiles(idleTiles);
      }
      
      const interval = setInterval(() => {
        // Prüfe nochmal, ob Musik läuft
        if (isMusicPlaying) {
          clearInterval(interval);
          // ENTFERNT: Sofortiges Entfernen der Tiles - Musik-Effekte sollen leben bleiben
          return;
        }
        
        // NEU: Nur Idle-Tiles setzen wenn keine Musik-Tiles leben
        if (currentTilesRef.current.length === 0) {
          colorIndex = nextIdleTilesColorIndex(colorIndex);
          const idleTiles = getIdleTilesForIndex(swordPositions, colorIndex);
          currentTilesRef.current = idleTiles;
          tileBirthTimeRef.current = Date.now(); // Setze Geburtszeit für Idle-Tiles
          setColoredTiles(idleTiles);
        }
      }, 2000); // alle 2 Sekunden
      return () => {
        clearInterval(interval);
        // ENTFERNT: Sofortiges Entfernen der Tiles beim Cleanup
      };
    }
    // ENTFERNT: Sofortiges Entfernen der Tiles wenn Idle verlassen wird
    // Musik-Effekte sollen ihre natürliche Lebensdauer haben
  }, [swordPositions, isMusicPlaying, idle]);

  // --- ALLE ANIMATIONEN NUR WENN NICHT IDLE ---
  useEffect(() => {
    if (idle) return;
    // OPTIMIERT: Dynamische Beat-Vein-Generierung für bessere Visualisierung
    if (beatDetected || energy > 0.05) { // Empfindlicher: ab 0.05 Energy
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      // OPTIMIERT: Verwende neue Beat-Vein-Funktion für bessere Performance
      const currentTime = Date.now();
      
      // Generiere Beat-Veins basierend auf Energy und Beat
      const beatVeins = generateBeatVeins(bgWidth, bgHeight, energy, beatDetected, viewportWidth, viewportHeight);
      
      // Ersetze alle bestehenden Veins mit den neuen Beat-Veins
      replaceVeinsInMap(veinsMapRef.current, beatVeins, currentTime);
      
      // Setze das State-Array für das Rendering
      setColoredVeins(mapToVeins(veinsMapRef.current));
      
      // OPTIMIERT: Längere Lebensdauer für Beat-Veins (4-10 Sekunden)
      const veinLifetime = computeBeatVeinLifetimeMs(energy, beatDetected);
      
      // Cleanup nach der Lebensdauer
      const timeout = setTimeout(() => {
        const now = Date.now();
        const changed = pruneVeinsByLifetime(veinsMapRef.current, now, veinLifetime);
        
        if (changed) {
          setColoredVeins(mapToVeins(veinsMapRef.current));
        }
      }, veinLifetime);
      
      cleanupTimeoutsRef.current.add(timeout);
    }
    
  }, [beatDetected, energy, glitchLevel, swordPositions, getBackgroundDimensions, idle]);
  
  // OPTIMIERT: Separater useEffect für Idle-Animation (nur wenn Musik NICHT spielt)
  useEffect(() => {
    if (idle) {
      // WICHTIG: Stoppe Idle-Animation sofort wenn Musik spielt
      if (isMusicPlaying) {
        return;
      }
      
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      // Erhöhe den Idle-Schritt bei jedem Beat
      if (beatDetected) {
        idleStepRef.current = (idleStepRef.current + 1) % 10; // 10 Schritte pro Loop
      }
      
      // Generiere vordefinierte Vein-Sequenz für den aktuellen Schritt
      const idleVeins = generateIdleVeinSequence(bgWidth, bgHeight, idleStepRef.current, viewportWidth, viewportHeight);
      
      // Ersetze alle bestehenden Veins mit der Idle-Sequenz
      const currentTime = Date.now();
      replaceVeinsInMap(veinsMapRef.current, idleVeins, currentTime);
      
      // Setze das State-Array für das Rendering
      setColoredVeins(mapToVeins(veinsMapRef.current));
    }
  }, [idle, beatDetected, getBackgroundDimensions, isMusicPlaying]);
  
  // OPTIMIERT: Drastisch reduzierte Audio-reaktive Farb-Effekte für bessere Performance
  useEffect(() => {
    if (idle) return;
    const nowCheck = Date.now();
    const result = computeOptimizedColorCycle({
      energy,
      beatDetected,
      lastColorChangeTime,
      colorStability,
      nowMs: nowCheck,
    });

    if (result) {
      setBaseColor(result.swordColor);
      setBgColor(result.bgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(result.newStability);
      // performanceMonitor.trackColorChange(); // Entfernt
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability, idle]);
  
  // OPTIMIERT: Verbesserte Audio-reaktive Edge-Effekte basierend auf Charge-Level
  useEffect(() => {
    if (idle) return;
    if (beatDetected || energy > 0.03) { // Noch empfindlicher: ab 0.03
      if (edgePositions.length === 0) return;

      const { effects, cleanupMs } = generateReactiveEdgeEffects({
        edgePositions,
        chargeLevel,
        energy,
        beatDetected,
      });

      setEdgeEffects(effects);

      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, cleanupMs);
      cleanupTimeoutsRef.current.add(timeout);
    }
  }, [beatDetected, energy, chargeLevel, edgePositions, idle]);
  
  // Frequenzdaten aus dem Store holen
  const frequencyData = useAudioReactionStore((s) => s.frequencyData);

  // In der useEffect für die Vein-Generierung:
  useEffect(() => {
    if (!frequencyData) return;
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    const now = Date.now();
    const veins = generateFrequencyVeins({
      frequencyData,
      bgWidth,
      bgHeight,
      nowMs: now,
      beatDetected,
    });
    setColoredVeins(veins);
  }, [frequencyData, beatDetected, getBackgroundDimensions]);
  
  // OPTIMIERT: Memoisierte Berechnungen für Rendering
  const shadowSize = useMemo(() => Math.floor(glowIntensity * 20), [glowIntensity]);
  const textShadow = useMemo(() => `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`, [shadowSize, glitchLevel, baseColor]);
  const backgroundColor = useMemo(() => getDarkerColor(bgColor), [bgColor]);
  const lighterBgColor = useMemo(() => getLighterColor(bgColor), [bgColor]);

  const setSwordColor = useAudioReactionStore(state => state.setSwordColor);

  useEffect(() => {
    setSwordColor(baseColor);
  }, [baseColor, setSwordColor]);

  return (
    <div 
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ 
        backgroundColor,
        width: '100%',
        height: '100%'
      }}
    >
      {/* Höhlen-Hintergrund */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: 0.45 + (glitchLevel * 0.08),
          color: lighterBgColor,
          filter: `brightness(${0.35 + (glitchLevel * 0.075)}) contrast(${0.65 + (glitchLevel * 0.05)})`,
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <div 
          className="w-full h-full"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'scale(1.65)',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <AsciiBackgroundCanvas
            pattern={staticBackground.length > 0 ? staticBackground : caveBackground}
            veins={coloredVeins}
            width={((staticBackground.length > 0 ? staticBackground[0].length : caveBackground[0]?.length) || 160) * 10}
            height={((staticBackground.length > 0 ? staticBackground.length : caveBackground.length) || 100) * 14}
            fontSize={12}
            fontFamily={'monospace'}
          />
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
          transition: idle ? 'color 2s linear' : undefined
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
              
              // ROTATION-EFFEKT (Charge Level 1+)
              if (edgeEffect?.rotation !== undefined) {
                style.transform = `${style.transform || ''} rotate(${edgeEffect.rotation}deg)`.trim();
              }
              
              if (edgeEffect?.offset) {
                style.transform = `${style.transform || ''} translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`.trim();
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
                  style={{ ...style, transition: idle ? 'color 2s linear' : undefined }}
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