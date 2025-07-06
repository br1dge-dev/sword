"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
 */
import { useState, useEffect, useRef } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

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

export default function AsciiSwordModular({ level = 1 }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor('#00FCA6'));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(2000); // Minimale Zeit für Farbstabilität
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
  
  // Hintergrund initialisieren
  useEffect(() => {
    // Größe für den Hintergrund bestimmen
    const bgWidth = 120;
    const bgHeight = 80;
    
    // Logging-Funktion mit Zeitstempel
    const logWithTimestamp = (message: string, color: string) => {
      const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
      console.log(`%c[${timestamp}] ${message}`, `color: ${color}; font-weight: bold;`);
    };
    
    // Generiere den Höhlenhintergrund
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    logWithTimestamp('[BACKGROUND] Initial background generated', '#00AA55');
    
    // Generiere farbige Äderchen basierend auf glitchLevel
    const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
    const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
    setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    logWithTimestamp('[VEINS] Initial veins generated', '#44AAFF');
    
    // 1. Komplette Hintergrundmuster-Neuberechnung alle 10 Sekunden (vorher 3 Sekunden)
    intervalsRef.current.background = setInterval(() => {
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
      logWithTimestamp('[BACKGROUND] Scheduled pattern update (10s interval)', '#00AA55');
    }, 10000);
    
    // 2. Wellenförmige Aktualisierung der Adern alle 4 Sekunden
    const veinsUpdateInterval = setInterval(() => {
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
      logWithTimestamp('[VEINS] Scheduled wave pattern update (4s interval)', '#44AAFF');
    }, 4000);
    
    // 3. Temporäre Glitch-Effekte mit anschließendem Musterwechsel alle 5 Sekunden
    const glitchPatternInterval = setInterval(() => {
      // Temporäre Glitch-Effekte mit garantiert anderen Mustern
      const tempBackground = generateCaveBackground(bgWidth, bgHeight);
      setCaveBackground(tempBackground);
      logWithTimestamp('[BACKGROUND] Temporary glitch pattern applied (5s interval)', '#FF3EC8');
      
      // Zurück zu einem neuen Muster nach kurzer Zeit
      setTimeout(() => {
        setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
        logWithTimestamp('[BACKGROUND] Post-glitch new pattern generated', '#FF3EC8');
      }, 120);
    }, 5000);
    
    // Zusätzliche Äderchen-Animation für fließende Bewegungen
    intervalsRef.current.veins = setInterval(() => {
      // Subtile Aktualisierungen der Adern für fließende Bewegung
      if (Math.random() > 0.4) {
        setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
        logWithTimestamp('[VEINS] Random subtle update (60% chance)', '#44AAFF');
      } else {
        logWithTimestamp('[VEINS] Random update skipped (40% chance)', '#44AAFF');
      }
    }, 1200 - (glitchLevel * 200)); // Schnellere Updates bei höheren Glitch-Levels
    
    // Aufräumen beim Unmounten
    return () => {
      if (intervalsRef.current.background) clearInterval(intervalsRef.current.background);
      if (intervalsRef.current.veins) clearInterval(intervalsRef.current.veins);
      clearInterval(veinsUpdateInterval);
      clearInterval(glitchPatternInterval);
      logWithTimestamp('[CLEANUP] All background intervals cleared', '#FFFFFF');
    };
  }, [glitchLevel]);
  
  // Haupteffekte (Glow, Farbe, Glitches)
  useEffect(() => {
    const swordPositions = getSwordPositions();
    
    // Logging-Funktion mit Zeitstempel
    const logWithTimestamp = (message: string, color: string) => {
      const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
      console.log(`%c[${timestamp}] ${message}`, `color: ${color}; font-weight: bold;`);
    };
    
    // Aggressiver Puls-Effekt
    intervalsRef.current.glow = setInterval(() => {
      // Zufällige Intensität zwischen 0.3 und 1.0
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
      logWithTimestamp(`[GLOW] Intensity updated to ${randomIntensity.toFixed(2)}`, '#FFFF00');
    }, Math.floor(Math.random() * 100) + 100);
    
    // Color change effect - MAXIMALE WAHRSCHEINLICHKEIT
    intervalsRef.current.colorChange = setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - lastColorChangeTime;
      
      // Nur Farbwechsel erlauben, wenn die minimale Stabilitätszeit überschritten ist
      if (timeSinceLastChange >= colorStability) {
        // Extrem hohe Wahrscheinlichkeit für Farbwechsel - noch weiter erhöht
        const colorChangeChance = 0.12 - (glitchLevel * 0.03); // 0.12, 0.09, 0.06, 0.03 - extrem hohe Chance
        if (Math.random() > colorChangeChance) {
          // Erzeuge eine harmonische Farbkombination
          const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
          
          // Setze die neuen Farben
          setBaseColor(swordColor);
          setBgColor(newBgColor);
          
          // Aktualisiere den Zeitstempel für den letzten Farbwechsel
          setLastColorChangeTime(now);
          
          // Setze eine neue zufällige Stabilitätszeit (0.3-1.5 Sekunden) - noch stärker verkürzt
          setColorStability(Math.floor(Math.random() * 1200) + 300);
          
          logWithTimestamp(`[COLOR_CHANGE] New color: ${swordColor}, BG: ${newBgColor}, Stability: ${colorStability}ms`, '#00FCA6');
        } else {
          logWithTimestamp(`[COLOR_CHANGE] Change skipped (${(colorChangeChance * 100).toFixed(0)}% chance)`, '#00FCA6');
        }
      } else {
        logWithTimestamp(`[COLOR_CHANGE] Waiting for stability (${timeSinceLastChange}/${colorStability}ms)`, '#00FCA6');
      }
    }, glitchLevel === 3 ? 3000 : (glitchLevel === 2 ? 5000 : 7000)); // Neue Intervalle basierend auf glitchLevel
    
    // SEPARATER TIMER FÜR TILE-UMFÄRBUNGEN
    intervalsRef.current.tileColors = setInterval(() => {
      // Zufällige Tiles mit Akzentfarben einfärben - STARK VERBESSERT
      const newColoredTiles: Array<{x: number, y: number, color: string}> = [];
      
      // Anzahl der Cluster basierend auf glitchLevel - DEUTLICH ERHÖHT
      const numClusters = Math.floor(Math.random() * 4) + 3 + (colorEffectIntensity[glitchLevel as keyof typeof colorEffectIntensity] || 2) + 2; // +2 für mehr Cluster
      
      for (let i = 0; i < numClusters; i++) {
        // Wähle eine zufällige Position und Clustergröße
        if (swordPositions.length === 0) continue;
        
        const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
        const basePos = swordPositions[randomPosIndex];
        
        // Clustergröße: 2-8 zusammenhängende Tiles, größer bei höherem glitchLevel
        const clusterSize = Math.floor(Math.random() * 7) + 2; // Mindestens 2, maximal 8 Tiles
        
        // Generiere Cluster
        const cluster = generateCluster(
          basePos.x, 
          basePos.y, 
          clusterSize,
          20, // maxWidth
          centeredSwordLines.length // maxHeight - verwende die tatsächliche Höhe des Schwerts
        );
        
        // Wähle eine zufällige Akzentfarbe für dieses Cluster
        const accentColor = accentColors[Math.floor(Math.random() * accentColors.length)];
        
        // Füge alle Positionen im Cluster hinzu
        cluster.forEach((pos: {x: number, y: number}) => {
          // Prüfe, ob an dieser Position tatsächlich ein Schwert-Tile ist
          if (centeredSwordLines[pos.y] && 
              centeredSwordLines[pos.y][pos.x] && 
              centeredSwordLines[pos.y][pos.x] !== ' ') {
            newColoredTiles.push({
              x: pos.x,
              y: pos.y,
              color: accentColor
            });
          }
        });
      }
      
      setColoredTiles(newColoredTiles);
      
      // Debug-Log für Tile-Umfärbungen
      if (newColoredTiles.length > 0) {
        logWithTimestamp(`[TILES] Colored tiles: ${newColoredTiles.length} in ${numClusters} clusters`, '#FF3EC8');
      }
    }, 2000);
    
    // Glitch-Effekte für das Schwert
    intervalsRef.current.glitch = setInterval(() => {
      if (Math.random() > 0.5) { // 50% Chance für Glitch
        // Generiere Glitch-Zeichen - MEHR GLITCHES
        const newGlitches: Array<{x: number, y: number, char: string}> = [];
        // 2-10 Glitches gleichzeitig (erhöht)
        const numGlitches = Math.floor(Math.random() * 9) + 2;
        
        for (let i = 0; i < numGlitches; i++) {
          // Wähle eine zufällige Position aus den Schwert-Positionen
          if (swordPositions.length === 0) continue;
          
          const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
          const pos = swordPositions[randomPosIndex];
          
          newGlitches.push({
            x: pos.x,
            y: pos.y,
            char: glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)]
          });
        }
        
        setGlitchChars(newGlitches);
        logWithTimestamp(`[GLITCH] Applied ${numGlitches} glitch characters`, '#FF5500');
        
        // Glitches nach kurzer Zeit zurücksetzen
        setTimeout(() => {
          setGlitchChars([]);
          logWithTimestamp(`[GLITCH] Reset glitch characters after 80ms`, '#FF5500');
        }, 80); // Noch kürzere Dauer für aggressiveren Effekt
      } else {
        logWithTimestamp(`[GLITCH] Skipped (50% chance)`, '#FF5500');
      }
    }, Math.floor(Math.random() * 200) + 200); // Zufällige Intervalle für natürlicheren Effekt
    
    // Edge-Glitch-Effekte
    intervalsRef.current.edge = setInterval(() => {
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
      
      // Garantiere mindestens einen Effekt bei Level 2 oder höher
      let hasAppliedEffect = false;
      
      // Durchlaufe alle Kantenpositionen
      edgePositions.forEach(pos => {
        // Vibrations-Effekt (Verschiebung)
        if (Math.random() < vibrationChance) {
          const offsetX = Math.random() < 0.5 ? -1 : 1;
          const offsetY = Math.random() < 0.5 ? -1 : 1;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
          
          hasAppliedEffect = true;
        }
        
        // Glitch-Effekt (Zeichenersetzung)
        if (Math.random() < glitchChance * glitchMultiplier) {
          // Korrekte Typbehandlung für edgeGlitchChars
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
          
          hasAppliedEffect = true;
        }
        
        // Farb-Effekt
        if (Math.random() < colorChance) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
          
          hasAppliedEffect = true;
        }
      });
      
      // Bei Level 2: Garantiere mindestens einen Effekt, wenn keiner angewendet wurde
      if (chargeLevel >= 2 && !hasAppliedEffect && edgePositions.length > 0) {
        const randomPos = edgePositions[Math.floor(Math.random() * edgePositions.length)];
        const effectType = Math.random();
        
        if (effectType < 0.33) {
          // Vibrations-Effekt
          newEdgeEffects.push({
            x: randomPos.x,
            y: randomPos.y,
            offset: { x: Math.random() < 0.5 ? -1 : 1, y: Math.random() < 0.5 ? -1 : 1 }
          });
        } else if (effectType < 0.66) {
          // Glitch-Effekt
          // Korrekte Typbehandlung für edgeGlitchChars
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: randomPos.x,
            y: randomPos.y,
            char: glitchChar
          });
          
          hasAppliedEffect = true;
        } else {
          // Farb-Effekt
          newEdgeEffects.push({
            x: randomPos.x,
            y: randomPos.y,
            color: accentColors[Math.floor(Math.random() * accentColors.length)]
          });
        }
        
        logWithTimestamp(`[EDGE] Guaranteed effect applied at level ${chargeLevel}`, '#00CCFF');
      }
      
      // Setze die neuen Edge-Effekte
      setEdgeEffects(newEdgeEffects);
      
      // Logging für Edge-Effekte
      if (newEdgeEffects.length > 0) {
        const vibrationCount = newEdgeEffects.filter(e => e.offset).length;
        const glitchCount = newEdgeEffects.filter(e => e.char).length;
        const colorCount = newEdgeEffects.filter(e => e.color).length;
        
        logWithTimestamp(
          `[EDGE] Applied ${newEdgeEffects.length} effects (${vibrationCount} vibrations, ${glitchCount} glitches, ${colorCount} colors)`,
          '#00CCFF'
        );
      } else {
        logWithTimestamp(`[EDGE] No effects applied this cycle`, '#00CCFF');
      }
      
    }, chargeLevel === 1 ? 200 : chargeLevel === 2 ? 70 : 100); // Schnellere Updates für höhere Levels
    
    // Unicode-Glitch-Effekte
    intervalsRef.current.unicodeGlitch = setInterval(() => {
      // Wahrscheinlichkeit für Unicode-Glitches basierend auf glitchLevel
      const glitchChance = 0.3 + (glitchLevel * 0.1); // 30%, 40%, 50%, 60%
      
      if (Math.random() < glitchChance) {
        // Anzahl der Glitches basierend auf glitchLevel
        const numGlitches = glitchLevel * 3 + glitchLevel; // 4, 8, 12
        
        // Generiere Unicode-Glitches
        const newUnicodeGlitches = generateUnicodeGlitches(
          swordPositions,
          numGlitches
        );
        
        setUnicodeGlitches(newUnicodeGlitches);
        logWithTimestamp(`[UNICODE] Applied ${newUnicodeGlitches.length} unicode glitches`, '#FF00FF');
        
        // Zurücksetzen nach kurzer Zeit
        setTimeout(() => {
          setUnicodeGlitches([]);
          logWithTimestamp(`[UNICODE] Reset unicode glitches`, '#FF00FF');
        }, 100 + (glitchLevel * 20)); // Längere Dauer bei höherem glitchLevel
      } else {
        logWithTimestamp(`[UNICODE] Skipped (${Math.round((1-glitchChance)*100)}% chance)`, '#FF00FF');
      }
    }, 500 - (glitchLevel * 50)); // Schnellere Updates bei höherem glitchLevel
    
    // Aufräumen beim Unmounten oder bei Änderungen
    return () => {
      clearAllIntervals();
    };
  }, [glitchLevel, lastColorChangeTime, colorStability]);
  
  // Blur-Effekte
  useEffect(() => {
    if (glitchLevel >= 1) {
      const swordPositions = getSwordPositions();
      
      // Generiere verschwommene Zeichen
      const newBlurredChars = generateBlurredChars(swordPositions, glitchLevel);
      setBlurredChars(newBlurredChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newBlurredChars = generateBlurredChars(swordPositions, glitchLevel);
        setBlurredChars(newBlurredChars);
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setBlurredChars([]);
    }
  }, [glitchLevel]);
  
  // Skew-Effekte
  useEffect(() => {
    if (glitchLevel >= 2) {
      const swordPositions = getSwordPositions();
      
      // Generiere verzerrte Zeichen
      const newSkewedChars = generateSkewedChars(swordPositions, glitchLevel);
      setSkewedChars(newSkewedChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newSkewedChars = generateSkewedChars(swordPositions, glitchLevel);
        setSkewedChars(newSkewedChars);
      }, 300);
      
      return () => clearInterval(interval);
    } else {
      setSkewedChars([]);
    }
  }, [glitchLevel]);
  
  // Opacity-Effekte
  useEffect(() => {
    if (glitchLevel >= 3) {
      const swordPositions = getSwordPositions();
      
      // Generiere verblasste Zeichen
      const newFadedChars = generateFadedChars(swordPositions, glitchLevel);
      setFadedChars(newFadedChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newFadedChars = generateFadedChars(swordPositions, glitchLevel);
        setFadedChars(newFadedChars);
      }, 400);
      
      return () => clearInterval(interval);
    } else {
      setFadedChars([]);
    }
  }, [glitchLevel]);
  
  // Aufräumen aller Intervalle beim Unmounten
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);
  
  // Berechne Schatten basierend auf Glow-Intensität
  const shadowSize = Math.floor(glowIntensity * 20);
  const textShadow = `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`;
  
  // Hintergrundfarbe (dunklere Version der Komplementärfarbe)
  const backgroundColor = getDarkerColor(bgColor);
  // Hellere Version der Komplementärfarbe für den Höhlenhintergrund
  const lighterBgColor = getLighterColor(bgColor);
  
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
            transform: 'scale(1.3)', // Optimale Skalierung für Schärfe
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        >
          <pre className="font-mono text-sm sm:text-base leading-[0.9] whitespace-pre select-none">
                          {caveBackground.map((row, y) => (
              <div key={y} style={{ lineHeight: '0.9' }}>
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