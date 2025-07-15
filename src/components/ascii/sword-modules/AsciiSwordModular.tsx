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
import { generateCaveBackground, generateColoredVeins, generateIdleVeinSequence, generateBeatVeins, generateCenteredEnergyVeins } from './effects/backgroundEffects';
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
import AsciiBackgroundCanvas from './AsciiBackgroundCanvas';

export default function AsciiSwordModular({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // NEU: Track-spezifische Level basierend auf der aktuellen Track-Konfiguration
  const [trackLevel, setTrackLevel] = useState(1);
  
  // Lade Track-Konfiguration für Level-Berechnung
  useEffect(() => {
    const loadTrackLevel = async () => {
      try {
        // Hole aktuellen Track aus dem AudioAnalyzer
        const audioElement = document.querySelector('audio');
        if (!audioElement) return;
        
        const trackPath = audioElement.src;
        const trackName = trackPath.split('/').pop()?.replace('.mp3', '');
        
        if (!trackName) return;
        
        // Lade Track-Konfiguration
        const configPath = `/config/tracks/${trackName}.json`;
        const response = await fetch(configPath);
        
        if (response.ok) {
          const trackConfig = await response.json();
          const dynamicRange = trackConfig.metadata?.dynamicRange || 2.5;
          
          // Berechne Track-Level basierend auf dynamicRange
          let calculatedLevel = 1;
          if (dynamicRange >= 4.0) calculatedLevel = 3; // Hohe Dynamik = Level 3
          else if (dynamicRange >= 3.0) calculatedLevel = 2; // Mittlere Dynamik = Level 2
          else calculatedLevel = 1; // Niedrige Dynamik = Level 1
          
          setTrackLevel(calculatedLevel);
          // console.log(`🎵 Track-Level berechnet: ${trackName} -> Level ${calculatedLevel} (dynamicRange: ${dynamicRange})`);
        }
      } catch (error) {
        console.warn('⚠️ Fehler beim Laden der Track-Konfiguration für Level-Berechnung:', error);
        setTrackLevel(1); // Fallback auf Level 1
      }
    };
    
    loadTrackLevel();
    
    // NEU: Event-Listener für Track-Wechsel
    const handleTrackChange = () => {
      setTimeout(loadTrackLevel, 500); // Kurze Verzögerung für Track-Load
    };
    
    // Event-Listener für Track-Wechsel hinzufügen
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.addEventListener('loadstart', handleTrackChange);
      audioElement.addEventListener('canplay', handleTrackChange);
    }
    
    return () => {
      // Event-Listener entfernen
      if (audioElement) {
        audioElement.removeEventListener('loadstart', handleTrackChange);
        audioElement.removeEventListener('canplay', handleTrackChange);
      }
    };
  }, []);
  
  // VERBESSERT: Track-spezifische Level für Glitches und Charge
  const effectiveGlitchLevel = Math.max(glitchLevel, level, trackLevel); // Verwende das höchste Level
  const effectiveChargeLevel = Math.max(chargeLevel, level, trackLevel); // Verwende das höchste Level
  
  // Debug-Log für effektive Level (nur bei Änderungen)
  useEffect(() => {
    // console.log(`🎯 Effektive Level: Glitch=${effectiveGlitchLevel} (PowerUp=${glitchLevel}, Base=${level}, Track=${trackLevel}), Charge=${effectiveChargeLevel} (PowerUp=${chargeLevel}, Base=${level}, Track=${trackLevel})`);
  }, [effectiveGlitchLevel, effectiveChargeLevel, glitchLevel, chargeLevel, level, trackLevel]);
  
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
  const maxVeinsRef = useRef<number>(400); // Reduziert auf 400 für weniger Veins (20% reduziert)
  const veinCleanupIntervalRef = useRef<number>(20000); // Erhöht von 15000ms auf 20000ms für bessere Performance
  const veinGenerationIntervalRef = useRef<number>(12000); // Erhöht von 8000ms auf 12000ms für bessere Performance
  const lastVeinLogTimeRef = useRef<number>(0);
  const idleStepRef = useRef<number>(0); // Für Idle-Animation Schritte
  
  // MACRO-PATTERN COOLDOWN: Verhindert zu häufige Hintergrund-Wechsel
  const lastPatternChangeRef = useRef<number>(0);
  const PATTERN_COOLDOWN_MS = 30000; // 30 Sekunden zwischen Pattern-Wechseln
  
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
    const baseVeins = Math.floor(10 + (effectiveGlitchLevel * 5));
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
  }, [effectiveGlitchLevel, getBackgroundDimensions, clearAllIntervals, clearBackgroundCache]);

  // Resize-Handler: Veins ergänzen und State setzen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      const veinMultiplier = veinIntensity[effectiveGlitchLevel as keyof typeof veinIntensity] || 1;
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
  }, [effectiveGlitchLevel, getBackgroundDimensions]);

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
        const count = Math.floor(Math.random() * 9) + 8; // 8–16 neue Veins (20% reduziert)
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
        const count = Math.floor(Math.random() * 17) + 24; // 24–40 neue Veins (20% reduziert)
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
  const [centeredEnergyVeins, setCenteredEnergyVeins] = useState<Array<{x: number, y: number, color: string, intensity: number}>>([]);
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
    
    // VERBESSERT: Mehr Effekte gleichzeitig für bessere Visualisierung
    let effectsTriggered = 0;
    const MAX_EFFECTS_PER_UPDATE = 3; // Erhöht auf 3 Effekte pro Update
    
    // Glow-Effekte - Reaktiver für visuellen Impact
    if ((beatDetected && effectsTriggered < MAX_EFFECTS_PER_UPDATE) || energy > 0.03) { // Noch empfindlicher: ab 0.03
      const randomIntensity = Math.random() * 0.15 + 0.05; // Zurück zu 0.15 für besseren visuellen Impact
      setGlowIntensity(randomIntensity);
      effectsTriggered++;
    }
    
    // Tile-Effekte - REAKTIVER: Bei jedem Beat oder höherer Energy
    if (beatDetected || energy > 0.02) { // Empfindlicher: ab 0.02 statt 0.03
      const tileNow = Date.now();
      // Wenn Tiles gelockt sind, keine neue Generierung zulassen
      if (tileLockedRef.current) {
        return;
      }
      // Wenn Tiles existieren, entferne sie (nach Ablauf des Locks)
      if (currentTilesRef.current.length > 0) {
        const removeAge = tileNow - tileBirthTimeRef.current;
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
              const generatedTiles = generateColoredTiles(swordPositions, effectiveGlitchLevel, tempIntensity, energy);
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
      const generatedTiles = generateColoredTiles(swordPositions, effectiveGlitchLevel, tempIntensity, energy);
      currentTilesRef.current = generatedTiles;
      tileBirthTimeRef.current = tileNow;
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
    
    // VERBESSERT: Aktive Unicode-Glitch-Effekte für bessere Visualisierung
    if ((beatDetected || energy > 0.005) && effectsTriggered < MAX_EFFECTS_PER_UPDATE) { // Noch empfindlicher
      const tempGlitchLevel = Math.min(3, Math.floor(effectiveGlitchLevel + (energy * 4.0))); // Noch stärker verstärkt
      
      const newUnicodeGlitches = generateUnicodeGlitches(swordPositions, tempGlitchLevel);
      setUnicodeGlitches(newUnicodeGlitches);
      
      // Debug-Log für glitchPercentage-Reduktion (nur bei signifikanten Änderungen)
      if (newUnicodeGlitches.length > 0 && (Math.random() < 0.1)) { // Nur 10% der Logs anzeigen
        // console.log(`[GLITCH] Generated ${newUnicodeGlitches.length} Unicode glitches at level ${tempGlitchLevel} (effectiveGlitchLevel: ${effectiveGlitchLevel})`);
      }
      
      // VIEL längere Cleanup-Dauer für bessere Sichtbarkeit
      const duration = beatDetected ? 2000 : Math.max(1500, Math.min(2500, Math.floor(energy * 1000)));
      const timeout = setTimeout(() => {
        setUnicodeGlitches([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
      effectsTriggered++;
    }
    
    // MACRO-PATTERN: Nur bei echten Stimmungswechseln (sehr selten)
    const currentTime = Date.now();
    if (beatDetected && 
        Math.random() < 0.0005 && // Nur 0.05% Chance bei jedem Beat
        currentTime - lastPatternChangeRef.current > PATTERN_COOLDOWN_MS) { // Mindestens 30s Cooldown
      
      lastPatternChangeRef.current = currentTime;
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
      
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight, viewportWidth, viewportHeight));
      setBackgroundGenerated(false);
    }
    
  }, [beatDetected, energy, effectiveGlitchLevel, swordPositions, getBackgroundDimensions]);
  
  // ENTFERNT: Separater useEffect für Unicode-Glitches - jetzt nur noch im Haupt-Effekt
  
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
    
  }, [beatDetected, energy, effectiveGlitchLevel, swordPositions, getBackgroundDimensions, setColoredVeins]);
  
  // NEU: Zentrierte Energie-Animation - wächst von der Mitte aus nach außen
  useEffect(() => {
    // Nur aktivieren wenn Energie vorhanden ist
    if (energy < 0.01) {
      setCenteredEnergyVeins([]);
      return;
    }
    
    // Generiere zentrierte Veins basierend auf Energie und Beat
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : bgWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : bgHeight;
    
    // Generiere zentrierte Energie-Veins
    const centeredVeins = generateCenteredEnergyVeins(bgWidth, bgHeight, energy, beatDetected, viewportWidth, viewportHeight);
    setCenteredEnergyVeins(centeredVeins);
    
    // Flüssigere Animation: kürzere Dauer für bessere Reaktivität
    const animationDuration = beatDetected ? 150 : Math.max(100, Math.min(200, Math.floor(energy * 300)));
    const timeout = setTimeout(() => {
      setCenteredEnergyVeins([]);
    }, animationDuration);
    
    cleanupTimeoutsRef.current.add(timeout);
    
  }, [beatDetected, energy, getBackgroundDimensions]);
  
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
  }, [beatDetected, getBackgroundDimensions, isMusicPlaying, isIdleActive]);
  
  // VEREINFACHT: Farb-Effekte nur bei Beats oder hoher Energy
  useEffect(() => {
    if ((beatDetected || energy > 0.15) && Date.now() - lastColorChangeTime > colorStability) {
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      setLastColorChangeTime(Date.now());
      setColorStability(1000); // Feste 1 Sekunde Stabilität
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // VERBESSERT: Aktive Edge-Effekte für bessere Visualisierung
  useEffect(() => {
    if (beatDetected || energy > 0.01 || effectiveGlitchLevel > 0) { // Empfindlicher und effektives Glitch-Level
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}, rotation?: number}> = [];
      
      // Erhöhte Chancen basierend auf Charge-Level und Glitch-Level
      let effectChance = 0.25; // Basis-Chance noch mehr erhöht
      
      switch (effectiveChargeLevel) {
        case 1: effectChance = 0.4; break; // Erhöht
        case 2: effectChance = 0.6; break; // Erhöht
        case 3: effectChance = 0.8; break; // Erhöht
        default: effectChance = 0.25;
      }
      
      // Zusätzlicher Boost durch Glitch-Level
      effectChance += effectiveGlitchLevel * 0.15; // +15% pro Glitch-Level
      
              edgePositions.forEach(pos => {
          // Erweiterte Effekte mit erhöhter Chance
          if (Math.random() < effectChance) {
            const effectType = Math.floor(Math.random() * 4); // 4 verschiedene Effekte (inkl. Rotation)
          
                      switch (effectType) {
                            case 0: // Vibration
                const offsetX = (Math.random() - 0.5) * (3 + effectiveGlitchLevel * 2); // Stärkere Vibration
                const offsetY = (Math.random() - 0.5) * (3 + effectiveGlitchLevel * 2);
                newEdgeEffects.push({
                  x: pos.x,
                  y: pos.y,
                  offset: { x: offsetX, y: offsetY }
                });
                break;
                
              case 1: // Farbe
                const colorIndex = Math.floor(Math.random() * accentColors.length);
                newEdgeEffects.push({
                  x: pos.x,
                  y: pos.y,
                  color: accentColors[colorIndex]
                });
                break;
                
              case 2: // Glitch-Zeichen
                const glitchChars = edgeGlitchChars[effectiveGlitchLevel as keyof typeof edgeGlitchChars] || edgeGlitchChars[1];
                const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                newEdgeEffects.push({
                  x: pos.x,
                  y: pos.y,
                  char: glitchChar
                });
                break;
                
              case 3: // Rotation
                const rotationAngle = (Math.random() - 0.5) * (15 + effectiveGlitchLevel * 8); // Stärkere Rotation
                newEdgeEffects.push({
                  x: pos.x,
                  y: pos.y,
                  rotation: rotationAngle
                });
                break;
          }
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // Feste Dauer für Edge-Effekte
      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, 300);
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
      
      // Cleanup für Edge-Effekte - VIEL längere Dauer für bessere Sichtbarkeit
      const duration = beatDetected ? 800 : Math.max(600, Math.min(1200, Math.floor(energy * 400)));
      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, duration);
      cleanupTimeoutsRef.current.add(timeout);
    }
  }, [beatDetected, energy, effectiveChargeLevel, effectiveGlitchLevel, edgePositions]);
  
  // NEU: Zusätzliche Glitch-Effekte für bessere Visualisierung
  useEffect(() => {
    if (effectiveGlitchLevel > 0 && (beatDetected || energy > 0.005)) { // Noch empfindlicher
      // Blurred Chars (ab Level 1)
      if (effectiveGlitchLevel >= 1) {
        const blurredChars = generateBlurredChars(swordPositions, effectiveGlitchLevel);
        setBlurredChars(blurredChars);
        
        const blurTimeout = setTimeout(() => {
          setBlurredChars([]);
        }, 600); // Länger sichtbar
        cleanupTimeoutsRef.current.add(blurTimeout);
      }
      
      // Skewed Chars (ab Level 2)
      if (effectiveGlitchLevel >= 2) {
        const skewedChars = generateSkewedChars(swordPositions, effectiveGlitchLevel);
        setSkewedChars(skewedChars);
        
        const skewTimeout = setTimeout(() => {
          setSkewedChars([]);
        }, 800); // Länger sichtbar
        cleanupTimeoutsRef.current.add(skewTimeout);
      }
      
      // Faded Chars (ab Level 3)
      if (effectiveGlitchLevel >= 3) {
        const fadedChars = generateFadedChars(swordPositions, effectiveGlitchLevel);
        setFadedChars(fadedChars);
        
        const fadeTimeout = setTimeout(() => {
          setFadedChars([]);
        }, 1000); // Länger sichtbar
        cleanupTimeoutsRef.current.add(fadeTimeout);
      }
    }
  }, [beatDetected, energy, effectiveGlitchLevel, swordPositions]);
  
  // Frequenzdaten aus dem Store holen
  const frequencyData = useAudioReactionStore((s) => s.frequencyData);

  // In der useEffect für die Vein-Generierung:
  useEffect(() => {
    if (!frequencyData) return;
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    const now = Date.now();
    // Frequenzbereiche bestimmen
    const bassEnd = Math.floor(frequencyData.length * 0.2);
    const midEnd = Math.floor(frequencyData.length * 0.6);
    // Mittelwerte für Bass, Mid, High
    const bass = frequencyData.slice(0, bassEnd).reduce((a, b) => a + b, 0) / bassEnd;
    const mid = frequencyData.slice(bassEnd, midEnd).reduce((a, b) => a + b, 0) / (midEnd - bassEnd);
    const high = frequencyData.slice(midEnd).reduce((a, b) => a + b, 0) / (frequencyData.length - midEnd);
    // Cluster-Parameter
    const clusterBase = 8;
    const bassCluster = Math.floor(clusterBase + (bass / 255) * 18);
    const midCluster = Math.floor(clusterBase + (mid / 255) * 18);
    const highCluster = Math.floor(clusterBase + (high / 255) * 18);
    // Beat-Pulsieren
    const pulse = beatDetected ? 1.5 : 1.0;
    // Cluster-Positionen (unten, mitte, oben)
    const clusters = [
      { y: Math.floor(bgHeight * 0.8), count: bassCluster, color: '#3EE6FF' },
      { y: Math.floor(bgHeight * 0.5), count: midCluster, color: '#FFD600' },
      { y: Math.floor(bgHeight * 0.2), count: highCluster, color: '#FF3EC9' },
    ];
    // Generiere Veins für jede Cluster-Gruppe
    let veins: Array<{x: number, y: number, color: string}> = [];
    clusters.forEach((cluster, i) => {
      for (let c = 0; c < cluster.count; c++) {
        const spread = Math.floor(bgWidth * 0.3 + Math.sin(now/600 + i) * 10);
        const centerX = Math.floor(bgWidth / 2 + Math.sin(now/1000 + i*2) * (bgWidth/4));
        const angle = (c / cluster.count) * Math.PI * 2;
        const radius = (pulse * 8) + Math.sin(now/400 + c) * 4;
        const x = Math.floor(centerX + Math.cos(angle) * spread + Math.random() * 2);
        const y = Math.floor(cluster.y + Math.sin(angle) * radius + Math.random() * 2);
        veins.push({ x, y, color: cluster.color });
      }
    });
    setColoredVeins(veins);
  }, [frequencyData, beatDetected, getBackgroundDimensions]);
  
  // OPTIMIERT: Memoisierte Berechnungen für Rendering
  const shadowSize = useMemo(() => Math.floor(glowIntensity * 20), [glowIntensity]);
  const textShadow = useMemo(() => `0 0 ${shadowSize + (effectiveGlitchLevel * 2)}px ${baseColor}`, [shadowSize, effectiveGlitchLevel, baseColor]);
  const backgroundColor = useMemo(() => getDarkerColor(bgColor), [bgColor]);
  const lighterBgColor = useMemo(() => getLighterColor(bgColor), [bgColor]);

  const setSwordColor = useAudioReactionStore(state => state.setSwordColor);

  useEffect(() => {
    setSwordColor(baseColor);
  }, [baseColor, setSwordColor]);

  // OPTIMIERT: Verbessertes Cleanup-System für Memory-Leak-Prävention
  useEffect(() => {
    return () => {
      // Cleanup aller Timeouts
      cleanupTimeoutsRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      cleanupTimeoutsRef.current.clear();
      
      // Cleanup aller Intervals
      Object.values(intervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      
      // Cleanup Vein-Map
      veinsMapRef.current.clear();
      
      // Cleanup Tile-Timeout
      if (tileTimeoutRef.current) {
        clearTimeout(tileTimeoutRef.current);
        tileTimeoutRef.current = null;
      }
    };
  }, []);

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
          opacity: 0.45 + (effectiveGlitchLevel * 0.08),
          color: lighterBgColor,
          filter: `brightness(${0.35 + (effectiveGlitchLevel * 0.075)}) contrast(${0.65 + (effectiveGlitchLevel * 0.05)})`,
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
            centeredVeins={centeredEnergyVeins}
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