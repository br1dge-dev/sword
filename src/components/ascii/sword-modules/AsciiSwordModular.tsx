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
import {
  computeBeatVeinLifetimeMs,
  mapToVeins,
  mapToVeinsWithFade,
  pruneVeinsByLifetime,
  pruneVeinsByLifetimeWithFade,
  replaceVeinsInMap,
  upsertVeinsInMap,
} from './effects/veinLifecycle';
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
import { createOrganicPatchState, tickOrganicPatches } from './effects/organicPatches';
import {
  buildEqualizerGeometry,
  computeEqBands,
  type EqPalette,
  renderEqTiles,
  stepEqState,
  type EqState,
} from './effects/equalizerSword';
import React from 'react'; // Added missing import for React
import AsciiBackgroundCanvas from './AsciiBackgroundCanvas';
import { useSwordAudioState, useSwordPowerUpState } from './hooks/useSwordStores';

const EQ_PALETTES: EqPalette[] = [
  { low: '#00FCA6', mid: '#3EE6FF', high: '#FF3EC8', peak: '#F8E16C' }, // green -> cyan -> pink
  { low: '#3EE6FF', mid: '#F8E16C', high: '#FF3EC8', peak: '#00FCA6' }, // cyan -> yellow -> pink
  { low: '#FF3EC8', mid: '#3EE6FF', high: '#00FCA6', peak: '#F8E16C' }, // pink -> cyan -> green
  { low: '#F8E16C', mid: '#00FCA6', high: '#3EE6FF', peak: '#FF3EC8' }, // yellow -> green -> cyan
];

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function parseColorToRgbFast(color: string): { r: number; g: number; b: number } | null {
  // #RRGGBB
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return { r, g, b };
  }
  // rgb(r,g,b)
  if (color.startsWith('rgb(')) {
    const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  // rgba(r,g,b,a)
  if (color.startsWith('rgba(')) {
    const m = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/i);
    if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  return null;
}

