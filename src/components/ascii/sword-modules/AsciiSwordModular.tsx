"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
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
  
  // Finde alle nicht-leeren Positionen im Schwert (nur einmal berechnen)
  const getSwordPositions = (): Array<SwordPosition> => {
    const positions: Array<SwordPosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (char !== ' ') {
          positions.push({x, y});
        }
      });
    });
    return positions;
  };
  
  // Finde alle dünnen Linien im Schwert (nur einmal berechnen)
  const getEdgePositions = (): Array<EdgePosition> => {
    const positions: Array<EdgePosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines)) {
          positions.push({x, y, char});
        }
      });
    });
    return positions;
  };
  
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
    if (beatDetected || energy > 0.2) { // Reduzierter Schwellenwert von 0.5 auf 0.2
      // Bestehende Glow-Logik bei Beat-Erkennung auslösen
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
      console.log(`[GLOW] Glow-Effekt ausgelöst mit Intensität ${randomIntensity.toFixed(2)}, Energy: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
    }
  }, [beatDetected, energy]);
  
  // Audio-reaktive Farb-Effekte
  useEffect(() => {
    // Bei Beat oder hoher Energie Farbwechsel auslösen
    // Erhöhte Reaktivität für Schwert und äußeren Ring
    if ((energy > 0.30 || beatDetected) && Date.now() - lastColorChangeTime > colorStability) {
      // Erzeuge eine harmonische Farbkombination
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      
      // Setze die neuen Farben
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      
      // Aktualisiere den Zeitstempel für den letzten Farbwechsel
      setLastColorChangeTime(Date.now());
      
      // Dynamische Farbstabilität basierend auf Energielevel
      // Bei hoher Energie schnellere Farbwechsel erlauben
      const newStability = energy > 0.7 
        ? Math.max(300, Math.floor(1000 - (energy * 800))) // Minimum 300ms bei hoher Energie
        : Math.floor(1000 + Math.random() * 1500); // 1-2.5 Sekunden bei normaler Energie
      
      setColorStability(newStability);
      
      console.log(`[${new Date().toLocaleTimeString()}] [COLOR_CHANGE] New color: ${swordColor}, BG: ${newBgColor}, Energy: ${energy.toFixed(2)}, Beat: ${beatDetected}, Stability: ${newStability}ms`);
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // Audio-reaktive Tile-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Niedrigerer Schwellenwert für bessere Reaktivität
    if (beatDetected || energy > 0.15) {
      // Temporär erhöhte Farbeffekte - stärkere Reaktion auf Beats
      const tempIntensity = { ...colorEffectIntensity };
      for (const level in tempIntensity) {
        if (Object.prototype.hasOwnProperty.call(tempIntensity, level)) {
          const numLevel = Number(level) as keyof typeof colorEffectIntensity;
          // Stärkere Intensitätssteigerung bei Beats
          tempIntensity[numLevel] = Math.min(3, tempIntensity[numLevel] + Math.floor(energy * (beatDetected ? 3 : 2)));
        }
      }
      
      setColoredTiles(generateColoredTiles(getSwordPositions(), glitchLevel, tempIntensity));
      
      // Längere Dauer für flüssigeren Übergang
      const timeout = setTimeout(() => {
        setColoredTiles(generateColoredTiles(getSwordPositions(), glitchLevel, colorEffectIntensity));
      }, beatDetected ? 1000 : 800); // Längere Dauer bei Beat-Erkennung
      
      return () => clearTimeout(timeout);
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // Audio-reaktive Edge-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Niedrigerer Schwellenwert für bessere Reaktivität
    if (beatDetected || energy > 0.15) {
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
      
      // Erhöhe die Chancen basierend auf der Energie - stärkere Reaktion
      const energyMultiplier = 1 + (energy * 2.0); // Erhöht von 1.5 auf 2.0
      const effectiveVibrationChance = Math.min(0.95, vibrationChance * energyMultiplier);
      const effectiveGlitchChance = Math.min(0.95, glitchChance * glitchMultiplier * energyMultiplier);
      const effectiveColorChance = Math.min(0.95, colorChance * energyMultiplier);
      
      // Durchlaufe alle Kantenpositionen
      edgePositions.forEach(pos => {
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
        if (Math.random() < effectiveGlitchChance) {
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
      
      // Setze die neuen Edge-Effekte
      setEdgeEffects(newEdgeEffects);
      
      // Längere Dauer bei höherer Energie für flüssigeren Effekt
      const duration = beatDetected ? 150 : Math.max(100, Math.min(200, Math.floor(energy * 200)));
      
      // Zurücksetzen nach berechneter Zeit
      setTimeout(() => {
        setEdgeEffects([]);
      }, duration);
    }
  }, [beatDetected, energy, chargeLevel]);
  
  // Audio-reaktive Unicode-Glitch-Effekte - Erhöhte Reaktivität für Schwert
  useEffect(() => {
    // Niedrigerer Schwellenwert für bessere Reaktivität
    if (beatDetected || energy > 0.20) {
      // Erhöhe temporär den Glitch-Level
      const tempGlitchLevel = Math.min(3, Math.floor(glitchLevel + (energy * 2)));
      setUnicodeGlitches(generateUnicodeGlitches(getSwordPositions(), tempGlitchLevel));
      
      // Längere Dauer bei höherer Energie für flüssigeren Effekt
      const duration = beatDetected ? 200 : Math.max(160, Math.min(300, Math.floor(energy * 250)));
      
      // Zurücksetzen nach berechneter Zeit
      const timeout = setTimeout(() => {
        setUnicodeGlitches([]);
      }, duration);
      
      return () => clearTimeout(timeout);
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // --- Hintergrund-Musterwechsel bei Beat/Energie ---
  useEffect(() => {
    if (!isClient) return;
    if ((beatDetected && Math.random() < 0.15) || energy > 0.75) {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
      setLastColorChangeTime(Date.now() + 10000);
      console.log(`[${new Date().toLocaleTimeString()}] [BACKGROUND] Background updated, Energy: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
    }
  }, [beatDetected, energy, isClient]);
  
  // --- Veins bei Beat/Energie ---
  useEffect(() => {
    if (!isClient) return;
    if ((beatDetected && Math.random() < 0.3) || energy > 0.45) {
      const { width: bgWidth, height: bgHeight } = getBackgroundDimensions();
      const numVeins = Math.floor(10 + energy * 20);
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
      console.log(`[${new Date().toLocaleTimeString()}] [VEINS] Veins updated: ${numVeins}, Energy: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
    }
  }, [beatDetected, energy, isClient]);
  
  // Berechne Schatten basierend auf Glow-Intensität
  const shadowSize = Math.floor(glowIntensity * 20);
  const textShadow = `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`;
  
  // Hintergrundfarbe (dunklere Version der Komplementärfarbe)
  const backgroundColor = getDarkerColor(bgColor);
  // Hellere Version der Komplementärfarbe für den Höhlenhintergrund
  const lighterBgColor = getLighterColor(bgColor);

  // Hintergrund-Dimensionen berechnen
  const { width: bgWidth, height: bgHeight } = useMemo(() => isClient ? getBackgroundDimensions() : { width: 0, height: 0 }, [glitchLevel, isClient]);

  // Memoisiere caveBackground und coloredVeins
  // const caveBackground = useMemo(() => isClient && bgWidth && bgHeight ? generateCaveBackground(bgWidth, bgHeight) : [], [bgWidth, bgHeight, glitchLevel, isClient]);
  // const coloredVeins = useMemo(() => {
  //   if (!isClient || !bgWidth || !bgHeight) return [];
  //   const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
  //   const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
  //   return generateColoredVeins(bgWidth, bgHeight, numVeins);
  // }, [bgWidth, bgHeight, glitchLevel, isClient]);

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
                  // Prüfe, ob an dieser Position eine farbige Ader ist
                  const vein = coloredVeins.find(v => v.x === x && v.y === y);
                  
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
                  const skewEffect = skewedChars.find(c => c.x === x && c.y === y);
                  if (skewEffect) {
                    style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
                  }
                  
                  // Prüfe, ob dieses Zeichen verblasst werden soll
                  const fadeEffect = fadedChars.find(c => c.x === x && c.y === y);
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
              // Finde Glitch-Effekt an dieser Position
              const glitch = glitchChars.find(g => g.x === x && g.y === y);
              
              // Finde Unicode-Glitch an dieser Position
              const unicodeGlitch = unicodeGlitches.find(g => g.x === x && g.y === y);
              
              // Finde farbiges Tile an dieser Position
              const coloredTile = coloredTiles.find(t => t.x === x && t.y === y);
              
              // Finde Edge-Effekt an dieser Position
              const edgeEffect = edgeEffects.find(e => e.x === x && e.y === y);
              
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
              const isBlurred = blurredChars.some(c => c.x === x && c.y === y);
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