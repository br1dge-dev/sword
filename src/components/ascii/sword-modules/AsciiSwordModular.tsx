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
import {
  generateEdgeGlitches,
  generateUnicodeGlitches,
  generateBlurredChars,
  generateSkewedChars,
  generateFadedChars
} from './effects/glitchEffects';
import { generateColoredTiles, generateGlitchChars } from './effects/tileEffects';
import React from 'react'; // Added missing import for React

export default function AsciiSwordModular({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Audio-Reaktionsdaten abrufen
  const { energy: storeEnergy, beatDetected: storeBeat, isMusicPlaying, isIdleActive } = useAudioReactionStore();
  
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
    setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
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
      setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
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
        setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
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
        setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
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
    
    // OPTIMIERT: Verwende Viewport-Dimensionen für Lazy-Rendering
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
    
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
    
    // OPTIMIERT: Statischen Hintergrund zurücksetzen, damit er neu generiert wird
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
        throttledLog(`Tile-Lock aktiv, keine neue Generierung erlaubt.`);
        return;
      }
      // Wenn Tiles existieren, entferne sie (nach Ablauf des Locks)
      if (currentTilesRef.current.length > 0) {
        const removeAge = now - tileBirthTimeRef.current;
        if (removeAge < TILE_LOCK_MS) {
          throttledLog(`Tile-Lock: Tiles erst ${removeAge}ms alt, warte auf Ablauf von ${TILE_LOCK_MS - removeAge}ms.`);
          if (tileTimeoutRef.current) {
            clearTimeout(tileTimeoutRef.current);
            tileTimeoutRef.current = null;
          }
          tileLockedRef.current = true;
          tileTimeoutRef.current = setTimeout(() => {
            console.log(`[TILE-LIFETIME-LOG] Entferne Tiles nach Tile-Lock, tatsächliche Lebensdauer: ${Date.now() - tileBirthTimeRef.current}ms`);
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
              throttledLog(`(Tile-Lock) Generating tiles: ${generatedTiles.length} tiles, energy: ${energy.toFixed(3)}, beat: ${beatDetected}`);
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
                console.log(`[TILE-LIFETIME-LOG] Entferne Tiles nach regulärem Timeout (Tile-Lock), tatsächliche Lebensdauer: ${removeAge2}ms`);
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
        console.log(`[TILE-LIFETIME-LOG] Entferne Tiles für neue Generation (Tile-Lock), tatsächliche Lebensdauer: ${removeAge}ms`);
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
      throttledLog(`Generating tiles: ${generatedTiles.length} tiles, energy: ${energy.toFixed(3)}, beat: ${beatDetected}`);
      currentTilesRef.current = generatedTiles;
      tileBirthTimeRef.current = now;
      setColoredTiles(generatedTiles);
      effectsTriggered++;
      // Lock setzen
      tileLockedRef.current = true;
      if (tileTimeoutRef.current) {
        clearTimeout(tileTimeoutRef.current);
        throttledLog(`Cleared previous timeout`);
      }
      tileTimeoutRef.current = setTimeout(() => {
        const removeAge = Date.now() - tileBirthTimeRef.current;
        console.log(`[TILE-LIFETIME-LOG] Entferne Tiles nach regulärem Timeout (Tile-Lock), tatsächliche Lebensdauer: ${removeAge}ms`);
        currentTilesRef.current = [];
        tileBirthTimeRef.current = 0;
        setColoredTiles([]);
        tileTimeoutRef.current = null;
        tileLockedRef.current = false;
      }, TILE_LOCK_MS);
      throttledLog(`Timeout set for ${TILE_LOCK_MS}ms (Tile-Lock)`);
    } else {
      throttledLog(`No tile generation: energy=${energy.toFixed(3)}, beat=${beatDetected}, effectsTriggered=${effectsTriggered}, currentTiles=${currentTilesRef.current.length}`);
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
  
  // OPTIMIERT: Dynamische Beat-Vein-Generierung für bessere Visualisierung
  useEffect(() => {
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
      veinsMapRef.current.clear();
      beatVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      });
      
      // Setze das State-Array für das Rendering
      setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
      
      // OPTIMIERT: Längere Lebensdauer für Beat-Veins (4-10 Sekunden)
      const veinLifetime = beatDetected ? 4000 : Math.max(4000, Math.min(10000, Math.floor(energy * 12000)));
      
      // Cleanup nach der Lebensdauer
      const timeout = setTimeout(() => {
        const now = Date.now();
        let changed = false;
        
        Array.from(veinsMapRef.current.entries()).forEach(([key, value]) => {
          if (now - value.birth > veinLifetime) {
            veinsMapRef.current.delete(key);
            changed = true;
          }
        });
        
        if (changed) {
          setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
        }
      }, veinLifetime);
      
      cleanupTimeoutsRef.current.add(timeout);
    }
    
  }, [beatDetected, energy, glitchLevel, swordPositions, getBackgroundDimensions, setColoredVeins]);
  
  // OPTIMIERT: Separater useEffect für Idle-Animation (nur wenn Musik NICHT spielt)
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) {
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
      veinsMapRef.current.clear();
      const currentTime = Date.now();
      idleVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      });
      
      // Setze das State-Array für das Rendering
      setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
    }
  }, [beatDetected, getBackgroundDimensions, isMusicPlaying]);
  
  // NEU: Adaptive Audio-reaktive Farb-Effekte basierend auf tatsächlichen Energy-Werten
  useEffect(() => {
    // NEU: Adaptive Schwellenwerte basierend auf tatsächlichen Energy-Werten
    const adaptiveEnergyThreshold = 0.15; // Reduziert von 0.05 für bessere Reaktivität
    const adaptiveHighEnergyThreshold = 0.3; // Reduziert von 0.8 für realistische Werte
    
    if ((energy > adaptiveEnergyThreshold || beatDetected) && Date.now() - lastColorChangeTime > colorStability) {
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      // NEU: Adaptive Stabilität basierend auf realen Energy-Werten
      const newStability = energy > adaptiveHighEnergyThreshold
        ? Math.max(600, Math.floor(1200 - (energy * 200))) // 600-1200ms bei hoher Energy
        : Math.floor(1500 + Math.random() * 2000); // 1500-3500ms bei niedriger Energy
      
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(newStability);
      
      throttledLog(`Color change: energy=${energy.toFixed(3)}, stability=${newStability}ms, beat=${beatDetected}`);
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // OPTIMIERT: Verbesserte Audio-reaktive Edge-Effekte basierend auf Charge-Level
  useEffect(() => {
    if (beatDetected || energy > 0.03) { // Noch empfindlicher: ab 0.03
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}, rotation?: number}> = [];
      
      // CHARGE-LEVEL BASIERTE EFFEKTE (um 20% erhöht)
      let vibrationChance, glitchChance, colorChance, rotationChance, patternSwapChance;
      
      switch (chargeLevel) {
        case 1:
          // CHARGE LVL1: Dünne Außenlinien, minimal vibrieren, selten Pattern-Tausch (um 20% erhöht)
          vibrationChance = 0.12 + (energy * 0.24); // Minimal, reaktiv auf Musik-Intensität (erhöht von 0.1+0.2)
          glitchChance = 0.06; // Sehr selten (erhöht von 0.05)
          colorChance = 0.096; // Selten (erhöht von 0.08)
          rotationChance = 0.18; // Dünne Linien können sich drehen (erhöht von 0.15)
          patternSwapChance = 0.024; // Sehr selten mit Hintergrund-Pattern tauschen (erhöht von 0.02)
          break;
          
        case 2:
          // CHARGE LVL2: Stärkere Vibrationen, stärkerer Glow (um 20% erhöht)
          vibrationChance = 0.36 + (energy * 0.48); // Sichtbarer und stärker (erhöht von 0.3+0.4)
          glitchChance = 0.18; // Häufiger (erhöht von 0.15)
          colorChance = 0.3; // Häufiger (erhöht von 0.25)
          rotationChance = 0.3; // Häufigere Rotation (erhöht von 0.25)
          patternSwapChance = 0.096; // Häufigerer Pattern-Tausch (erhöht von 0.08)
          break;
          
        case 3:
          // CHARGE LVL3: Von allem noch mehr (um 20% erhöht)
          vibrationChance = 0.6 + (energy * 0.72); // Sehr stark (erhöht von 0.5+0.6)
          glitchChance = 0.36; // Sehr häufig (erhöht von 0.3)
          colorChance = 0.48; // Sehr häufig (erhöht von 0.4)
          rotationChance = 0.48; // Sehr häufige Rotation (erhöht von 0.4)
          patternSwapChance = 0.18; // Häufiger Pattern-Tausch (erhöht von 0.15)
          break;
          
        default:
          // Fallback für Level 0 oder undefined (um 20% erhöht)
          vibrationChance = 0.06;
          glitchChance = 0.024;
          colorChance = 0.06;
          rotationChance = 0.06;
          patternSwapChance = 0.012;
      }
      
      // Energie-Multiplikator für reaktive Intensität
      const energyMultiplier = 1 + (energy * 1.5);
      
      // Effektive Chancen mit Energie-Multiplikator
      const effectiveVibrationChance = Math.min(0.8, vibrationChance * energyMultiplier);
      const effectiveGlitchChance = Math.min(0.7, glitchChance * energyMultiplier);
      const effectiveColorChance = Math.min(0.7, colorChance * energyMultiplier);
      const effectiveRotationChance = Math.min(0.6, rotationChance * energyMultiplier);
      const effectivePatternSwapChance = Math.min(0.3, patternSwapChance * energyMultiplier);
      
      edgePositions.forEach(pos => {
        // VIBRATION (reaktiv auf Musik-Intensität)
        if (Math.random() < effectiveVibrationChance) {
          const intensity = energy * (chargeLevel * 0.5 + 0.5); // Stärkere Vibration bei höherem Level
          const offsetX = (Math.random() - 0.5) * intensity * 2;
          const offsetY = (Math.random() - 0.5) * intensity * 2;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
        }
        
        // ROTATION (dünne Linien drehen sich)
        if (Math.random() < effectiveRotationChance) {
          const rotationAngle = (Math.random() - 0.5) * 30; // ±15 Grad Rotation
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            rotation: rotationAngle
          });
        }
        
        // GLITCH-ZEICHEN
        if (Math.random() < effectiveGlitchChance) {
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars]?.length || edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars]?.[glitchCharSet] || edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
        }
        
        // FARB-EFFEKTE
        if (Math.random() < effectiveColorChance) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
        }
        
        // PATTERN-SWAP (mit Hintergrund-Elementen tauschen)
        if (Math.random() < effectivePatternSwapChance) {
          // Wähle ein zufälliges Hintergrund-Zeichen
          const backgroundChars = ['░', '▒', '▓', '█', '▄', '▀', '▌', '▐'];
          const randomBgChar = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: randomBgChar
          });
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // Cleanup für Edge-Effekte - Längere Dauer für sanftere Übergänge
      const duration = beatDetected ? 250 : Math.max(200, Math.min(300, Math.floor(energy * 150)));
      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
  }, [beatDetected, energy, chargeLevel, edgePositions]);
  
  // --- IDLE TILE COLOR CYCLE ---
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) {
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
        const idleTiles = swordPositions.map(pos => ({ ...pos, color: accentColors[colorIndex] }));
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
          colorIndex = (colorIndex + 1) % accentColors.length;
          const idleTiles = swordPositions.map(pos => ({ ...pos, color: accentColors[colorIndex] }));
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
  }, [swordPositions, isMusicPlaying]);

  // --- ALLE ANIMATIONEN NUR WENN NICHT IDLE ---
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) return;
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
      veinsMapRef.current.clear();
      beatVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      });
      
      // Setze das State-Array für das Rendering
      setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
      
      // OPTIMIERT: Längere Lebensdauer für Beat-Veins (4-10 Sekunden)
      const veinLifetime = beatDetected ? 4000 : Math.max(4000, Math.min(10000, Math.floor(energy * 12000)));
      
      // Cleanup nach der Lebensdauer
      const timeout = setTimeout(() => {
        const now = Date.now();
        let changed = false;
        
        Array.from(veinsMapRef.current.entries()).forEach(([key, value]) => {
          if (now - value.birth > veinLifetime) {
            veinsMapRef.current.delete(key);
            changed = true;
          }
        });
        
        if (changed) {
          setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
        }
      }, veinLifetime);
      
      cleanupTimeoutsRef.current.add(timeout);
    }
    
  }, [beatDetected, energy, glitchLevel, swordPositions, getBackgroundDimensions, isIdleActive]);
  
  // OPTIMIERT: Separater useEffect für Idle-Animation (nur wenn Musik NICHT spielt)
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) {
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
      veinsMapRef.current.clear();
      const currentTime = Date.now();
      idleVeins.forEach(vein => {
        const key = `${vein.x}-${vein.y}`;
        veinsMapRef.current.set(key, { vein, birth: currentTime });
      });
      
      // Setze das State-Array für das Rendering
      setColoredVeins(Array.from(veinsMapRef.current.values()).map(v => v.vein));
    }
  }, [isIdleActive, beatDetected, getBackgroundDimensions, isMusicPlaying]);
  
  // OPTIMIERT: Drastisch reduzierte Audio-reaktive Farb-Effekte für bessere Performance
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) return;
    if ((energy > 0.05 || beatDetected) && Date.now() - lastColorChangeTime > colorStability) { // Noch empfindlicher: ab 0.05
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      const newStability = energy > 0.8 // Erhöht von 0.7 auf 0.8 für längere Stabilität
        ? Math.max(800, Math.floor(1500 - (energy * 300))) // Erhöht von 500/1200 auf 800/1500
        : Math.floor(2000 + Math.random() * 2500); // Erhöht von 1500+2000 auf 2000+2500
      
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(newStability);
      
      // performanceMonitor.trackColorChange(); // Entfernt
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // OPTIMIERT: Verbesserte Audio-reaktive Edge-Effekte basierend auf Charge-Level
  useEffect(() => {
    if (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) return;
    if (beatDetected || energy > 0.03) { // Noch empfindlicher: ab 0.03
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}, rotation?: number}> = [];
      
      // CHARGE-LEVEL BASIERTE EFFEKTE (um 20% erhöht)
      let vibrationChance, glitchChance, colorChance, rotationChance, patternSwapChance;
      
      switch (chargeLevel) {
        case 1:
          // CHARGE LVL1: Dünne Außenlinien, minimal vibrieren, selten Pattern-Tausch (um 20% erhöht)
          vibrationChance = 0.12 + (energy * 0.24); // Minimal, reaktiv auf Musik-Intensität (erhöht von 0.1+0.2)
          glitchChance = 0.06; // Sehr selten (erhöht von 0.05)
          colorChance = 0.096; // Selten (erhöht von 0.08)
          rotationChance = 0.18; // Dünne Linien können sich drehen (erhöht von 0.15)
          patternSwapChance = 0.024; // Sehr selten mit Hintergrund-Pattern tauschen (erhöht von 0.02)
          break;
          
        case 2:
          // CHARGE LVL2: Stärkere Vibrationen, stärkerer Glow (um 20% erhöht)
          vibrationChance = 0.36 + (energy * 0.48); // Sichtbarer und stärker (erhöht von 0.3+0.4)
          glitchChance = 0.18; // Häufiger (erhöht von 0.15)
          colorChance = 0.3; // Häufiger (erhöht von 0.25)
          rotationChance = 0.3; // Häufigere Rotation (erhöht von 0.25)
          patternSwapChance = 0.096; // Häufigerer Pattern-Tausch (erhöht von 0.08)
          break;
          
        case 3:
          // CHARGE LVL3: Von allem noch mehr (um 20% erhöht)
          vibrationChance = 0.6 + (energy * 0.72); // Sehr stark (erhöht von 0.5+0.6)
          glitchChance = 0.36; // Sehr häufig (erhöht von 0.3)
          colorChance = 0.48; // Sehr häufig (erhöht von 0.4)
          rotationChance = 0.48; // Sehr häufige Rotation (erhöht von 0.4)
          patternSwapChance = 0.18; // Häufiger Pattern-Tausch (erhöht von 0.15)
          break;
          
        default:
          // Fallback für Level 0 oder undefined (um 20% erhöht)
          vibrationChance = 0.06;
          glitchChance = 0.024;
          colorChance = 0.06;
          rotationChance = 0.06;
          patternSwapChance = 0.012;
      }
      
      // Energie-Multiplikator für reaktive Intensität
      const energyMultiplier = 1 + (energy * 1.5);
      
      // Effektive Chancen mit Energie-Multiplikator
      const effectiveVibrationChance = Math.min(0.8, vibrationChance * energyMultiplier);
      const effectiveGlitchChance = Math.min(0.7, glitchChance * energyMultiplier);
      const effectiveColorChance = Math.min(0.7, colorChance * energyMultiplier);
      const effectiveRotationChance = Math.min(0.6, rotationChance * energyMultiplier);
      const effectivePatternSwapChance = Math.min(0.3, patternSwapChance * energyMultiplier);
      
      edgePositions.forEach(pos => {
        // VIBRATION (reaktiv auf Musik-Intensität)
        if (Math.random() < effectiveVibrationChance) {
          const intensity = energy * (chargeLevel * 0.5 + 0.5); // Stärkere Vibration bei höherem Level
          const offsetX = (Math.random() - 0.5) * intensity * 2;
          const offsetY = (Math.random() - 0.5) * intensity * 2;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
        }
        
        // ROTATION (dünne Linien drehen sich)
        if (Math.random() < effectiveRotationChance) {
          const rotationAngle = (Math.random() - 0.5) * 30; // ±15 Grad Rotation
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            rotation: rotationAngle
          });
        }
        
        // GLITCH-ZEICHEN
        if (Math.random() < effectiveGlitchChance) {
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars]?.length || edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars]?.[glitchCharSet] || edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
        }
        
        // FARB-EFFEKTE
        if (Math.random() < effectiveColorChance) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
        }
        
        // PATTERN-SWAP (mit Hintergrund-Elementen tauschen)
        if (Math.random() < effectivePatternSwapChance) {
          // Wähle ein zufälliges Hintergrund-Zeichen
          const backgroundChars = ['░', '▒', '▓', '█', '▄', '▀', '▌', '▐'];
          const randomBgChar = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: randomBgChar
          });
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // Cleanup für Edge-Effekte - Längere Dauer für sanftere Übergänge
      const duration = beatDetected ? 250 : Math.max(200, Math.min(300, Math.floor(energy * 150)));
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
          <pre className="font-mono text-sm sm:text-base leading-[0.9] whitespace-pre select-none" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(staticBackground.length > 0 ? staticBackground : caveBackground).map((row, y) => {
              // Map für Vein-Farben in dieser Zeile
              const veinMap = new Map<number, string>();
              coloredVeins.forEach(vein => {
                if (vein.y === y) {
                  veinMap.set(vein.x, vein.color);
                }
              });
              // DOM-Optimierung: Nur animierte Zeichen als <span>, Rest als String
              const elements = [];
              let buffer = '';
              for (let x = 0; x < row.length; x++) {
                const char = row[x];
                const veinColor = veinMap.get(x);
                if (veinColor) {
                  if (buffer) {
                    elements.push(buffer);
                    buffer = '';
                  }
                  elements.push(
                    <span
                      key={x}
                      style={{
                        color: veinColor,
                        textShadow: `0 0 ${2 + glitchLevel}px ${veinColor}`,
                        display: 'inline-block',
                        filter: `contrast(${0.65 + (glitchLevel * 0.05)})`
                      }}
                    >
                      {char}
                    </span>
                  );
                } else {
                  buffer += char;
                }
              }
              if (buffer) elements.push(buffer);
              return (
                <div key={y} style={{ lineHeight: '0.9', width: '100%', textAlign: 'center', whiteSpace: 'pre' }}>
                  {elements}
                </div>
              );
            })}
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
          transition: (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) ? 'color 2s linear' : undefined
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
                  style={{ ...style, transition: (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive) ? 'color 2s linear' : undefined }}
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