function mixToWhite(rgb: { r: number; g: number; b: number }, amount01: number) {
  const t = clamp01(amount01);
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hash01(x: number, y: number, seed: number) {
  // Cheap deterministic hash -> 0..1
  const n = Math.sin((x * 127.1 + y * 311.7 + seed * 74.7)) * 43758.5453;
  return n - Math.floor(n);
}

export default function AsciiSwordModular({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = useSwordPowerUpState();
  const currentLevelRef2 = useRef<number>(currentLevel);
  const levelPropRef = useRef<number>(level);
  useEffect(() => {
    currentLevelRef2.current = currentLevel;
  }, [currentLevel]);
  useEffect(() => {
    levelPropRef.current = level;
  }, [level]);
  
  // Audio-Reaktionsdaten abrufen
  const { energy: storeEnergy, beatDetected: storeBeat, isMusicPlaying, idle } = useSwordAudioState();

  // Treat "paused" as idle-visual state immediately (store idle starts after delay; visuals shouldn't keep raging).
  const idleVisual = idle || !isMusicPlaying;
  
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
  const [debugEffectsEnabled, setDebugEffectsEnabled] = useState(false);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setDebugReactiveEnabled(url.searchParams.get('debug') === 'reactive');
      setDebugEffectsEnabled(url.searchParams.get('debug') === 'effects');
    } catch {
      setDebugReactiveEnabled(false);
      setDebugEffectsEnabled(false);
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
    idle: boolean;
    isMusicPlaying: boolean;
    idleVisual: boolean;
    tilesLen: number;
  } | null>(null);
  const debugReactiveLastSetRef = useRef<number>(0);

  const [debugEffects, setDebugEffects] = useState<{
    idle: boolean;
    isMusicPlaying: boolean;
    beatDetected: boolean;
    energy: number;
    bass: number;
    mid: number;
    high: number;
    onset: number;
    beat: number;
    entropyLastImpulseMs: number;
    entropyAmp01: number;
    entropyPx: number;
    entropyLatch: boolean;
    tilesLen: number;
    unicodeLen: number;
    glitchCharsLen: number;
    edgeLen: number;
    blurActive: boolean;
    skewActive: boolean;
    fadeActive: boolean;
  } | null>(null);
  const debugEffectsLastSetRef = useRef<number>(0);
  
  // BeatDetected is an impulse; keep the "on" window short so it doesn't look stuck ON.
  useBeatReset(120);
  
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
  // Stable “monochrome scaffold” veins; overlay veins live in `veinsMapRef` (and fade out).
  const [baseBgVeins, setBaseBgVeins] = useState<Array<{ x: number; y: number; color: string }>>([]);
  const baseBgVeinsRef = useRef<Array<{ x: number; y: number; color: string }>>([]);
  const baseBgPositionsRef = useRef<Array<{ x: number; y: number }>>([]);
  const organicPatchesRef = useRef(createOrganicPatchState());

  useEffect(() => {
    baseBgVeinsRef.current = baseBgVeins;
    baseBgPositionsRef.current = baseBgVeins.map((v) => ({ x: v.x, y: v.y }));
  }, [baseBgVeins]);

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
    // Stable, slightly dim scaffold (monochrome), so reactive patches can “colorize” neighbors.
    const scaffoldCount = Math.min(1600, Math.max(750, Math.floor((bgWidth * bgHeight) / 16)));
    const scaffold = generateColoredVeins(bgWidth, bgHeight, scaffoldCount, viewportWidth, viewportHeight)
      .map((v) => ({ ...v, color: '#646B74' }));
    setBaseBgVeins(scaffold);

    // Reset overlay state on init for determinism.
    veinsMapRef.current.clear();
    organicPatchesRef.current = createOrganicPatchState();
    setColoredVeins(scaffold);
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
      const scaffoldCount = Math.min(1600, Math.max(750, Math.floor((bgWidth * bgHeight) / 16)));
      const scaffold = generateColoredVeins(bgWidth, bgHeight, scaffoldCount, viewportWidth, viewportHeight)
        .map((v) => ({ ...v, color: '#646B74' }));
      setBaseBgVeins(scaffold);

      // Keep overlay, but re-render combined output after resize.
      const now = Date.now();
      const overlay = mapToVeinsWithFade(veinsMapRef.current as any, now, 9000, 6500);
      setColoredVeins([...scaffold, ...overlay]);
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

  // Vein-Generierung: handled by the main rAF scheduler (organic patches + afterglow).
  // Keep these refs for reactive reads (used by scheduler).
  const energyRef = useRef<number>(energy);
  const beatDetectedRef = useRef<boolean>(beatDetected);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    beatDetectedRef.current = beatDetected;
  }, [beatDetected]);

  // NOTE: Removed old background vein loop (it overwrote the new patch/afterglow system and caused “flashy” resets).

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
    const hiltStart = centeredSwordLines.findIndex((l) =>
      l.includes('__▓█▓__') || l.includes('_▓██▓_') || l.includes('_▓███▓_'),
    );
    const mid = centeredSwordLines[0]?.length ? Math.floor(centeredSwordLines[0].length / 2) : 0;
    
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        const isHandle = hiltStart !== -1 && y >= hiltStart && Math.abs(x - mid) <= 2;
        if (isEdgeChar(char) && !isHandle) {
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

  // PERF: cache handle geometry so we don’t recompute `findIndex(...)` inside `isHandlePosition` per character.
  const hiltStartIndex = useMemo(() => {
    return centeredSwordLines.findIndex((line) =>
      line.includes('__▓█▓__') || line.includes('_▓██▓_') || line.includes('_▓███▓_'),
    );
  }, [centeredSwordLines]);
  const middleX = useMemo(() => (centeredSwordLines[0]?.length ? Math.floor(centeredSwordLines[0].length / 2) : 0), [centeredSwordLines]);
  const isHandleFast = useCallback(
    (x: number, y: number) => hiltStartIndex !== -1 && y >= hiltStartIndex && Math.abs(x - middleX) <= 2,
    [hiltStartIndex, middleX],
  );

  // Precompute blade-only edge positions and normalized progress for a deterministic “traveling wave”.
  const bladeEdgeWave = useMemo(() => {
    const bladeOnly = hiltStartIndex === -1 ? edgePositions : edgePositions.filter((p) => p.y < hiltStartIndex);
    if (!bladeOnly.length) return { points: [] as Array<{ x: number; y: number; k: string; prog01: number }>, minY: 0, maxY: 0 };
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of bladeOnly) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const denom = Math.max(1, maxY - minY);
    const points = bladeOnly.map((p) => {
      // progress 0 at hilt (bottom of blade), 1 at tip (top)
      const prog01 = clamp01(1 - (p.y - minY) / denom);
      return { x: p.x, y: p.y, k: `${p.x},${p.y}`, prog01 };
    });
    return { points, minY, maxY };
  }, [edgePositions, hiltStartIndex]);

  // For power-up effects: treat blade as the primary “impact” area (handle/hilt should stay calmer).
  const bladePositions = useMemo(() => {
    return swordPositions.filter((p) => !isHandleFast(p.x, p.y));
  }, [swordPositions, isHandleFast]);

  const handlePositionsMemo = useMemo(() => {
    return swordPositions.filter((p) => isHandleFast(p.x, p.y));
  }, [swordPositions, isHandleFast]);

  // --- ENTROPY (beat-impact “explosion drawing”) ---
  // Precompute per-cell direction vectors so the effect is punchy but cheap at runtime.
  const entropyVecMap = useMemo(() => {
    const m = new Map<string, { dx: number; dy: number; wobbleMul: number; strengthMul: number }>();
    if (!swordPositions.length) return m;
    // Center of the sword bounds (approx)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of swordPositions) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const seed = 17;
    for (const p of swordPositions) {
      const k = `${p.x},${p.y}`;
      // Reduce entropy on handle/guard (like glitch L3 focus): handle almost none, guard minimal, blade full.
      const isHandle = isHandleFast(p.x, p.y);
      const isGuardBand = hiltStartIndex !== -1 && p.y >= hiltStartIndex - 2 && p.y <= hiltStartIndex; // near cross-guard
      const isPommelBand = hiltStartIndex !== -1 && p.y >= hiltStartIndex + 1; // below guard (handle/pommel)
      const strengthMul = isHandle || isPommelBand ? 0.05 : isGuardBand ? 0.18 : 1.0;
      // Outward vector + a bit of deterministic “chaos”
      let vx = p.x - cx;
      let vy = p.y - cy;
      const len = Math.max(0.001, Math.hypot(vx, vy));
      vx /= len;
      vy /= len;
      const jx = (hash01(p.x, p.y, seed) - 0.5) * 0.9;
      const jy = (hash01(p.x, p.y, seed + 1) - 0.5) * 0.9;
      vx += jx;
      vy += jy;
      const len2 = Math.max(0.001, Math.hypot(vx, vy));
      vx /= len2;
      vy /= len2;
      // Per-cell stable wobble multiplier (no per-cell trig at runtime).
      const wobbleMul = 0.78 + hash01(p.x, p.y, seed + 2) * 0.44; // ~0.78..1.22
      m.set(k, { dx: vx, dy: vy, wobbleMul, strengthMul });
    }
    return m;
  }, [hiltStartIndex, isHandleFast, swordPositions]);

  const entropyRef = useRef<{ lastImpulseMs: number; amp01: number; px: number; beatLatch: boolean; prevBass: number; prevEnergy: number }>({
    lastImpulseMs: -1,
    amp01: 0,
    px: 0,
    beatLatch: false,
    prevBass: 0,
    prevEnergy: 0,
  });

  // Keep refs so the rAF scheduler can read without re-subscribing.
  const bladePositionsRef = useRef<Array<SwordPosition>>(bladePositions);
  const handlePositionsRef = useRef<Array<SwordPosition>>(handlePositionsMemo);
  useEffect(() => {
    bladePositionsRef.current = bladePositions;
  }, [bladePositions]);
  useEffect(() => {
    handlePositionsRef.current = handlePositionsMemo;
  }, [handlePositionsMemo]);
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  // Background should feel stable/dark by default (no constant color cycling).
  const [bgColor, setBgColor] = useState<string>('#0A0B0D');
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

  // PERF/DEBUG: keep lightweight refs for array sizes so the rAF scheduler doesn't depend on state arrays.
  const unicodeLenRef = useRef(0);
  const glitchCharsLenRef = useRef(0);
  const edgeLenRef = useRef(0);
  useEffect(() => {
    unicodeLenRef.current = unicodeGlitches.length;
  }, [unicodeGlitches.length]);
  useEffect(() => {
    glitchCharsLenRef.current = glitchChars.length;
  }, [glitchChars.length]);
  useEffect(() => {
    edgeLenRef.current = edgeEffects.length;
  }, [edgeEffects.length]);

  // PERF: Build O(1) lookup maps/sets for per-character overlays to avoid repeated `.find()` scans.
  const glitchCharMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; char: string }>();
    for (const g of glitchChars) {
      const k = `${g.x},${g.y}`;
      if (!m.has(k)) m.set(k, g);
    }
    return m;
  }, [glitchChars]);

  const unicodeGlitchMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; char: string }>();
    for (const g of unicodeGlitches) {
      const k = `${g.x},${g.y}`;
      if (!m.has(k)) m.set(k, g);
    }
    return m;
  }, [unicodeGlitches]);

  const coloredTileMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; color: string }>();
    for (const t of coloredTiles) {
      const k = `${t.x},${t.y}`;
      if (!m.has(k)) m.set(k, t);
    }
    return m;
  }, [coloredTiles]);

  const edgeEffectMap = useMemo(() => {
    const m = new Map<
      string,
      { x: number; y: number; char?: string; color?: string; offset?: { x: number; y: number }; rotation?: number; fontSize?: number }
    >();
    for (const e of edgeEffects) {
      const k = `${e.x},${e.y}`;
      if (!m.has(k)) m.set(k, e);
    }
    return m;
  }, [edgeEffects]);

  const blurredSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blurredChars) s.add(`${b.x},${b.y}`);
    return s;
  }, [blurredChars]);

  const skewMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; angle: number }>();
    for (const c of skewedChars) {
      const k = `${c.x},${c.y}`;
      if (!m.has(k)) m.set(k, c);
    }
    return m;
  }, [skewedChars]);

  const fadeMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; opacity: number }>();
    for (const c of fadedChars) {
      const k = `${c.x},${c.y}`;
      if (!m.has(k)) m.set(k, c);
    }
    return m;
  }, [fadedChars]);
  
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
  
  // NOTE: Legacy background init/resize effects removed.
  // They duplicated the scaffold+patch background system and caused hard “cuts” / overrides.
  
  // Smooth background pattern transitions (no hard cuts).
  const [staticBackgroundNext, setStaticBackgroundNext] = useState<string[][] | null>(null);
  const [staticBackgroundBlend, setStaticBackgroundBlend] = useState<number>(0);
  const bgBlendStartRef = useRef<number>(0);
  const BG_PATTERN_BLEND_MS = 3200;
  const staticBackgroundNextRef = useRef<string[][] | null>(null);
  useEffect(() => {
    staticBackgroundNextRef.current = staticBackgroundNext;
  }, [staticBackgroundNext]);

  // Pattern-Wechsel: alle 20s (as a slow crossfade; calmer)
  useEffect(() => {
    const interval = setInterval(() => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      const next = padBackgroundRows(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      setStaticBackgroundNext(next);
      setStaticBackgroundBlend(0);
      bgBlendStartRef.current = Date.now();
      throttledLog('Background pattern blending to next');
    }, 20000);
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
  const idleVeinsLastUpdateRef = useRef<number>(0);

  // OPTIMIERT: Statischen Hintergrund nur einmal generieren
  useEffect(() => {
    if (staticBackground.length === 0 && caveBackground.length > 0) {
      const paddedBackground = padBackgroundRows(caveBackground);
      setStaticBackground(paddedBackground);
    }
  }, [caveBackground, staticBackground.length]);

  // OPTIMIERT: Reaktive Audio-Effekte für visuellen Impact
  const effectsRafIdRef = useRef<number | null>(null);
  const effectsLastTickRef = useRef<number>(0);
  const glitchLevelRef = useRef<number>(glitchLevel);
  const idleRef = useRef<boolean>(idle);
  const unicodeGlitchUntilRef = useRef<number>(0);
  const unicodeGlitchActiveRef = useRef<boolean>(false);
  const edgeEffectsUntilRef = useRef<number>(0);
  const edgeEffectsActiveRef = useRef<boolean>(false);
  const glitchCharsUntilRef = useRef<number>(0);
  const glitchCharsActiveRef = useRef<boolean>(false);
  const blurUntilRef = useRef<number>(0);
  const blurActiveRef = useRef<boolean>(false);
  const skewUntilRef = useRef<number>(0);
  const skewActiveRef = useRef<boolean>(false);
  const fadeUntilRef = useRef<number>(0);
  const fadeActiveRef = useRef<boolean>(false);
  const lastColorChangeTimeRef = useRef<number>(lastColorChangeTime);
  const colorStabilityRef = useRef<number>(colorStability);
  const lastBgRegenAtRef = useRef<number>(0);
  const isMusicPlayingRef = useRef<boolean>(isMusicPlaying);
  const eqLastMsRef = useRef<number>(0);
  const eqPeakHoldUntilRef = useRef<number[]>(Array.from({ length: 16 }, () => 0));
  const eqStateRef = useRef<EqState>({ levels: Array.from({ length: 16 }, () => 0), peaks: Array.from({ length: 16 }, () => 0) });

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
    isMusicPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  // When playback stops, immediately clear playback-driven visuals (no "keep going" state leak).
  useEffect(() => {
    if (isMusicPlaying) return;
            tileLockedRef.current = false;
                tileBirthTimeRef.current = 0;
        currentTilesRef.current = [];
        setColoredTiles([]);
        setUnicodeGlitches([]);
    setEdgeEffects([]);
    setGlitchChars([]);
    setBlurredChars([]);
    setSkewedChars([]);
    setFadedChars([]);
    setGlowIntensity(0);
  }, [isMusicPlaying]);

  const eqGeom = useMemo(() => {
    // Include handle/knob so the whole sword can “play” as a display.
    return buildEqualizerGeometry(centeredSwordLines, swordPositions, 16, { includeHandle: true, includeEdges: false });
  }, [centeredSwordLines, swordPositions]);

  // Dynamic EQ palette (avoid “always green” by rotating on beat/onset).
  const eqPaletteIndexRef = useRef(0);
  const eqPaletteLastSwapMsRef = useRef(0);

  // Reactive refs for shimmer/wave coloring (avoid extra state arrays).
  const shimmerRef = useRef<{ nowMs: number; energy: number; bass: number; mid: number; high: number; beat: number }>({
    nowMs: 0,
    energy: 0,
    bass: 0,
    mid: 0,
    high: 0,
    beat: 0,
  });
  const reactiveLatestRef = useRef<{ energy: number; bass: number; mid: number; high: number; onset: number; beat: number }>({
    energy: 0,
    bass: 0,
    mid: 0,
    high: 0,
    onset: 0,
    beat: 0,
  });
  const baseColorRgb = useMemo(() => parseColorToRgbFast(baseColor) ?? { r: 0, g: 252, b: 166 }, [baseColor]);
  const baseColorRgbRef = useRef(baseColorRgb);
  useEffect(() => {
    baseColorRgbRef.current = baseColorRgb;
  }, [baseColorRgb]);

  const bladeEdgeWaveRef = useRef(bladeEdgeWave);
  useEffect(() => {
    bladeEdgeWaveRef.current = bladeEdgeWave;
  }, [bladeEdgeWave]);

  // Deterministic beat-traveling wave
  const waveStartMsRef = useRef<number>(-1);
  const waveMapRef = useRef<Map<string, string>>(new Map());

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

      // Per-frame time update for smooth render-time modulation (avoid 50ms quantization).
      shimmerRef.current.nowMs = nowMs;

      // ENTROPY should be latency-free: update latch + amplitude at rAF rate.
      {
        const entropy = entropyRef.current;
        const playing = isMusicPlayingRef.current && !idleRef.current;
        if (!playing) {
          entropy.amp01 = 0;
          entropy.lastImpulseMs = -1;
          entropy.beatLatch = false;
          entropy.prevBass = 0;
          entropy.prevEnergy = 0;
        } else {
          const snap = reactiveLatestRef.current;
          // Bass-transient gate: entropy should follow kick/bass, not melodic/synth spikes.
          const bassDelta = snap.bass - entropy.prevBass;
          const energyDelta = snap.energy - entropy.prevEnergy;
          entropy.prevBass = snap.bass;
          entropy.prevEnergy = snap.energy;

          const bassDominant = snap.bass > snap.mid * 1.45 && snap.bass > snap.high * 1.9;
          // ENTROPY should be kick/bass driven, not "beatDetected" driven.
          // We gate purely on bass dominance + bass transient, so melodic/synth spikes won't trigger it.
          const crashScore = clamp01(
            bassDelta * 22 +
              energyDelta * 10 +
              Math.max(0, snap.onset - 0.06) * 2.2 +
              Math.max(0, snap.bass - snap.mid) * 2.8,
          );
          const mainBeat =
            bassDominant &&
            snap.bass > 0.13 &&
            snap.energy > 0.09 &&
            bassDelta > 0.045 &&
            crashScore > 0.35;
          const minGapMs = 620; // much less frequent (avoid "always on")
          if (mainBeat && !entropy.beatLatch && (entropy.lastImpulseMs < 0 || nowMs - entropy.lastImpulseMs >= minGapMs)) {
            entropy.beatLatch = true;
            entropy.lastImpulseMs = nowMs;
          } else if (!mainBeat) {
            entropy.beatLatch = false;
          }

          const t = entropy.lastImpulseMs > 0 ? nowMs - entropy.lastImpulseMs : 1e9;
          // Snappier: faster attack + faster decay (less “laggy” feel).
          const attackMs = 14;
          const decayMs = 120;
          const a = t <= 0 ? 0 : t < attackMs ? t / attackMs : 1;
          const d = Math.exp(-Math.max(0, t - attackMs) / decayMs);
          entropy.amp01 = Math.max(0, Math.min(1, a * d));

          const forgeTier = Math.max(1, Math.min(3, (currentLevelRef2.current || levelPropRef.current || 1)));
          // Default: smaller displacement. Only go big on real “crash/crescendo”.
          // Default: very compact. Explode hard only when crashScore is high.
          const tierPx = forgeTier === 1 ? 12 : forgeTier === 2 ? 18 : 26;
          const crash = crashScore;
          // Nonlinear ramp: small most of the time; big on crescendos/crashes.
          const big = Math.pow(crash, 1.6);
          entropy.px = tierPx * (0.18 + big * 2.35);
        }
      }

      if (nowMs - effectsLastTickRef.current >= TICK_MS) {
        effectsLastTickRef.current = nowMs;

        // --- Color cycle (moved into scheduler; avoids extra effect bursts) ---
        const now = Date.now();

        // --- Background pattern crossfade step ---
        const nextBg = staticBackgroundNextRef.current;
        if (nextBg && nextBg.length > 0) {
          const start = bgBlendStartRef.current || now;
          const t = Math.max(0, Math.min(1, (now - start) / BG_PATTERN_BLEND_MS));
          // Ease-in-out (smoother than linear)
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          setStaticBackgroundBlend(ease);
          if (t >= 1) {
            setStaticBackground(nextBg);
            setStaticBackgroundNext(null);
            setStaticBackgroundBlend(0);
          }
        }

        const reactive = reactivityControllerRef.current!.update({
          nowMs,
          energy: energyRef.current,
          beatDetected: beatDetectedRef.current,
          frequencyData: frequencyDataRef.current,
        });

        // Update shimmer inputs for render-time modulation (cheap; no extra arrays).
        shimmerRef.current = {
          nowMs,
          energy: reactive.energy,
          bass: reactive.bass,
          mid: reactive.mid,
          high: reactive.high,
          beat: reactive.beat,
        };
        reactiveLatestRef.current = {
          energy: reactive.energy,
          bass: reactive.bass,
          mid: reactive.mid,
          high: reactive.high,
          onset: reactive.onset,
          beat: reactive.beat,
        };

        // Deterministic traveling edge wave on beat (replaces “random pulse spam”).
        // Wave runs from hilt -> tip; width scales with energy/beatStrength.
        if (beatDetectedRef.current) {
          waveStartMsRef.current = nowMs;
        }
        const waveStart = waveStartMsRef.current;
        const waveMap = new Map<string, string>();
        const waveGeom = bladeEdgeWaveRef.current;
        const baseRgb = baseColorRgbRef.current;
        if (waveStart > 0 && waveGeom.points.length) {
          const age = nowMs - waveStart;
          const durationMs = 520; // feels snappy
          if (age <= durationMs) {
            const t = clamp01(age / durationMs);
            // Ease for a more “punchy” travel
            const wavePos = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const width = 0.06 + reactive.energy * 0.05 + reactive.beat * 0.06;

            // Choose wave hue from current EQ palette (deterministic given audio events).
            const pal = EQ_PALETTES[eqPaletteIndexRef.current] ?? EQ_PALETTES[0];
            for (const p of waveGeom.points) {
              const d = Math.abs(p.prog01 - wavePos);
              if (d > width) continue;
              const a = 1 - d / Math.max(0.0001, width);
              // Band-hue: top -> high, middle -> mid, bottom -> low
              const hue = p.prog01 > 0.66 ? pal.high : p.prog01 > 0.33 ? pal.mid : pal.low;
              const hueRgb = parseColorToRgbFast(hue) ?? baseRgb;
              // Bright pulse to white-ish (more intense)
              const c = mixToWhite(hueRgb, 0.35 + a * 0.55);
              waveMap.set(p.k, c);
            }
          } else {
            waveStartMsRef.current = -1;
          }
        }
        waveMapRef.current = waveMap;

        // NOTE: Entropy is updated per-frame above to avoid latency / dying from 50ms scheduling.

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
              idle: idleRef.current,
              isMusicPlaying: isMusicPlayingRef.current,
              idleVisual: idleRef.current || !isMusicPlayingRef.current,
              tilesLen: currentTilesRef.current.length,
            });
          }
        }

        if (debugEffectsEnabled) {
          const last = debugEffectsLastSetRef.current;
          if (nowMs - last >= 200) {
            debugEffectsLastSetRef.current = nowMs;
            const ent = entropyRef.current;
            setDebugEffects({
              idle: idleRef.current,
              isMusicPlaying: isMusicPlayingRef.current,
              beatDetected: !!beatDetectedRef.current,
              energy: reactive.energy,
              bass: reactive.bass,
              mid: reactive.mid,
              high: reactive.high,
              onset: reactive.onset,
              beat: reactive.beat,
              entropyLastImpulseMs: ent.lastImpulseMs,
              entropyAmp01: ent.amp01,
              entropyPx: ent.px,
              entropyLatch: ent.beatLatch,
              tilesLen: currentTilesRef.current.length,
              unicodeLen: unicodeLenRef.current,
              glitchCharsLen: glitchCharsLenRef.current,
              edgeLen: edgeLenRef.current,
              blurActive: blurActiveRef.current,
              skewActive: skewActiveRef.current,
              fadeActive: fadeActiveRef.current,
            });
          }
        }

        // Background stays stable/dark by default (no color cycling).
        // (We can still change sword/base colors if desired, but background shifting is disabled.)
        const allowBgColorCycle = false;

        // In idle we keep colors stable (idle visuals are handled separately).
        if (!idleRef.current) {
          const adaptive = computeAdaptiveColorCycle({
            energy: reactive.energy,
            beatDetected: beatDetectedRef.current,
            lastColorChangeTime: lastColorChangeTimeRef.current,
            colorStability: colorStabilityRef.current,
            nowMs: now,
          });
          if (adaptive) {
            setBaseColor(adaptive.swordColor);
            if (allowBgColorCycle) setBgColor(adaptive.bgColor);
            setLastColorChangeTime(now);
            setColorStability(adaptive.newStability);
            lastColorChangeTimeRef.current = now;
            colorStabilityRef.current = adaptive.newStability;
          }

          const optimized = computeOptimizedColorCycle({
            energy: reactive.energy,
            beatDetected: beatDetectedRef.current,
            lastColorChangeTime: lastColorChangeTimeRef.current,
            colorStability: colorStabilityRef.current,
            nowMs: now,
          });
          if (optimized) {
            setBaseColor(optimized.swordColor);
            if (allowBgColorCycle) setBgColor(optimized.bgColor);
            setLastColorChangeTime(now);
            setColorStability(optimized.newStability);
            lastColorChangeTimeRef.current = now;
            colorStabilityRef.current = optimized.newStability;
          }
        }

        // --- BACKGROUND: organic patches + afterglow (less “flashy”, more persistent) ---
        {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
          const playing = isMusicPlayingRef.current && !idleRef.current;

          // Emit colored “particles” from a few organic patches during playback.
          if (playing) {
            const res = tickOrganicPatches(organicPatchesRef.current, {
              nowMs,
              width: bgWidth,
              height: bgHeight,
              energy: reactive.energy,
              onset: reactive.onset,
              beat: reactive.beat,
              beatDetected: beatDetectedRef.current,
              baseVeinPositions: baseBgPositionsRef.current,
              maxEmits: 380,
            });
            organicPatchesRef.current = res.state;
            if (res.emitted.length) {
              upsertVeinsInMap(veinsMapRef.current as any, res.emitted, now);
            }

            // Occasional extra “burst” on beat/onset (feels like patches breathe + cough color).
            if (beatDetectedRef.current || reactive.onset > 0.28) {
              const burst = generateBeatVeins(
                bgWidth,
                bgHeight,
                Math.min(1, reactive.energy * 1.15),
                beatDetectedRef.current,
                typeof window !== 'undefined' ? window.innerWidth : bgWidth,
                typeof window !== 'undefined' ? window.innerHeight : bgHeight,
              ).slice(0, 160);
              if (burst.length) upsertVeinsInMap(veinsMapRef.current as any, burst, now);
            }
          }

          // Afterglow: longer life + fade-out, no hard cut.
          const lifetimeMs = playing ? Math.floor(9000 + reactive.energy * 9000) : 2500;
          const fadeMs = playing ? 7000 : 2500;

          // Hard cap overlay size (prevent runaway)
          const MAX_OVERLAY = 2200;
          if (veinsMapRef.current.size > MAX_OVERLAY) {
            // First pass: delete older half-life entries
            const softAge = Math.floor(lifetimeMs * 0.55);
            Array.from(veinsMapRef.current.entries()).forEach(([k, v]) => {
              if (now - v.birth > softAge) veinsMapRef.current.delete(k);
            });
            // Still too big: delete arbitrary until under cap
            if (veinsMapRef.current.size > MAX_OVERLAY) {
              let toDrop = veinsMapRef.current.size - MAX_OVERLAY;
              // Avoid iterating MapIterator directly (TS downlevelIteration/target mismatch in this project).
              for (const key of Array.from(veinsMapRef.current.keys())) {
                veinsMapRef.current.delete(key);
                toDrop--;
                if (toDrop <= 0) break;
              }
            }
          }

          pruneVeinsByLifetimeWithFade(veinsMapRef.current as any, now, lifetimeMs, fadeMs);
          const overlay = mapToVeinsWithFade(veinsMapRef.current as any, now, lifetimeMs, fadeMs);

          // Combine stable scaffold + overlay (overlay wins on same cell).
          const combined = baseBgVeinsRef.current.length ? [...baseBgVeinsRef.current, ...overlay] : overlay;
          setColoredVeins(combined);
        }

        // Only generate playback effects when music is actually playing.
        // (Paused state should not keep spawning tiles/glow/glitches.)
        if (!idleRef.current && isMusicPlayingRef.current) {
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

          // NOTE: Only "spawn" effects (that allocate arrays) should be budgeted.
          // Cheap continuous scalars (like glow) must not starve glitches/edges → prevents “plain tiles dominate”.
          let spawnsUsed = 0;
          const forgeTier = Math.max(1, Math.min(3, (currentLevelRef2.current || levelPropRef.current || 1)));
          const chargeTier = Math.max(1, Math.min(3, chargeLevel || 1));
          const glitchTier = Math.max(0, Math.min(3, currentGlitchLevel || 0));
          // L1 subtle, L2 ~current, L3 much more stacked.
          const MAX_SPAWNS_PER_UPDATE = forgeTier === 1 ? 1 : forgeTier === 2 ? 2 : 3;
          const canSpawn = () => spawnsUsed < MAX_SPAWNS_PER_UPDATE;

          // --- Glow (forge-tiered) ---
          // Glow is continuous + cheap: do not consume the spawn budget.
          if (currentBeat || onset > 0.01 || currentEnergy > 0.03) {
            const forgeGlowMul = forgeTier === 1 ? 0.65 : forgeTier === 2 ? 1.0 : 1.35;
            const base = (0.025 + 0.22 * Math.min(1, (bass * 0.7 + currentEnergy * 0.3) + beatStrength * 0.25)) * forgeGlowMul;
            const randomIntensity = base + Math.random() * (forgeTier === 1 ? 0.02 : forgeTier === 2 ? 0.04 : 0.06);
              setGlowIntensity(randomIntensity);
            }

            // --- Sword Equalizer (16 bars) ---
            // Drives coloredTiles as the main “display” during playback (no intervals; same scheduler).
            if (frequencyDataRef.current && frequencyDataRef.current.length) {
              const raw = computeEqBands(frequencyDataRef.current, {
                barCount: 16,
                attackMs: 60,
                releaseMs: 220,
                peakHoldMs: 280,
                peakDecayPerSec: 0.9,
              });
              // Boost reactivity: amplify low/mid energy and compress highs for punchy bars.
              const gain = 2.2;
              const gamma = 0.65;
              const boosted = raw.map((v) => Math.min(1, Math.pow(Math.min(1, v * gain), gamma)));
              const stepped = stepEqState(
                eqStateRef.current,
                boosted,
                nowMs,
                eqLastMsRef.current,
                { barCount: 16, attackMs: 55, releaseMs: 260, peakHoldMs: 420, peakDecayPerSec: 0.7 },
                eqPeakHoldUntilRef.current,
              );
              eqLastMsRef.current = nowMs;
              eqPeakHoldUntilRef.current = stepped.peakHoldUntilMs;
              eqStateRef.current = stepped.state;

              // Palette swap on strong events (musical, not random).
              const swapCooldownMs = 650;
              const wantsSwap = currentBeat || onset > 0.08 || (beatStrength > 0.25 && currentEnergy > 0.18);
              if (wantsSwap && nowMs - eqPaletteLastSwapMsRef.current > swapCooldownMs) {
                eqPaletteLastSwapMsRef.current = nowMs;
                eqPaletteIndexRef.current = (eqPaletteIndexRef.current + 1) % EQ_PALETTES.length;
              }
              const palette = EQ_PALETTES[eqPaletteIndexRef.current] ?? EQ_PALETTES[0];

              const eqTiles = renderEqTiles(eqGeom, stepped.state, palette);
              // Add a bit of “old chaos” on top (controlled) so it doesn’t feel too sterile.
              let mergedTiles = eqTiles;
              const forgeChaosMul = forgeTier === 1 ? 0.55 : forgeTier === 2 ? 1.0 : 1.45;
              const chaosChance = Math.min(0.5, (0.05 + onset * 2.2 + beatStrength * 0.12) * forgeChaosMul);
              if ((currentBeat || onset > 0.02) && Math.random() < chaosChance) {
                const chaos = generateColoredTiles(swordPositions, glitchTier, colorEffectIntensity, Math.min(1, currentEnergy + onset));
                // Merge with cap (avoid huge arrays); chaos overlays EQ where it overlaps.
                const byKey = new Map<string, { x: number; y: number; color: string }>();
                for (const t of eqTiles) byKey.set(`${t.x},${t.y}`, t);
                const chaosCap = forgeTier === 1 ? 35 : forgeTier === 2 ? 90 : 170;
                for (const t of chaos.slice(0, chaosCap)) byKey.set(`${t.x},${t.y}`, t);
                mergedTiles = Array.from(byKey.values());
              }

              currentTilesRef.current = mergedTiles;
              setColoredTiles(mergedTiles);
              tileLockedRef.current = true;
              tileBirthTimeRef.current = now;
            }

            // --- Tiles (no setTimeout; lifecycle handled here) ---
            if (tileLockedRef.current && tileBirthTimeRef.current > 0) {
              const age = now - tileBirthTimeRef.current;
              if (age >= TILE_LOCK_MS) {
                // If equalizer is active, we keep tiles alive (they are refreshed each tick).
                if (!(isMusicPlayingRef.current && frequencyDataRef.current && frequencyDataRef.current.length)) {
                  currentTilesRef.current = [];
                  setColoredTiles([]);
                }
                tileBirthTimeRef.current = 0;
                tileLockedRef.current = false;
              }
            }

          const shouldTriggerTiles =
              currentBeat ||
              (onset > 0.012 && (bass > 0.05 || mid > 0.05)) ||
              currentEnergy > 0.03;
            // If equalizer is active, don't spam random tile clusters.
          if (shouldTriggerTiles && !tileLockedRef.current && !(frequencyDataRef.current && frequencyDataRef.current.length) && canSpawn()) {
              const tempIntensity = { ...colorEffectIntensity };
              for (const level in tempIntensity) {
                if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
                  const numLevel = Number(level) as keyof typeof colorEffectIntensity;
                const cap = forgeTier === 1 ? 2 : forgeTier === 2 ? 4 : 8;
                tempIntensity[numLevel] = Math.min(
                  cap,
                  tempIntensity[numLevel] + Math.floor(currentEnergy * (currentBeat ? 1.2 : 0.6)),
                );
                }
              }

            const generatedTiles = generateColoredTiles(swordPositions, glitchTier, tempIntensity, currentEnergy);
              currentTilesRef.current = generatedTiles;
              tileBirthTimeRef.current = now;
              setColoredTiles(generatedTiles);
              tileLockedRef.current = true;
              spawnsUsed++;
            }

            // --- Unicode glitches (no setTimeout; expiry handled here) ---
            if (unicodeGlitchActiveRef.current && now >= unicodeGlitchUntilRef.current) {
              unicodeGlitchActiveRef.current = false;
      setUnicodeGlitches([]);
            }

          // NOTE: Some tracks have long “high intensity” plateaus with little rhythmic transient energy.
          // In those passages, beat/onset can be low while energy is high, which previously (via synthetic beats)
          // still produced glitch bursts. Keep it punchy by also allowing a high-energy fallback trigger.
          const highEnergyPressure =
            currentEnergy > 0.32 && (reactive.high > 0.16 || reactive.mid > 0.18 || reactive.bass > 0.18);
          if ((beatStrength > 0.85 || onset > 0.03 || (glitchTier >= 2 && highEnergyPressure)) && canSpawn() && now >= unicodeGlitchUntilRef.current) {
            const tempGlitchLevel = Math.min(3, Math.floor(glitchTier + (currentEnergy * 1.2)));
            // Glitch L3 should primarily affect the blade; handle/hilt get only subtle echoes.
            const unicodeBase = tempGlitchLevel >= 3 ? bladePositionsRef.current : swordPositions;
            const unicode = generateUnicodeGlitches(unicodeBase, tempGlitchLevel);
            // Add a tiny handle “echo” so it’s not completely dead, but stays subtle.
            const handleEcho =
              tempGlitchLevel >= 3 && handlePositionsRef.current.length
                ? generateUnicodeGlitches(handlePositionsRef.current, 1).slice(0, 3)
                : [];
            setUnicodeGlitches([...unicode, ...handleEcho]);
              unicodeGlitchActiveRef.current = true;
            unicodeGlitchUntilRef.current = now + (beatStrength > 0.85 ? (glitchTier >= 3 ? 900 : 520) : (glitchTier >= 3 ? 650 : 360));
            spawnsUsed++;
            }

          // --- DOS glitch chars (reintroduced, tiered) ---
          if (glitchCharsActiveRef.current && now >= glitchCharsUntilRef.current) {
            glitchCharsActiveRef.current = false;
      setGlitchChars([]);
          }
          const wantsGlitchChars =
            glitchTier >= 2 &&
            (currentBeat || beatStrength > 0.7 || onset > 0.04 || highEnergyPressure) &&
            canSpawn() &&
            now >= glitchCharsUntilRef.current;
          if (wantsGlitchChars) {
            const freqMul = glitchTier === 2 ? 1.0 : 1.45;
            const freq = { ...glitchFrequency } as any;
            // boost level 3 frequency without exploding level 1/2
            freq[3] = Math.min(0.92, (freq[3] ?? 0.48) * freqMul);
            const glitchBase = glitchTier >= 3 ? bladePositionsRef.current : swordPositions;
            const bladeGlitch = generateGlitchChars(glitchBase, glitchTier, freq, glitchSymbols);
            const handleGlitch =
              glitchTier >= 3 && handlePositionsRef.current.length
                ? generateGlitchChars(handlePositionsRef.current, 1, freq, glitchSymbols).slice(0, 6)
                : [];
            setGlitchChars([...bladeGlitch, ...handleGlitch]);
            glitchCharsActiveRef.current = true;
            glitchCharsUntilRef.current = now + (glitchTier >= 3 ? 520 : 320);
            spawnsUsed++;
          }

          // --- Blur / Skew / Fade layers (glitch-tiered, makes L3 feel “unhinged”) ---
          if (blurActiveRef.current && now >= blurUntilRef.current) {
            blurActiveRef.current = false;
      setBlurredChars([]);
          }
          if (skewActiveRef.current && now >= skewUntilRef.current) {
            skewActiveRef.current = false;
      setSkewedChars([]);
          }
          if (fadeActiveRef.current && now >= fadeUntilRef.current) {
            fadeActiveRef.current = false;
      setFadedChars([]);
          }
          const wantsBlur = glitchTier >= 2 && (onset > 0.03 || beatStrength > 0.55 || highEnergyPressure) && now >= blurUntilRef.current;
          const wantsSkew = glitchTier >= 2 && (currentBeat || beatStrength > 0.7 || highEnergyPressure) && now >= skewUntilRef.current;
          const wantsFade = glitchTier >= 3 && (currentBeat || onset > 0.05 || highEnergyPressure) && now >= fadeUntilRef.current;
          if (wantsBlur && canSpawn()) {
            setBlurredChars(generateBlurredChars(glitchTier >= 3 ? bladePositionsRef.current : swordPositions, glitchTier));
            blurActiveRef.current = true;
            blurUntilRef.current = now + (glitchTier >= 3 ? 520 : 340);
            spawnsUsed++;
          }
          if (wantsSkew && canSpawn()) {
            setSkewedChars(generateSkewedChars(glitchTier >= 3 ? bladePositionsRef.current : swordPositions, glitchTier));
            skewActiveRef.current = true;
            skewUntilRef.current = now + (glitchTier >= 3 ? 520 : 340);
            spawnsUsed++;
          }
          if (wantsFade && canSpawn()) {
            setFadedChars(generateFadedChars(bladePositionsRef.current, glitchTier));
            fadeActiveRef.current = true;
            fadeUntilRef.current = now + 650;
            spawnsUsed++;
          }

            // --- Edge effects (no setTimeout; expiry handled here) ---
            if (edgeEffectsActiveRef.current && now >= edgeEffectsUntilRef.current) {
              edgeEffectsActiveRef.current = false;
              setEdgeEffects([]);
            }

          if ((beatStrength > 0.6 || onset > 0.02 || currentEnergy > 0.03) && edgePositions.length > 0) {
              // Regenerate if expired or on new beat.
              if (!edgeEffectsActiveRef.current || currentBeat) {
                if (!canSpawn()) {
                  // Keep existing edge effects until expiry; don't spawn new ones if we're out of budget this tick.
                } else {
                const { effects, cleanupMs } = generateReactiveEdgeEffects({
                  edgePositions,
                  chargeLevel,
                energy: Math.min(1, currentEnergy + onset * 0.9 + (chargeTier >= 3 ? beatStrength * 0.25 : 0)),
                  beatDetected: currentBeat,
                });
                setEdgeEffects(effects);
                edgeEffectsActiveRef.current = true;
              // L3 charge: let it linger slightly longer
              edgeEffectsUntilRef.current = now + (chargeTier >= 3 ? Math.floor(cleanupMs * 1.35) : cleanupMs);
                spawnsUsed++;
                }
              }
            }

            // --- Rare background regen (as a smooth blend, not a hard cut) ---
            const BG_REGEN_COOLDOWN_MS = 15000;
            if (
              now - lastBgRegenAtRef.current >= BG_REGEN_COOLDOWN_MS &&
              (
                currentEnergy > 0.97 ||
                (currentBeat && beatStrength > 0.92 && onset > 0.02 && Math.random() < 0.06)
              )
            ) {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
              const next = padBackgroundRows(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
              setStaticBackgroundNext(next);
              setStaticBackgroundBlend(0);
              bgBlendStartRef.current = Date.now();
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
  }, [chargeLevel, debugEffectsEnabled, debugReactiveEnabled, edgePositions, eqGeom, getBackgroundDimensions, swordPositions]);
  
  // Edge effects are driven by the rAF scheduler above (avoids stacked timeouts).
  
  // --- IDLE SWORD "SPARFLAMME" (pilot light) ---
  // Goal: subtle, slow, visible; and also used during the pause->idle transition (idleVisual).
  useEffect(() => {
    if (!idleVisual) return;

    // Stop any aggressive visuals during idle/pause and show only a tiny pilot light.
    setUnicodeGlitches([]);
    setEdgeEffects([]);
    setGlitchChars([]);
    setBlurredChars([]);
    setSkewedChars([]);
    setFadedChars([]);

    const base = handlePositionsRef.current.length ? handlePositionsRef.current : swordPositions;

    // Ensure we ALWAYS render something visible (previous hash filter could yield 0 tiles depending on geometry).
    const middleX = centeredSwordLines[0]?.length ? Math.floor(centeredSwordLines[0].length / 2) : 0;
    const sorted = [...base].sort((a, b) => {
      // prefer lower parts + closer to center
      if (b.y !== a.y) return b.y - a.y;
      return Math.abs(a.x - middleX) - Math.abs(b.x - middleX);
    });

    const pickSubset = (color: string, phase: number) => {
      const hashed = base.filter((p) => ((p.x * 19 + p.y * 11 + phase) % 23) === 0);
      const pool = (hashed.length ? hashed : sorted);
      const take = Math.min(14, pool.length);
      const start = pool.length ? (phase * 3) % pool.length : 0;
      const picked: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < take; i++) {
        picked.push(pool[(start + i) % pool.length]);
      }
      return picked.map((p) => ({ ...p, color }));
    };

    let phase = 0;
    const renderPilot = () => {
      // color: mostly dim green/cyan, occasionally pink (very rare)
      // Make the pilot light clearly visible but still subtle: mostly warm ember, sometimes cool, rarely pink spark.
      const color =
        phase % 16 === 0
          ? getDarkerColor('#FF3EC8', 0.35) // rare spark
          : phase % 4 === 0
            ? getDarkerColor('#3EE6FF', 0.55) // cool flicker
            : getDarkerColor('#F8E16C', 0.50); // warm ember

      const tiles = pickSubset(color, phase);
      currentTilesRef.current = tiles;
      setColoredTiles(tiles);

      // gentle breathing glow
      const glow = 0.02 + Math.sin(phase * 0.9) * 0.015; // ~0.005..0.035
      setGlowIntensity(glow);
      phase++;
    };

    renderPilot();
    const interval = setInterval(renderPilot, 1200); // visible, but still "sparflamme"

    return () => {
      clearInterval(interval);
    };
  }, [idleVisual, swordPositions, centeredSwordLines]);

  // NOTE: Beat/energy background veins are handled by the main rAF scheduler (patches + afterglow).
  
  // NOTE: Idle background veins are now the stable scaffold + fading overlay decay (no extra timers).
  
  // Color cycle + edge effects are driven by the rAF scheduler above (avoids stacked timeouts).

  // NOTE: Frequency-reactive background visuals are handled by the patch controller (onset/beat/energy),
  // so we don’t overwrite the afterglow system with a direct setColoredVeins().
  
  // OPTIMIERT: Memoisierte Berechnungen für Rendering
  const shadowSize = useMemo(() => Math.floor(glowIntensity * 20), [glowIntensity]);
  const textShadow = useMemo(() => `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`, [shadowSize, glitchLevel, baseColor]);
  // Background should stay dark even when bgColor is a vivid complementary neon.
  // Slightly lighter than “near-black”, still dark: makes veins readable without neon wash.
  const backgroundColor = useMemo(() => getDarkerColor(bgColor, 0.45), [bgColor]);
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
          <div>idle: {debugReactive?.idle ? '1' : '0'}</div>
          <div>music: {debugReactive?.isMusicPlaying ? '1' : '0'}</div>
          <div>idleVisual: {debugReactive?.idleVisual ? '1' : '0'}</div>
          <div>tilesLen: {debugReactive?.tilesLen ?? 0}</div>
          <div>freqLen: {debugReactive?.freqLen ?? 0}</div>
          <div>energy: {(debugReactive?.energy ?? 0).toFixed(3)}</div>
          <div>bass: {(debugReactive?.bass ?? 0).toFixed(3)}</div>
          <div>mid: {(debugReactive?.mid ?? 0).toFixed(3)}</div>
          <div>high: {(debugReactive?.high ?? 0).toFixed(3)}</div>
          <div>onset: {(debugReactive?.onset ?? 0).toFixed(3)}</div>
          <div>beat: {(debugReactive?.beat ?? 0).toFixed(3)}</div>
        </div>
      )}
      {debugEffectsEnabled && (
        <div
          className="fixed left-2 bottom-32 z-[9999] rounded border border-grifter-blue bg-black/80 px-3 py-2 text-[10px] font-mono text-grifter-blue"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <div className="font-bold">EFFECTS</div>
          <div>idle: {debugEffects?.idle ? '1' : '0'}</div>
          <div>music: {debugEffects?.isMusicPlaying ? '1' : '0'}</div>
          <div>beatDetected: {debugEffects?.beatDetected ? '1' : '0'}</div>
          <div>energy: {(debugEffects?.energy ?? 0).toFixed(3)}</div>
          <div>bass: {(debugEffects?.bass ?? 0).toFixed(3)}</div>
          <div>onset: {(debugEffects?.onset ?? 0).toFixed(3)}</div>
          <div>beat: {(debugEffects?.beat ?? 0).toFixed(3)}</div>
          <div>entropy: {(debugEffects?.entropyAmp01 ?? 0).toFixed(3)} px:{(debugEffects?.entropyPx ?? 0).toFixed(1)} latch:{debugEffects?.entropyLatch ? '1' : '0'}</div>
          <div>lastImpulseMs: {debugEffects?.entropyLastImpulseMs ? Math.floor(debugEffects.entropyLastImpulseMs) : -1}</div>
          <div>tiles: {debugEffects?.tilesLen ?? 0}</div>
          <div>unicode: {debugEffects?.unicodeLen ?? 0}</div>
          <div>dos: {debugEffects?.glitchCharsLen ?? 0}</div>
          <div>edge: {debugEffects?.edgeLen ?? 0}</div>
          <div>blur/skew/fade: {(debugEffects?.blurActive ? '1' : '0')}/{(debugEffects?.skewActive ? '1' : '0')}/{(debugEffects?.fadeActive ? '1' : '0')}</div>
        </div>
      )}
      {/* Höhlen-Hintergrund */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: (0.45 + (glitchLevel * 0.08)) * (idle ? 0.55 : 1),
          color: lighterBgColor,
          filter: `brightness(${0.35 + (glitchLevel * 0.075)}) contrast(${0.65 + (glitchLevel * 0.05)})`,
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <div 
          className="relative w-full h-full"
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
            patternB={staticBackgroundNext ?? undefined}
            patternBlend={staticBackgroundBlend}
            veins={coloredVeins}
            width={((staticBackground.length > 0 ? staticBackground[0].length : caveBackground[0]?.length) || 160) * 10}
            height={((staticBackground.length > 0 ? staticBackground.length : caveBackground.length) || 100) * 14}
            fontSize={13}
            fontFamily={'monospace'}
          />
        </div>
      </div>
      {/* Schwert im Vordergrund */}
      <pre
        className="relative z-10 font-mono text-sm sm:text-base md:text-lg lg:text-xl whitespace-pre select-none"
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
              const k = `${x},${y}`;
              const glitch = glitchCharMap.get(k);
              const unicodeGlitch = unicodeGlitchMap.get(k);
              const coloredTile = coloredTileMap.get(k);
              const edgeEffect = edgeEffectMap.get(k);
              const waveColor = waveMapRef.current.get(k);
              const isEdge = isEdgeChar(char) && !isHandleFast(x, y);
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
              } else if (isEdge && waveColor) {
                // Deterministic beat-wave highlight on blade edges
                style.color = waveColor;
                style.textShadow = `0 0 ${shadowSize}px ${waveColor}`;
              } else if (!isHandleFast(x, y) && isMusicPlaying && !idle) {
                // Band-locked shimmer on the blade (cheap: just compute color; no extra arrays).
                const s = shimmerRef.current;
                // Map y to top/mid/bottom thirds of blade area
                const geom = bladeEdgeWaveRef.current;
                const denom = Math.max(1, geom.maxY - geom.minY);
                const prog = clamp01(1 - (y - geom.minY) / denom);
                const band = prog > 0.66 ? s.high : prog > 0.33 ? s.mid : s.bass;
                const phase = (s.nowMs * 0.012) + x * 0.37 + y * 0.11;
                const shimmer = (Math.sin(phase) + 1) * 0.5;
                const amount = clamp01((0.03 + band * 0.11 + s.energy * 0.05) * shimmer);
                const c = mixToWhite(baseColorRgbRef.current, amount);
                style.color = c;
                style.textShadow = `0 0 ${shadowSize}px ${c}`;
              }
              
              // ROTATION-EFFEKT (Charge Level 1+)
              if (edgeEffect?.rotation !== undefined) {
                style.transform = `${style.transform || ''} rotate(${edgeEffect.rotation}deg)`.trim();
              }
              
              if (edgeEffect?.offset) {
                style.transform = `${style.transform || ''} translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`.trim();
              }

              // ENTROPY: beat-impact “explosion drawing” that makes the sword briefly fly apart.
              // Keep it cheap: use precomputed direction vectors + a single global amplitude ref.
              if (isMusicPlayingRef.current && !idleRef.current) {
                const ent = entropyRef.current;
                if (ent.amp01 > 0.001) {
                  const v = entropyVecMap.get(k);
                  if (v) {
                    // Global wobble (cheap) + per-cell wobbleMul (precomputed) => no per-cell trig.
                    const globalWobble = 0.84 + Math.sin(shimmerRef.current.nowMs * 0.06) * 0.16;
                    const mag = ent.px * ent.amp01 * globalWobble * v.wobbleMul * v.strengthMul;
                    style.transform = `${style.transform || ''} translate(${v.dx * mag}px, ${v.dy * mag}px)`.trim();
                  }
                }
              }
              const isBlurred = blurredSet.has(k);
              if (isBlurred) {
                style.filter = `${style.filter || ''} blur(1px)`.trim();
              }
              const skewEffect = skewMap.get(k);
              if (skewEffect) {
                style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
              }
              const fadeEffect = fadeMap.get(k);
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