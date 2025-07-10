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
// import { getPerformanceMonitor } from '@/lib/performance/performanceMonitor';
// import { getPerformanceOptimizer } from '@/lib/performance/performanceOptimizer';

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
  
  // Performance Monitor
  // Entferne die Zeile mit getPerformanceMonitor und alle auskommentierten Performance-Optimizer-Zeilen
  
  // OPTIMIERT: Performance Optimizer vorübergehend deaktiviert
  // const performanceOptimizer = getPerformanceOptimizer();
  
  // OPTIMIERT: Performance-Optimierung basierend auf Optimizer-Status
  // useEffect(() => {
  //   const { effectReductionLevel, updateThrottleLevel, emergencyMode } = performanceOptimizer.getOptimizationStatus();
  //   
  //   // Reduziere Effekte basierend auf Performance-Level
  //   if (effectReductionLevel > 0) {
  //     // Reduziere Vein-Generierung durch Anpassung der maxVeinsRef
  //     const veinReduction = Math.max(0.1, 1 - (effectReductionLevel * 0.3));
  //     maxVeinsRef.current = Math.floor(300 * veinReduction);
  //   }
  //   
  //   // Reduziere Update-Frequenz basierend auf Throttle-Level
  //   if (updateThrottleLevel > 0) {
  //     // Erhöhe Intervall-Zeiten durch längere Delays
  //     const throttleMultiplier = 1 + (updateThrottleLevel * 0.5);
  //     // Die Intervalle werden in den bestehenden useEffect-Hooks angepasst
  //   }
  //   
  //   // Notfall-Modus: Deaktiviere alle nicht-essentiellen Effekte
  //   if (emergencyMode) {
  //     setGlowIntensity(0);
  //     setColoredTiles([]);
  //     setUnicodeGlitches([]);
  //     // Stoppe alle Intervalle
  //     clearAllIntervals();
  //   }
  // }, [performanceOptimizer]);
  
  // OPTIMIERT: Setup Performance Optimizer Callbacks
  // useEffect(() => {
  //   performanceOptimizer.setCallbacks({
  //     onEmergencyMode: (enabled) => {
  //       if (enabled) {
  //         console.log('🚨 Notfall-Modus aktiviert - Alle Effekte deaktiviert');
  //         setGlowIntensity(0);
  //         setColoredTiles([]);
  //         setUnicodeGlitches([]);
  //         // clearAllIntervals wird später definiert
  //       } else {
  //         console.log('✅ Notfall-Modus deaktiviert - Effekte wieder aktiviert');
  //       }
  //     },
  //     onEffectReduction: (level) => {
  //       console.log(`🔧 Effekt-Reduktion Level ${level} aktiviert`);
  //       // Implementiere Effekt-Reduktion basierend auf Level
  //     },
  //     onUpdateThrottle: (level) => {
  //       console.log(`🔧 Update-Throttling Level ${level} aktiviert`);
  //       // Implementiere Update-Throttling basierend auf Level
  //     }
  //   });
  // }, [performanceOptimizer]);
  
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
      // Debug-Log
      if (newVeins > 0) {
        const now = Date.now();
        if (now - lastVeinLogTimeRef.current > 10000) {
          console.log(`[Veins] Aktiv: ${veinsMapRef.current.size}, Neu: ${newVeins}, Energie: ${energy}, Beat: ${beatDetected}`);
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
      console.log('[Pattern] Hintergrund-Pattern gewechselt');
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

  // OPTIMIERT: Reaktive Audio-Effekte für visuellen Impact
  useEffect(() => {
    // OPTIMIERT: Niedrige Latenz für visuellen Impact
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < 100) { // Reduziert von 200ms auf 100ms für bessere Reaktivität
      return;
    }
    
    // OPTIMIERT: Empfindlichere Reaktion für visuellen Impact
    if (energy < 0.01 && !beatDetected) { // Noch empfindlicher: ab 0.01
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
      // performanceMonitor.trackEffect(); // Entfernt
      effectsTriggered++;
    }
    
    // Tile-Effekte - Nur bei sehr deutlichen Beats oder höherer Energy
    if ((beatDetected && effectsTriggered < MAX_EFFECTS_PER_UPDATE) || energy > 0.03) {
      console.log(`[Tiles] Bedingung erfüllt: beatDetected=${beatDetected}, energy=${energy.toFixed(3)}, effectsTriggered=${effectsTriggered}`);
      
      const tempIntensity = { ...colorEffectIntensity };
      for (const level in tempIntensity) {
        if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
          const numLevel = Number(level) as keyof typeof colorEffectIntensity;
          tempIntensity[numLevel] = Math.min(2, tempIntensity[numLevel] + Math.floor(energy * (beatDetected ? 1 : 0.5)));
        }
      }
      
      const generatedTiles = generateColoredTiles(swordPositions, glitchLevel, tempIntensity);
      console.log(`[Tiles] Generiert: ${generatedTiles.length} Tiles`);
      
      setColoredTiles(generatedTiles);
      // performanceMonitor.trackEffect(); // Entfernt
      effectsTriggered++;
      
      // VARIABLE DARSTELLUNGSDAUER: 1000ms Minimum, 3000ms Maximum
      // Bei hoher Intensität (hohe Energie/Beat) kürzere Dauer, bei niedriger Intensität längere Dauer
      const intensity = Math.min(1, (energy * 2) + (beatDetected ? 0.5 : 0));
      const minDuration = 50; // Minimum 50ms (0,1 Sekunde) - erhöht von 20ms
      const maxDuration = 3000; // Maximum 3000ms (3 Sekunden)
      const duration = maxDuration - (intensity * (maxDuration - minDuration));
      
      console.log(`[Tiles] Dauer: ${duration}ms (Intensität: ${intensity.toFixed(3)})`);
      
      const timeout = setTimeout(() => {
        setColoredTiles([]); // Nach Ablauf werden die Tiles entfernt
        console.log(`[Tiles] Tiles entfernt nach ${duration}ms`);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    } else {
      console.log(`[Tiles] Bedingung NICHT erfüllt: beatDetected=${beatDetected}, energy=${energy.toFixed(3)}, effectsTriggered=${effectsTriggered}`);
      setColoredTiles([]); // Wenn keine Bedingungen erfüllt, Tiles sofort entfernen
    }
    
    // OPTIMIERT: Reduzierte Unicode-Glitch-Effekte für bessere Performance
    if (beatDetected && effectsTriggered < MAX_EFFECTS_PER_UPDATE) {
      const tempGlitchLevel = Math.min(1, Math.floor(glitchLevel + (energy * 1.0))); // Reduziert von 2/1.5 auf 1/1.0
      
      setUnicodeGlitches(generateUnicodeGlitches(swordPositions, tempGlitchLevel));
      // performanceMonitor.trackGlitch(); // Entfernt
      
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
      // performanceMonitor.trackBackgroundUpdate(); // Entfernt
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
      
      // OPTIMIERT: Kürzere Lebensdauer für Beat-Veins (3-8 Sekunden)
      const veinLifetime = beatDetected ? 3000 : Math.max(3000, Math.min(8000, Math.floor(energy * 10000)));
      
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
  
  // OPTIMIERT: Separater useEffect für Idle-Animation
  useEffect(() => {
    if (isIdleActive()) {
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
  }, [isIdleActive, beatDetected, getBackgroundDimensions]);
  
  // OPTIMIERT: Drastisch reduzierte Audio-reaktive Farb-Effekte für bessere Performance
  useEffect(() => {
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
    if (beatDetected || energy > 0.03) { // Noch empfindlicher: ab 0.03
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}, rotation?: number}> = [];
      
      // CHARGE-LEVEL BASIERTE EFFEKTE
      let vibrationChance, glitchChance, colorChance, rotationChance, patternSwapChance;
      
      switch (chargeLevel) {
        case 1:
          // CHARGE LVL1: Dünne Außenlinien, minimal vibrieren, selten Pattern-Tausch
          vibrationChance = 0.1 + (energy * 0.2); // Minimal, reaktiv auf Musik-Intensität
          glitchChance = 0.05; // Sehr selten
          colorChance = 0.08; // Selten
          rotationChance = 0.15; // Dünne Linien können sich drehen
          patternSwapChance = 0.02; // Sehr selten mit Hintergrund-Pattern tauschen
          break;
          
        case 2:
          // CHARGE LVL2: Stärkere Vibrationen, stärkerer Glow
          vibrationChance = 0.3 + (energy * 0.4); // Sichtbarer und stärker
          glitchChance = 0.15; // Häufiger
          colorChance = 0.25; // Häufiger
          rotationChance = 0.25; // Häufigere Rotation
          patternSwapChance = 0.08; // Häufigerer Pattern-Tausch
          break;
          
        case 3:
          // CHARGE LVL3: Von allem noch mehr
          vibrationChance = 0.5 + (energy * 0.6); // Sehr stark
          glitchChance = 0.3; // Sehr häufig
          colorChance = 0.4; // Sehr häufig
          rotationChance = 0.4; // Sehr häufige Rotation
          patternSwapChance = 0.15; // Häufiger Pattern-Tausch
          break;
          
        default:
          // Fallback für Level 0 oder undefined
          vibrationChance = 0.05;
          glitchChance = 0.02;
          colorChance = 0.05;
          rotationChance = 0.05;
          patternSwapChance = 0.01;
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

  // Entferne Beat-Detector-States, -UI und -useEffects
  // Entferne performanceMonitor und getPerformanceMonitor
  // Entferne alle Importe, die nur für Beat-Detector oder Performance Monitor benötigt wurden

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
            transform: 'scale(1.65)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <pre className="font-mono text-sm sm:text-base leading-[0.9] whitespace-pre select-none" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {caveBackground.map((row, y) => {
              // OPTIMIERT: Effizienteres Vein-Rendering ohne Zeilensprünge
              const veinMap = new Map<number, string>();
              coloredVeins.forEach(vein => {
                if (vein.y === y) {
                  veinMap.set(vein.x, vein.color);
                }
              });
              
              return (
                <div key={y} style={{ lineHeight: '0.9', width: '100%', textAlign: 'center', whiteSpace: 'pre' }}>
                  {row.map((char, x) => {
                    const veinColor = veinMap.get(x);
                    if (veinColor) {
                      return (
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
                    }
                    return char;
                  })}
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