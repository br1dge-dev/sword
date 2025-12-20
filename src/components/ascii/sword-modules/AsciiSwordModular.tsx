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
import { createReactivityController } from './effects/reactivityController';
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

  // Frequenzdaten aus dem Store holen (für band/onset-basierte Reaktivität)
  const frequencyData = useAudioReactionStore((s) => s.frequencyData);
  const frequencyDataRef = useRef<Uint8Array | null>(frequencyData);

  useEffect(() => {
    frequencyDataRef.current = frequencyData;
  }, [frequencyData]);

  // NOTE: This must be "mount-gated" to avoid hydration mismatches in Next.js
  // (server-rendered HTML must match the client's first render).
  const [debugReactiveEnabled, setDebugReactiveEnabled] = useState(false);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setDebugReactiveEnabled(url.searchParams.get('debug') === 'reactive');
    } catch {
      setDebugReactiveEnabled(false);
    }
  }, []);

  const [debugReactive, setDebugReactive] = useState<{
    energy: number;
    bass: number;
    mid: number;
    high: number;
    onset: number;
    beat: number;
    freqLen: number;
  } | null>(null);
  const debugReactiveLastSetRef = useRef<number>(0);
  
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
  const veinLoopRafIdRef = useRef<number | null>(null);
  const veinLoopLastTickRef = useRef<number>(0);
  const energyRef = useRef<number>(energy);
  const beatDetectedRef = useRef<boolean>(beatDetected);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    beatDetectedRef.current = beatDetected;
  }, [beatDetected]);

  useEffect(() => {
    // Keep the previous effective cadence (~100ms), but schedule via rAF to reduce timer jitter.
    const TICK_MS = 100;
    const VEIN_TTL_MS = 10000;

    let cancelled = false;

    const tick = (nowMs: number) => {
      if (cancelled) return;

      if (nowMs - veinLoopLastTickRef.current >= TICK_MS) {
        veinLoopLastTickRef.current = nowMs;

        const now = Date.now();
        const currentEnergy = energyRef.current;
        const currentBeatDetected = beatDetectedRef.current;

        // Hole aktuelle Background-Dimensionen
        const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();

        let changed = false;

        // Entferne abgelaufene Veins
        veinsMapRef.current.forEach((value, key) => {
          if (now - value.birth > VEIN_TTL_MS) {
            veinsMapRef.current.delete(key);
            changed = true;
          }
        });

        // Dynamische Vein-Generierung
        let newVeins = 0;
        if (currentEnergy > 0.05 && veinsMapRef.current.size < maxVeinsRef.current) {
          const count = Math.floor(Math.random() * 11) + 10; // 10–20 neue Veins
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

        if (currentBeatDetected && veinsMapRef.current.size < maxVeinsRef.current) {
          const count = Math.floor(Math.random() * 21) + 30; // 30–50 neue Veins
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
          if (now - lastVeinLogTimeRef.current > 10000) {
            throttledLog(`Veins active: ${veinsMapRef.current.size}, new: ${newVeins}, energy: ${currentEnergy.toFixed(2)}`);
            lastVeinLogTimeRef.current = now;
          }
        }
      }

      veinLoopRafIdRef.current = requestAnimationFrame(tick);
    };

    veinLoopRafIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (veinLoopRafIdRef.current !== null) {
        cancelAnimationFrame(veinLoopRafIdRef.current);
      }
      veinLoopRafIdRef.current = null;
    };
  }, [getBackgroundDimensions]);

  // NOTE: Removed duplicate 100ms prune-only interval.
  // The interval above (Vein-Generierung) already prunes expired veins and updates the overlay.
  
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
  const effectsRafIdRef = useRef<number | null>(null);
  const effectsLastTickRef = useRef<number>(0);
  const glitchLevelRef = useRef<number>(glitchLevel);
  const idleRef = useRef<boolean>(idle);
  const unicodeGlitchUntilRef = useRef<number>(0);
  const unicodeGlitchActiveRef = useRef<boolean>(false);
  const edgeEffectsUntilRef = useRef<number>(0);
  const edgeEffectsActiveRef = useRef<boolean>(false);
  const lastColorChangeTimeRef = useRef<number>(lastColorChangeTime);
  const colorStabilityRef = useRef<number>(colorStability);
  const lastBgRegenAtRef = useRef<number>(0);

  // “Reactivity Controller”: stable audio features (bands + onset) for more immersive mapping
  const reactivityControllerRef = useRef<ReturnType<typeof createReactivityController> | null>(null);
  if (reactivityControllerRef.current === null) {
    reactivityControllerRef.current = createReactivityController();
  }

  useEffect(() => {
    glitchLevelRef.current = glitchLevel;
  }, [glitchLevel]);

  useEffect(() => {
    idleRef.current = idle;
  }, [idle]);

  useEffect(() => {
    lastColorChangeTimeRef.current = lastColorChangeTime;
  }, [lastColorChangeTime]);

  useEffect(() => {
    colorStabilityRef.current = colorStability;
  }, [colorStability]);

  // rAF scheduler for tile/glitch/edge updates to avoid setTimeout bursts and timer jitter.
  useEffect(() => {
    const TICK_MS = 50; // matches previous internal throttle

    let cancelled = false;

    const frame = (nowMs: number) => {
      if (cancelled) return;

      if (nowMs - effectsLastTickRef.current >= TICK_MS) {
        effectsLastTickRef.current = nowMs;

        // --- Color cycle (moved into scheduler; avoids extra effect bursts) ---
        const now = Date.now();

        const reactive = reactivityControllerRef.current!.update({
          nowMs,
          energy: energyRef.current,
          beatDetected: beatDetectedRef.current,
          frequencyData: frequencyDataRef.current,
        });

        // Debug overlay (only when enabled; low refresh rate to avoid perf impact)
        if (debugReactiveEnabled) {
          const last = debugReactiveLastSetRef.current;
          if (nowMs - last >= 200) {
            debugReactiveLastSetRef.current = nowMs;
            setDebugReactive({
              energy: reactive.energy,
              bass: reactive.bass,
              mid: reactive.mid,
              high: reactive.high,
              onset: reactive.onset,
              beat: reactive.beat,
              freqLen: frequencyDataRef.current?.length ?? 0,
            });
          }
        }

        const adaptive = computeAdaptiveColorCycle({
          energy: reactive.energy,
          beatDetected: beatDetectedRef.current,
          lastColorChangeTime: lastColorChangeTimeRef.current,
          colorStability: colorStabilityRef.current,
          nowMs: now,
        });
        if (adaptive) {
          setBaseColor(adaptive.swordColor);
          setBgColor(adaptive.bgColor);
          setLastColorChangeTime(now);
          setColorStability(adaptive.newStability);
          lastColorChangeTimeRef.current = now;
          colorStabilityRef.current = adaptive.newStability;
        }

        if (!idleRef.current) {
          const optimized = computeOptimizedColorCycle({
            energy: reactive.energy,
            beatDetected: beatDetectedRef.current,
            lastColorChangeTime: lastColorChangeTimeRef.current,
            colorStability: colorStabilityRef.current,
            nowMs: now,
          });
          if (optimized) {
            setBaseColor(optimized.swordColor);
            setBgColor(optimized.bgColor);
            setLastColorChangeTime(now);
            setColorStability(optimized.newStability);
            lastColorChangeTimeRef.current = now;
            colorStabilityRef.current = optimized.newStability;
          }
        }

        // Stop effect generation during idle (idle system has its own visuals).
        if (!idleRef.current) {
          const currentEnergy = reactive.energy;
          const currentBeat = beatDetectedRef.current;
          const currentGlitchLevel = glitchLevelRef.current;
          const onset = reactive.onset;
          const beatStrength = reactive.beat;
          const bass = reactive.bass;
          const mid = reactive.mid;

          // OPTIMIERT: Empfindlichere Reaktion für visuellen Impact
          if (!(currentEnergy < 0.005 && !currentBeat)) {
            // Track last tick time (kept for debugging/consistency with existing code)
            lastUpdateTimeRef.current = now;

            let effectsTriggered = 0;
            const MAX_EFFECTS_PER_UPDATE = 1;

            // --- Glow ---
            if ((currentBeat && effectsTriggered < MAX_EFFECTS_PER_UPDATE) || onset > 0.01 || currentEnergy > 0.03) {
              const base = 0.03 + 0.22 * Math.min(1, (bass * 0.7 + currentEnergy * 0.3) + beatStrength * 0.25);
              const randomIntensity = base + Math.random() * 0.04;
              setGlowIntensity(randomIntensity);
              effectsTriggered++;
            }

            // --- Tiles (no setTimeout; lifecycle handled here) ---
            if (tileLockedRef.current && tileBirthTimeRef.current > 0) {
              const age = now - tileBirthTimeRef.current;
              if (age >= TILE_LOCK_MS) {
                currentTilesRef.current = [];
                setColoredTiles([]);
                tileBirthTimeRef.current = 0;
                tileLockedRef.current = false;
              }
            }

            const shouldTriggerTiles =
              currentBeat ||
              (onset > 0.012 && (bass > 0.05 || mid > 0.05)) ||
              currentEnergy > 0.03;
            if (shouldTriggerTiles && !tileLockedRef.current) {
              const tempIntensity = { ...colorEffectIntensity };
              for (const level in tempIntensity) {
                if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
                  const numLevel = Number(level) as keyof typeof colorEffectIntensity;
                  tempIntensity[numLevel] = Math.min(
                    2,
                    tempIntensity[numLevel] + Math.floor(currentEnergy * (currentBeat ? 1 : 0.5)),
                  );
                }
              }

              const generatedTiles = generateColoredTiles(swordPositions, currentGlitchLevel, tempIntensity, currentEnergy);
              currentTilesRef.current = generatedTiles;
              tileBirthTimeRef.current = now;
              setColoredTiles(generatedTiles);
              tileLockedRef.current = true;
              effectsTriggered++;
            }

            // --- Unicode glitches (no setTimeout; expiry handled here) ---
            if (unicodeGlitchActiveRef.current && now >= unicodeGlitchUntilRef.current) {
              unicodeGlitchActiveRef.current = false;
              setUnicodeGlitches([]);
            }

            if ((beatStrength > 0.85 || onset > 0.03) && effectsTriggered < MAX_EFFECTS_PER_UPDATE && now >= unicodeGlitchUntilRef.current) {
              const tempGlitchLevel = Math.min(1, Math.floor(currentGlitchLevel + (currentEnergy * 1.0)));
              setUnicodeGlitches(generateUnicodeGlitches(swordPositions, tempGlitchLevel));
              unicodeGlitchActiveRef.current = true;
              unicodeGlitchUntilRef.current = now + (beatStrength > 0.85 ? 520 : 360);
            }

            // --- Edge effects (no setTimeout; expiry handled here) ---
            if (edgeEffectsActiveRef.current && now >= edgeEffectsUntilRef.current) {
              edgeEffectsActiveRef.current = false;
              setEdgeEffects([]);
            }

            if ((beatStrength > 0.6 || onset > 0.02 || currentEnergy > 0.03) && edgePositions.length > 0) {
              // Regenerate if expired or on new beat.
              if (!edgeEffectsActiveRef.current || currentBeat) {
                const { effects, cleanupMs } = generateReactiveEdgeEffects({
                  edgePositions,
                  chargeLevel,
                  energy: Math.min(1, currentEnergy + onset * 0.8),
                  beatDetected: currentBeat,
                });
                setEdgeEffects(effects);
                edgeEffectsActiveRef.current = true;
                edgeEffectsUntilRef.current = now + cleanupMs;
              }
            }

            // --- Rare background regen ---
            const BG_REGEN_COOLDOWN_MS = 4000;
            if (
              now - lastBgRegenAtRef.current >= BG_REGEN_COOLDOWN_MS &&
              (
                currentEnergy > 0.97 ||
                (beatStrength > 0.9 && onset > 0.015 && Math.random() < 0.08)
              )
            ) {
              const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
              const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
              const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
              setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
              setBackgroundGenerated(false);
              lastBgRegenAtRef.current = now;
            }
          }
        }
      }

      effectsRafIdRef.current = requestAnimationFrame(frame);
    };

    effectsRafIdRef.current = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      if (effectsRafIdRef.current !== null) cancelAnimationFrame(effectsRafIdRef.current);
      effectsRafIdRef.current = null;
    };
  }, [chargeLevel, debugReactiveEnabled, edgePositions, getBackgroundDimensions, swordPositions]);
  
  // Edge effects are driven by the rAF scheduler above (avoids stacked timeouts).
  
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

      // Subtle idle tiles: only a small deterministic subset + dimmed colors (previously this colored the whole sword).
      const buildIdleTiles = (idx: number) => {
        const full = getIdleTilesForIndex(swordPositions, idx);
        if (!full.length) return full;
        // dim the chosen accent color (twice) for less intensity in idle
        const dimColor = getDarkerColor(getDarkerColor(full[0].color ?? '#00FCA6'));
        // deterministic ~10-12% subset to avoid flicker (stable across renders)
        return full
          .filter((p) => ((p.x * 13 + p.y * 7) % 9) === 0)
          .map((p) => ({ ...p, color: dimColor }));
      };
      
      // Always set idle tiles (subtle) while idle; music tiles will overwrite when playback starts.
      const initialIdleTiles = buildIdleTiles(colorIndex);
      currentTilesRef.current = initialIdleTiles;
      tileBirthTimeRef.current = Date.now();
      setColoredTiles(initialIdleTiles);
      
      const interval = setInterval(() => {
        // Prüfe nochmal, ob Musik läuft
        if (isMusicPlaying) {
          clearInterval(interval);
          // ENTFERNT: Sofortiges Entfernen der Tiles - Musik-Effekte sollen leben bleiben
          return;
        }
        
        colorIndex = nextIdleTilesColorIndex(colorIndex);
        const idleTiles = buildIdleTiles(colorIndex);
        currentTilesRef.current = idleTiles;
        tileBirthTimeRef.current = Date.now();
        setColoredTiles(idleTiles);
      }, 3500); // slower + calmer in idle
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
  
  // Color cycle + edge effects are driven by the rAF scheduler above (avoids stacked timeouts).

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
      {debugReactiveEnabled && (
        <div
          className="fixed left-2 bottom-2 z-[9999] rounded border border-grifter-blue bg-black/80 px-3 py-2 text-[10px] font-mono text-grifter-blue"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <div className="font-bold">REACTIVE</div>
          <div>freqLen: {debugReactive?.freqLen ?? 0}</div>
          <div>energy: {(debugReactive?.energy ?? 0).toFixed(3)}</div>
          <div>bass: {(debugReactive?.bass ?? 0).toFixed(3)}</div>
          <div>mid: {(debugReactive?.mid ?? 0).toFixed(3)}</div>
          <div>high: {(debugReactive?.high ?? 0).toFixed(3)}</div>
          <div>onset: {(debugReactive?.onset ?? 0).toFixed(3)}</div>
          <div>beat: {(debugReactive?.beat ?? 0).toFixed(3)}</div>
        </div>
      )}
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