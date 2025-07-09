"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
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
  
  // Performance-Optimierung: Throttle Updates für bessere FPS
  const [throttledEnergy, setThrottledEnergy] = useState(energy);
  const [throttledBeat, setThrottledBeat] = useState(beatDetected);
  
  // Throttle Energy-Updates (max 30fps)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setThrottledEnergy(energy);
    }, 33); // ~30fps
    
    return () => clearTimeout(timeout);
  }, [energy]);
  
  // Throttle Beat-Updates (max 60fps)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setThrottledBeat(beatDetected);
    }, 16); // ~60fps
    
    return () => clearTimeout(timeout);
  }, [beatDetected]);
  
  // Automatisches Beat-Reset aktivieren
  useBeatReset(100);
  
  // Fallback-Animation aktivieren, wenn keine Audio-Reaktivität vorhanden ist
  useFallbackAnimation();
  
  // Funktion zur Berechnung der optimalen Hintergrundgröße basierend auf Viewport
  const getBackgroundDimensions = () => {
    // Verwende window.innerWidth/innerHeight, falls verfügbar (Client-Side), sonst Standard-Werte
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    // Berechne Dimensionen basierend auf Viewport-Größe
    // Für größere Bildschirme mehr Zeichen
    const baseWidth = 160;
    const baseHeight = 100;
    
    // Verbesserte Skalierung für verschiedene Bildschirmgrößen
    // Für große Bildschirme (>1440px) verwenden wir eine aggressivere Skalierung
    let widthFactor, heightFactor;
    
    if (viewportWidth > 1440) {
      // Für sehr große Bildschirme: Skaliere stärker, aber mit einer Obergrenze
      widthFactor = Math.min(1.5, Math.max(1, viewportWidth / 960));
      heightFactor = Math.min(1.5, Math.max(1, viewportHeight / 720));
    } else {
      // Für mittlere und kleine Bildschirme: Sanftere Skalierung
      widthFactor = Math.min(1.25, Math.max(1, viewportWidth / 1024));
      heightFactor = Math.min(1.25, Math.max(1, viewportHeight / 768));
    }
    
    return {
      width: Math.floor(baseWidth * widthFactor),
      height: Math.floor(baseHeight * heightFactor)
    };
  };
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor('#00FCA6'));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(2000); // Minimale Zeit für Farbstabilität
  const [coloredTiles, setColoredTiles] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [glitchChars, setGlitchChars] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [edgeEffects, setEdgeEffects] = useState<Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>>([]);
  const [unicodeGlitches, setUnicodeGlitches] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [blurredChars, setBlurredChars] = useState<Array<{x: number, y: number}>>([]);
  const [skewedChars, setSkewedChars] = useState<Array<{x: number, y: number, angle: number}>>([]);
  const [fadedChars, setFadedChars] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  
  // --- STATE für animierbare Arrays wiederherstellen ---
  const [caveBackground, setCaveBackground] = useState<string[][]>([]);
  const [coloredVeins, setColoredVeins] = useState<Array<{x: number, y: number, color: string}>>([]);
  
  // Refs für Intervalle, um Speicherlecks zu vermeiden
  const intervalsRef = useRef<IntervalRefs>({
    glow: null,
    glitch: null,
    edge: null,
    unicodeGlitch: null,
    colorChange: null,
    background: null,
    veins: null,
    tileColors: null // Neuer Timer speziell für Tile-Umfärbungen
  });
  
  // Aktives Level (aus PowerUp-Store oder Props)
  const activeLevel = currentLevel || level;
  
  // Schwert-ASCII-Art basierend auf Level
  const swordArt = swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1];
  const centeredSwordLines = centerAsciiArt(swordArt);
  
  // Hilfsfunktion zum Aufräumen aller Intervalle
  const clearAllIntervals = () => {
    Object.keys(intervalsRef.current).forEach(key => {
      if (intervalsRef.current[key]) {
        clearInterval(intervalsRef.current[key] as NodeJS.Timeout);
        intervalsRef.current[key] = null;
      }
    });
  };
  
  // Funktion zum Bereinigen des Hintergrund-Caches
  const clearBackgroundCache = () => {
    // setCaveBackground([]); // Entfernt
    // setColoredVeins([]); // Entfernt
    console.log('[MEMORY] Background cache cleared');
  };
  
  // Ref für alle aktiven Timeouts
  const activeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  // Hilfsfunktion zum sicheren Hinzufügen von Timeouts
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      activeTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    activeTimeoutsRef.current.add(timeout);
    return timeout;
  }, []);
  
  // Hilfsfunktion zum Aufräumen aller Timeouts
  const clearAllTimeouts = useCallback(() => {
    activeTimeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    activeTimeoutsRef.current.clear();
  }, []);
  
  // Memoisierte Schwert-Positionen (teure Berechnung)
  const swordPositions = useMemo((): Array<SwordPosition> => {
    const positions: Array<SwordPosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (char !== ' ') {
          positions.push({x, y});
        }
      });
    });
    return positions;
  }, [centeredSwordLines]);
  
  // Memoisierte Kanten-Positionen (teure Berechnung)
  const edgePositions = useMemo((): Array<EdgePosition> => {
    const positions: Array<EdgePosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines)) {
          positions.push({x, y, char});
        }
      });
    });
    return positions;
  }, [centeredSwordLines]);
  
  // Callback-Funktionen für bessere Performance
  const getSwordPositions = useCallback((): Array<SwordPosition> => {
    return swordPositions;
  }, [swordPositions]);
  
  const getEdgePositions = useCallback((): Array<EdgePosition> => {
    return edgePositions;
  }, [edgePositions]);
  
  // --- Initialisierung auf Client ---
  useEffect(() => {
    if (!isClient) return;
    const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
    const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
    setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    // Logging
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [BACKGROUND] Initial background generated`);
    console.log(`[${timestamp}] [VEINS] Initial veins generated`);
    return () => {
      clearAllIntervals();
      clearAllTimeouts();
      clearBackgroundCache();
    };
  }, [glitchLevel, isClient]);
  
  // --- Hintergrund und Veins bei Resize aktualisieren ---
  useEffect(() => {
    if (!isClient) return;
    const handleResize = () => {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
      console.log(`[RESIZE] Background updated to ${bgWidth}x${bgHeight}`);
    };
    let resizeTimeout: NodeJS.Timeout | null = null;
    const debouncedResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 500);
    };
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [glitchLevel, isClient]);
  
  // Audio-reaktive Glow-Effekte
  useEffect(() => {
    if (throttledBeat || throttledEnergy > 0.2) { // Reduzierter Schwellenwert von 0.5 auf 0.2
      // Bestehende Glow-Logik bei Beat-Erkennung auslösen
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
      console.log(`[GLOW] Glow-Effekt ausgelöst mit Intensität ${randomIntensity.toFixed(2)}, Energy: ${throttledEnergy.toFixed(2)}, Beat: ${throttledBeat}`);
    }
  }, [throttledBeat, throttledEnergy]);
  
  // Audio-reaktive Farb-Effekte
  useEffect(() => {
    // Bei Beat oder hoher Energie Farbwechsel auslösen
    // Erhöhte Reaktivität für Schwert und äußeren Ring
    if ((throttledEnergy > 0.30 || throttledBeat) && Date.now() - lastColorChangeTime > colorStability) {
      // Erzeuge eine harmonische Farbkombination
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      // Setze die neuen Farben
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      
      // Aktualisiere den Zeitstempel für den letzten Farbwechsel
      setLastColorChangeTime(Date.now());
      
      // Dynamische Farbstabilität basierend auf Energielevel
      // Bei hoher Energie schnellere Farbwechsel erlauben
      const newStability = throttledEnergy > 0.7 
        ? Math.max(300, Math.floor(1000 - (throttledEnergy * 800))) // Minimum 300ms bei hoher Energie
        : Math.floor(1000 + Math.random() * 1500); // 1-2.5 Sekunden bei normaler Energie
      
      setColorStability(newStability);
      
      console.log(`[${new Date().toLocaleTimeString()}] [COLOR_CHANGE] New color: ${swordColor}, BG: ${newBgColor}, Energy: ${throttledEnergy.toFixed(2)}, Beat: ${throttledBeat}, Stability: ${newStability}ms`);
    }
  }, [throttledBeat, throttledEnergy, lastColorChangeTime, colorStability]);
  
  // Animation-Frequenz-Schutz: Verhindert rekursive Beschleunigung
  const lastAnimationTimestampRef = useRef<{[key: string]: number}>({
    colorChange: 0,
    tileEffect: 0,
    edgeEffect: 0,
    unicodeGlitch: 0,
    backgroundUpdate: 0,
    veinUpdate: 0
  });
  
  // Hilfsfunktion zum Überprüfen der Animation-Frequenz
  const checkAnimationFrequency = (type: string, minInterval: number): boolean => {
    const now = Date.now();
    const lastTimestamp = lastAnimationTimestampRef.current[type] || 0;
    
    // Wenn die letzte Animation zu kurz her ist, Animation überspringen
    if (now - lastTimestamp < minInterval) {
      return false;
    }
    
    // Aktualisiere den Timestamp
    lastAnimationTimestampRef.current[type] = now;
    return true;
  };
  
  // Audio-reaktive Tile-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Prüfe Animation-Frequenz (mindestens 100ms zwischen Animationen)
    if (!checkAnimationFrequency('tileEffect', 100)) return;
    
    // Deutlich höherer Schwellenwert für niedrige Energie, damit bei Ruhe kaum Effekte auftreten
    if (throttledBeat || throttledEnergy > 0.25) {
      // Temporär erhöhte Farbeffekte - stärkere Reaktion auf Beats
      const tempIntensity = { ...colorEffectIntensity };
      for (const level in tempIntensity) {
        if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
          const numLevel = Number(level) as keyof typeof colorEffectIntensity;
          // Stärkere Intensitätssteigerung bei Beats, sonst progressive Skalierung mit Energie
          tempIntensity[numLevel] = Math.min(3, tempIntensity[numLevel] + Math.floor(throttledEnergy * (throttledBeat ? 3 : 2)));
        }
      }
      
      setColoredTiles(generateColoredTiles(getSwordPositions(), glitchLevel, tempIntensity));
      
      // Längere Dauer für flüssigeren Übergang
      const timeout = setTimeout(() => {
        setColoredTiles(generateColoredTiles(getSwordPositions(), glitchLevel, colorEffectIntensity));
      }, throttledBeat ? 1000 : 800); // Längere Dauer bei Beat-Erkennung
      
      return () => clearTimeout(timeout);
    } else if (throttledEnergy <= 0.15) {
      // Bei sehr niedriger Energie: Setze auf minimale Effekte oder leere das Array
      setColoredTiles([]);
    }
  }, [throttledBeat, throttledEnergy, glitchLevel, colorEffectIntensity]);
  
  // Audio-reaktive Edge-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Prüfe Animation-Frequenz (mindestens 120ms zwischen Animationen)
    if (!checkAnimationFrequency('edgeEffect', 120)) return;
    
    // Höherer Schwellenwert für niedrige Energie
    if (throttledBeat || throttledEnergy > 0.25) {
      // Wenn keine Kanten vorhanden sind, nichts tun
      const edgePositions = getEdgePositions();
      if (edgePositions.length === 0) return;
      
      // Neue Edge-Effekte basierend auf chargeLevel
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
      
      // Intensität basierend auf chargeLevel
      const vibrationChance = vibrationIntensity[chargeLevel as keyof typeof vibrationIntensity] || 0.2;
      const glitchChance = glitchFrequency[chargeLevel as keyof typeof glitchFrequency] || 0.1;
      const colorChance = colorEffectFrequency[chargeLevel as keyof typeof colorEffectFrequency] || 0.15;
      
      // Multiplier für Level 2 (erhöht die Chance um 50%)
      const glitchMultiplier = chargeLevel === 2 ? 1.5 : 1;
      
      // Progressive Skalierung basierend auf der Energie
      // Bei niedriger Energie kaum Effekte, bei hoher Energie deutlich mehr
      const energyMultiplier = throttledEnergy < 0.3 ? 
        throttledEnergy * 1.5 : // Niedrige Energie: lineare Skalierung
        1 + (throttledEnergy * 2.0); // Hohe Energie: stärkere Skalierung
        
      const effectiveVibrationChance = Math.min(0.95, vibrationChance * energyMultiplier);
      const effectiveGlitchChance = Math.min(0.95, glitchChance * glitchMultiplier * energyMultiplier);
      const effectiveColorChance = Math.min(0.95, colorChance * energyMultiplier);
      
      // Begrenze die Anzahl der Effekte bei niedriger Energie
      const maxEffects = throttledEnergy < 0.3 ? 
        Math.max(1, Math.floor(edgePositions.length * 0.05)) : // Max 5% bei niedriger Energie
        Math.floor(edgePositions.length * 0.4); // Max 40% bei hoher Energie
      
      // Durchlaufe alle Kantenpositionen
      edgePositions.forEach((pos: EdgePosition) => {
        // Wenn wir bereits die maximale Anzahl an Effekten haben, abbrechen
        if (newEdgeEffects.length >= maxEffects) return;
        
        // Vibrations-Effekt (Verschiebung)
        if (Math.random() < effectiveVibrationChance) {
          const offsetX = Math.random() < 0.5 ? -1 : 1;
          const offsetY = Math.random() < 0.5 ? -1 : 1;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
        }
        
        // Glitch-Effekt (Zeichenersetzung)
        if (Math.random() < effectiveGlitchChance && newEdgeEffects.length < maxEffects) {
          // Korrekte Typbehandlung für edgeGlitchChars
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
        }
        
        // Farb-Effekt
        if (Math.random() < effectiveColorChance && newEdgeEffects.length < maxEffects) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
        }
      });
      
      // Setze die neuen Edge-Effekte
      setEdgeEffects(newEdgeEffects);
      
      // Längere Dauer bei höherer Energie für flüssigeren Effekt
      const duration = throttledBeat ? 150 : Math.max(100, Math.min(200, Math.floor(throttledEnergy * 200)));
      
      // Zurücksetzen nach berechneter Zeit mit Cleanup
      const timeout = setTimeout(() => {
        setEdgeEffects([]);
      }, duration);
      
      return () => clearTimeout(timeout);
    } else if (throttledEnergy <= 0.15) {
      // Bei sehr niedriger Energie: Setze auf leeres Array
      setEdgeEffects([]);
    }
  }, [throttledBeat, throttledEnergy, chargeLevel, vibrationIntensity, glitchFrequency, colorEffectFrequency, accentColors, edgeGlitchChars]);
  
  // Audio-reaktive Unicode-Glitch-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Prüfe Animation-Frequenz (mindestens 150ms zwischen Animationen)
    if (!checkAnimationFrequency('unicodeGlitch', 150)) return;
    
    // Höherer Schwellenwert für niedrige Energie
    if (throttledBeat || throttledEnergy > 0.30) {
      // Erhöhe temporär den Glitch-Level basierend auf Energie
      // Bei niedriger Energie kaum Erhöhung, bei hoher Energie deutliche Erhöhung
      const energyFactor = Math.min(2, throttledEnergy * 2.5);
      const tempGlitchLevel = Math.min(3, Math.floor(glitchLevel + energyFactor));
      
      setUnicodeGlitches(generateUnicodeGlitches(getSwordPositions(), tempGlitchLevel));
      
      // Längere Dauer bei höherer Energie für flüssigeren Effekt
      const duration = throttledBeat ? 200 : Math.max(160, Math.min(300, Math.floor(throttledEnergy * 250)));
      
      // Zurücksetzen nach berechneter Zeit
      const timeout = setTimeout(() => {
        setUnicodeGlitches([]);
      }, duration);
      
      return () => clearTimeout(timeout);
    } else if (throttledEnergy <= 0.15) {
      // Bei sehr niedriger Energie: Setze auf leeres Array
      setUnicodeGlitches([]);
    }
  }, [throttledBeat, throttledEnergy, glitchLevel]);
  
  // --- Hintergrund-Musterwechsel bei Beat/Energie (REDUZIERTE HÄUFIGKEIT) ---
  useEffect(() => {
    if (!isClient) return;
    
    // Prüfe Animation-Frequenz (mindestens 2000ms zwischen Animationen)
    if (!checkAnimationFrequency('backgroundUpdate', 2000)) return;
    
    // Reduzierte Häufigkeit: Nur bei Beat (5% Chance) oder sehr hoher Energie (>0.85)
    if ((throttledBeat && Math.random() < 0.05) || throttledEnergy > 0.85) {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
      setLastColorChangeTime(Date.now() + 10000);
      console.log(`[${new Date().toLocaleTimeString()}] [BACKGROUND] Background updated, Energy: ${throttledEnergy.toFixed(2)}, Beat: ${throttledBeat}`);
    }
  }, [throttledBeat, throttledEnergy, isClient]);
  
  // --- Veins bei Beat/Energie (ERHÖHTE ABHÄNGIGKEIT VON MUSIKINTENSITÄT) ---
  useEffect(() => {
    if (!isClient) return;
    
    // Prüfe Animation-Frequenz (mindestens 1000ms zwischen Animationen)
    if (!checkAnimationFrequency('veinUpdate', 1000)) return;
    
    if ((throttledBeat && Math.random() < 0.3) || throttledEnergy > 0.45) {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      // Erhöhte Abhängigkeit von Musikintensität: Basis + Energie-basierte Skalierung
      const baseVeins = 15; // Erhöhte Basis-Anzahl
      const energyMultiplier = 1 + (throttledEnergy * 3); // 1x bis 4x bei hoher Energie
      const beatMultiplier = throttledBeat ? 1.5 : 1; // 50% mehr bei Beat
      const glitchMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      
      const numVeins = Math.floor(baseVeins * energyMultiplier * beatMultiplier * glitchMultiplier);
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
      console.log(`[${new Date().toLocaleTimeString()}] [VEINS] Veins updated: ${numVeins}, Energy: ${throttledEnergy.toFixed(2)}, Beat: ${throttledBeat}, EnergyMultiplier: ${energyMultiplier.toFixed(2)}`);
    }
  }, [throttledBeat, throttledEnergy, glitchLevel, isClient]);
  
  // Memoisierte Berechnungen für bessere Performance
  const shadowSize = useMemo(() => Math.floor(glowIntensity * 20), [glowIntensity]);
  const textShadow = useMemo(() => `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`, [shadowSize, glitchLevel, baseColor]);
  
  // Hintergrundfarben memoisieren
  const backgroundColor = useMemo(() => getDarkerColor(bgColor), [bgColor]);
  const lighterBgColor = useMemo(() => getLighterColor(bgColor), [bgColor]);

  // Hintergrund-Dimensionen berechnen
  const { width: bgWidth, height: bgHeight } = useMemo(() => isClient ? getBackgroundDimensions() : { width: 0, height: 0 }, [isClient]);

  // Optimierte Maps für schnelle Lookups (O(1) statt O(n))
  const veinMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, color: string}>();
    coloredVeins.forEach(vein => {
      map.set(`${vein.x},${vein.y}`, vein);
    });
    return map;
  }, [coloredVeins]);
  
  const skewMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, angle: number}>();
    skewedChars.forEach(skew => {
      map.set(`${skew.x},${skew.y}`, skew);
    });
    return map;
  }, [skewedChars]);
  
  const fadeMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, opacity: number}>();
    fadedChars.forEach(fade => {
      map.set(`${fade.x},${fade.y}`, fade);
    });
    return map;
  }, [fadedChars]);
  
  // Maps für Schwert-Effekte
  const glitchMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, char: string}>();
    glitchChars.forEach(glitch => {
      map.set(`${glitch.x},${glitch.y}`, glitch);
    });
    return map;
  }, [glitchChars]);
  
  const unicodeGlitchMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, char: string}>();
    unicodeGlitches.forEach(glitch => {
      map.set(`${glitch.x},${glitch.y}`, glitch);
    });
    return map;
  }, [unicodeGlitches]);
  
  const coloredTileMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, color: string}>();
    coloredTiles.forEach(tile => {
      map.set(`${tile.x},${tile.y}`, tile);
    });
    return map;
  }, [coloredTiles]);
  
  const edgeEffectMap = useMemo(() => {
    const map = new Map<string, {x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>();
    edgeEffects.forEach(effect => {
      map.set(`${effect.x},${effect.y}`, effect);
    });
    return map;
  }, [edgeEffects]);
  
  const blurredCharSet = useMemo(() => {
    return new Set(blurredChars.map(c => `${c.x},${c.y}`));
  }, [blurredChars]);

  if (!isClient) {
    // Optional: Lade- oder Platzhalteranzeige
    return <div style={{width: '100vw', height: '100vh', background: '#111'}} />;
  }

  return (
    <div 
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ 
        backgroundColor,
        transition: 'background-color 0.05s ease', // Extrem schnelle Übergänge für alle Level
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
          opacity: 0.45 + (glitchLevel * 0.08), // Höhere Opacity für bessere Sichtbarkeit
          color: lighterBgColor,
          filter: `brightness(${0.35 + (glitchLevel * 0.075)}) contrast(${0.65 + (glitchLevel * 0.05)})`, // 50% reduzierte Helligkeit und Kontrast
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
            transform: 'scale(1.5)', // Erhöhte Skalierung von 1.3 auf 1.5 für bessere Abdeckung
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden' // Hinzugefügt, um sicherzustellen, dass Inhalte nicht über den Container hinausragen
          }}
        >
          <pre className="font-mono text-sm sm:text-base leading-[0.9] whitespace-pre select-none" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {caveBackground.map((row, y) => (
              <div key={y} style={{ lineHeight: '0.9', width: '100%', textAlign: 'center' }}>
                {row.map((char, x) => {
                  // Optimierte Lookups mit Maps (O(1) statt O(n))
                  const key = `${x},${y}`;
                  const vein = veinMap.get(key);
                  const skewEffect = skewMap.get(key);
                  const fadeEffect = fadeMap.get(key);
                  
                  // Stil für dieses Zeichen
                  const style: React.CSSProperties = vein ? {
                    color: vein.color,
                    textShadow: `0 0 ${2 + glitchLevel}px ${vein.color}`, // Reduzierter Schatten für mehr Schärfe
                    display: 'inline-block',
                    filter: `contrast(${0.65 + (glitchLevel * 0.05)})`, // 50% reduzierter Kontrast
                    transform: ''
                  } : { 
                    display: 'inline-block',
                    transform: ''
                  };
                  
                  // Prüfe, ob dieses Zeichen verzerrt werden soll
                  if (skewEffect) {
                    style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
                  }
                  
                  // Prüfe, ob dieses Zeichen verblasst werden soll
                  if (fadeEffect) {
                    style.opacity = String(fadeEffect.opacity);
                  }
                  
                  // Zufällige Glitch-Effekte für den Hintergrund bei höheren Glitch-Leveln
                  if (glitchLevel >= 2 && Math.random() < 0.001 * glitchLevel) {
                    // Zufällige Farbe für Glitch-Effekt
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
          transition: 'color 0.1s ease' // Extrem schneller Farbübergang für das Schwert
        }}
      >
        {centeredSwordLines.map((line, y) => (
          <div key={y} style={{ 
            display: 'block',
            width: '100%'
          }}>
            {Array.from(line).map((char, x) => {
              // Optimierte Lookups mit Maps (O(1) statt O(n))
              const key = `${x},${y}`;
              const glitch = glitchMap.get(key);
              const unicodeGlitch = unicodeGlitchMap.get(key);
              const coloredTile = coloredTileMap.get(key);
              const edgeEffect = edgeEffectMap.get(key);
              const isBlurred = blurredCharSet.has(key);
              
              // Prüfe, ob dieses Zeichen eine dünne Linie ist und nicht im Griff-Bereich
              const isEdge = isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines);
              
              // Stil für dieses Zeichen mit allen benötigten Eigenschaften
              let style: React.CSSProperties = { 
                display: 'inline-block',
                transform: '',
                filter: '',
                opacity: undefined,
                color: undefined,
                textShadow: undefined
              };
              
              // Anwenden von Farb-Effekten (Priorität: Edge > ColoredTile)
              if (edgeEffect?.color) {
                style.color = edgeEffect.color;
                style.textShadow = `0 0 ${shadowSize}px ${edgeEffect.color}`;
              } else if (coloredTile) {
                style.color = coloredTile.color;
                style.textShadow = `0 0 ${shadowSize}px ${coloredTile.color}`;
              }
              
              // Anwenden von Positions-Effekten (nur für Kanten)
              if (edgeEffect?.offset) {
                style.transform = `translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`;
              }
              
              // Prüfe, ob dieses Zeichen in der Liste der verschwommenen Zeichen ist
              if (isBlurred) {
                style.filter = `${style.filter || ''} blur(1px)`.trim();
              }
              
              // Prüfe, ob dieses Zeichen verzerrt werden soll
              const skewEffect = skewedChars.find(c => c.x === x && c.y === y);
              if (skewEffect) {
                style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
              }
              
              // Prüfe, ob dieses Zeichen verblasst werden soll
              const fadeEffect = fadedChars.find(c => c.x === x && c.y === y);
              if (fadeEffect) {
                style.opacity = String(fadeEffect.opacity);
              }
              
              // Bestimme das anzuzeigende Zeichen (Priorität: Unicode > Glitch > Edge > Original)
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