"use client";

/**
 * AsciiSwordModular - Modulare ASCII Art Schwert-Komponente
 * 
 * Diese Komponente rendert ein ASCII-Art-Schwert mit verschiedenen visuellen Effekten.
 * Die Funktionalität wurde in separate Module aufgeteilt für bessere Wartbarkeit.
 */
import { useState, useEffect, useRef } from 'react';
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

export default function AsciiSwordModular({ level = 1 }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Audio-Reaktionsdaten abrufen
  const { energy, beatDetected } = useAudioReactionStore();
  
  // Automatisches Beat-Reset aktivieren
  useBeatReset(100);
  
  // Fallback-Animation aktivieren, wenn keine Audio-Reaktivität vorhanden ist
  useFallbackAnimation();
  
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
    
    // Aufräumen beim Unmounten
    return () => {
      clearAllIntervals();
    };
  }, [glitchLevel]);
  
  // Audio-reaktive Glow-Effekte (ersetzt intervalsRef.current.glow)
  useEffect(() => {
    if (beatDetected) {
      // Bestehende Glow-Logik bei Beat-Erkennung auslösen
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
    }
  }, [beatDetected]);
  
  // Audio-reaktive Farb-Effekte (ersetzt intervalsRef.current.colorChange)
  useEffect(() => {
    // Bei hoher Energie oder Beat Farbwechsel auslösen
    if (energy > 0.6 || beatDetected) {
      const now = Date.now();
      const timeSinceLastChange = now - lastColorChangeTime;
      
      // Nur Farbwechsel erlauben, wenn die minimale Stabilitätszeit überschritten ist
      if (timeSinceLastChange >= colorStability) {
        // Erzeuge eine harmonische Farbkombination
        const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
        
        // Setze die neuen Farben
        setBaseColor(swordColor);
        setBgColor(newBgColor);
        
        // Aktualisiere den Zeitstempel für den letzten Farbwechsel
        setLastColorChangeTime(now);
        
        // Setze eine neue zufällige Stabilitätszeit
        setColorStability(Math.floor(Math.random() * 1200) + 300);
        
        // Logging
        const logWithTimestamp = (message: string, color: string) => {
          const timestamp = new Date().toISOString().substr(11, 8);
          console.log(`%c[${timestamp}] ${message}`, `color: ${color}; font-weight: bold;`);
        };
        
        logWithTimestamp(`[COLOR_CHANGE] New color: ${swordColor}, BG: ${newBgColor}, Stability: ${colorStability}ms`, '#00FCA6');
      }
    }
  }, [energy, beatDetected, lastColorChangeTime, colorStability]);
  
  // Audio-reaktive Tile-Farben (ersetzt intervalsRef.current.tileColors)
  useEffect(() => {
    if (beatDetected || energy > 0.5) {
      // Zufällige Tiles mit Akzentfarben einfärben
      const newColoredTiles: Array<{x: number, y: number, color: string}> = [];
      const swordPositions = getSwordPositions();
      
      // Anzahl der Cluster basierend auf glitchLevel
      const numClusters = Math.floor(Math.random() * 4) + 3 + (colorEffectIntensity[glitchLevel as keyof typeof colorEffectIntensity] || 2) + 2;
      
      for (let i = 0; i < numClusters; i++) {
        // Wähle eine zufällige Position und Clustergröße
        if (swordPositions.length === 0) continue;
        
        const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
        const basePos = swordPositions[randomPosIndex];
        
        // Clustergröße: 2-8 zusammenhängende Tiles
        const clusterSize = Math.floor(Math.random() * 7) + 2;
        
        // Generiere Cluster
        const cluster = generateCluster(
          basePos.x, 
          basePos.y, 
          clusterSize,
          20, // maxWidth
          centeredSwordLines.length // maxHeight
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
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // Audio-reaktive Glitch-Effekte (ersetzt intervalsRef.current.glitch)
  useEffect(() => {
    if (beatDetected || energy > 0.5) {
      // Generiere Glitch-Zeichen
      const swordPositions = getSwordPositions();
      const newGlitches: Array<{x: number, y: number, char: string}> = [];
      // Anzahl der Glitches basierend auf Energie
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
      
      // Glitches nach kurzer Zeit zurücksetzen
      setTimeout(() => {
        setGlitchChars([]);
      }, 80);
    }
  }, [beatDetected, energy]);
  
  // Audio-reaktive Edge-Effekte (ersetzt intervalsRef.current.edge)
  useEffect(() => {
    if (beatDetected || energy > 0.4) {
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
        }
      });
      
      // Setze die neuen Edge-Effekte
      setEdgeEffects(newEdgeEffects);
      
      // Zurücksetzen nach kurzer Zeit
      setTimeout(() => {
        setEdgeEffects([]);
      }, 100);
    }
  }, [beatDetected, energy, chargeLevel]);
  
  // Audio-reaktive Unicode-Glitch-Effekte (ersetzt intervalsRef.current.unicodeGlitch)
  useEffect(() => {
    if (beatDetected || energy > 0.7) {
      // Wahrscheinlichkeit für Unicode-Glitches basierend auf glitchLevel
      const glitchChance = 0.3 + (glitchLevel * 0.1); // 30%, 40%, 50%, 60%
      
      if (Math.random() < glitchChance) {
        // Anzahl der Glitches basierend auf glitchLevel
        const numGlitches = glitchLevel * 3 + glitchLevel; // 4, 8, 12
        
        // Generiere Unicode-Glitches
        const swordPositions = getSwordPositions();
        const newUnicodeGlitches = generateUnicodeGlitches(
          swordPositions,
          numGlitches
        );
        
        setUnicodeGlitches(newUnicodeGlitches);
        
        // Zurücksetzen nach kurzer Zeit
        setTimeout(() => {
          setUnicodeGlitches([]);
        }, 100 + (glitchLevel * 20)); // Längere Dauer bei höherem glitchLevel
      }
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // Audio-reaktive Hintergrund-Effekte (ersetzt intervalsRef.current.background)
  useEffect(() => {
    if (beatDetected) {
      // Größe für den Hintergrund bestimmen
      const bgWidth = 120;
      const bgHeight = 80;
      
      // Generiere den Höhlenhintergrund
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    }
  }, [beatDetected]);
  
  // Audio-reaktive Adern-Effekte (ersetzt intervalsRef.current.veins)
  useEffect(() => {
    if (beatDetected || energy > 0.6) {
      // Größe für den Hintergrund bestimmen
      const bgWidth = 120;
      const bgHeight = 80;
      
      // Generiere farbige Äderchen basierend auf glitchLevel
      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    }
  }, [beatDetected, energy, glitchLevel]);
  
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