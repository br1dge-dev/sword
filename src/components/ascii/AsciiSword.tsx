"use client";

/**
 * AsciiSword - ASCII Art Sword Component
 * 
 * This component renders an ASCII art sword with various visual effects.
 * 
 * @param {Object} props - Component properties
 * @param {number} props.level - The level of the sword (affects appearance)
 * @returns {JSX.Element} The rendered ASCII sword
 */
import { useState, useEffect, useRef } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

interface AsciiSwordProps {
  level?: number;
}

// ASCII art für verschiedene Schwert-Level
const swordLevels = {
  1: `
      /\\
      /█\\
      |█|
      |█|
      |█|
      |█|
      |█|
      |█|
    __▓█▓__
   /███████\\
      |█|
      |█|
      |█|
      V
`,
  2: `
     /\\
    /██\\
    |██|
    |██|
    |██|
    |██|
    |██|
    |██|
    |██|
   _▓██▓_
  /████████\\
    |██|
    |██|
    |██|
    VV
`,
  3: `
      /\\
     /█\\
    /███\\
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
   _▓███▓_
  /███████\\
     |█|
     |█|
     |█|
     |█|
    /_V_\\
`
};

// Dünne Linien-Zeichen für verschiedene Level
const edgeChars = {
  1: ['/', '\\', '|', 'V', '_'],
  2: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_'],
  3: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_', '╱', '╲', '┃', '┏', '┓', '┗', '┛']
};

// Glitch-Varianten für dünne Linien
const edgeGlitchChars = {
  1: ['/', '\\', '|', 'V', '_', '╱', '╲', '│'],
  2: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰'],
  3: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰', '⌜', '⌝', '⌞', '⌟', '◢', '◣', '◤', '◥']
};

// Vibrations-Intensität für verschiedene Level
const vibrationIntensity = {
  1: 0.2,  // Leichte Vibration
  2: 0.5,  // Mittlere Vibration
  3: 0.8   // Starke Vibration
};

// Glitch-Intensität für verschiedene Level
const glitchIntensity = {
  0: 0,    // Kein Glitch
  1: 0.3,  // Leichte Glitches
  2: 0.6,  // Mittlere Glitches
  3: 1.0   // Starke Glitches
};

// Glitch-Häufigkeit für verschiedene Level
const glitchFrequency = {
  0: 0,    // Kein Glitch
  1: 0.1,  // 10% Chance für Glitch
  2: 0.25, // 25% Chance für Glitch
  3: 0.4   // 40% Chance für Glitch
};

// Farbeffekt-Häufigkeit für verschiedene Level
const colorEffectFrequency = {
  0: 0.05,  // Minimale Farbeffekte
  1: 0.15,  // 15% Chance für Farbeffekte
  2: 0.25,  // 25% Chance für Farbeffekte
  3: 0.4    // 40% Chance für Farbeffekte
};

// Farbeffekt-Intensität (Anzahl der farbigen Tiles)
const colorEffectIntensity = {
  0: 1,     // Minimale Farbeffekte
  1: 3,     // 3 Cluster
  2: 5,     // 5 Cluster
  3: 8      // 8 Cluster
};

// Höhlen/Fels Hintergrund-Muster
const caveBgPatterns = [
  '░░▒▒░░▒▓▓▒░░▒▒░░',
  '▒░░▒▒▓▒▒░░▓▒▒▒░',
  '░▒▒░▒▒▓▒░▒▒░▒▓░',
  '▒▒▓▒░▒░░▒▓▓▒░▒▒',
  '░▒▓▓▒░░▒▒░░▓▒░░',
  '▒░░▒▓▒▒░▒▓▒░░▒▒',
  '░▒▒░░▓▓▒░░▒▒▓▒░',
  '▒▓▒░▒▒░░▒▓▒░░▒▒',
  '░░▒▓▓▒░░▒▒▓▓▒░░',
  '▒▒░░▒▓▒▒░░▒▓▒▒░',
  '░▓▒▒░░▒▓▓▒░░▒▓░',
  '▒░▒▓▒░░▒▒▓▓▒░▒▒',
  '░░▒▓▓▒░░▒▒▓▓▒░░',
  '▒░░▒▓▓▒░░▒▓▓▒░▒',
  '░▒▒░░▒▓▒▒░░▒▒░░',
];

// Unorthodoxe Farbpalette
const baseColors = [
  '#00FCA6', // Cyber-Grün (Basis)
  '#FF3EC8', // Neon-Pink
  '#3EE6FF', // Elektrisches Blau
  '#F8E16C', // Acid-Gelb
  '#9D00FF', // Lila
  '#FF5722', // Brennendes Orange
  '#00FF66', // Radioaktives Grün
  '#FF00A0', // Hot Pink
  '#7DF9FF', // Elektrisches Cyan
  '#CCFF00'  // Giftig Grün-Gelb
];

// Noch ungewöhnlichere Akzentfarben
const accentColors = [
  '#FC2F9E', // Magenta-Pink
  '#09FBD3', // Türkis
  '#FE53BB', // Hot Pink
  '#F5D300', // Leuchtendes Gelb
  '#7122FA', // Elektrisches Lila
  '#08F7FE', // Cyan
  '#00FFFF', // Aqua
  '#FF2281', // Neon-Rosa
  '#FF8B8B', // Koralle
  '#93FFD8', // Mintgrün
  '#CEFF00', // Limette
  '#A6A6FF', // Lavendel
  '#FF9E7A', // Pfirsich
  '#08F7FE', // Elektrisches Blau
  '#09FBD3', // Türkis
  '#FE53BB', // Magenta
  '#F5D300'  // Gelb
];

// Glitch-Symbole für DOS-Style Glitches
const glitchSymbols = ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼'];

// Unicode-Glitch-Symbole für verschiedene Level
const unicodeGlitchChars = {
  1: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►'],
  2: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥'],
  3: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']
};

// Hintergrund-Äderchen-Intensität für verschiedene Level
const veinIntensity = {
  0: 1,    // Normal
  1: 1.5,  // Etwas mehr
  2: 2.5,  // Deutlich mehr
  3: 4     // Viele Äderchen
};

// Hilfsfunktion: ASCII-Art zentrieren mit verbesserter Konsistenz
function centerAsciiArt(art: string): string[] {
  const lines = art.trim().split('\n');
  
  // Finde die maximale Breite aller Zeilen
  const maxWidth = Math.max(...lines.map(line => line.length));
  
  // Finde die tatsächliche Breite des Schwerts (ohne Leerzeichen am Ende)
  const actualWidths = lines.map(line => {
    // Entferne Leerzeichen am Ende
    const trimmedLine = line.trimEnd();
    // Zähle führende Leerzeichen
    const leadingSpaces = line.length - line.trimStart().length;
    return {
      content: trimmedLine,
      leadingSpaces,
      contentWidth: trimmedLine.length
    };
  });
  
  // Berechne die Mitte des Schwerts basierend auf den Zeilen mit tatsächlichem Inhalt
  const contentLines = actualWidths.filter(l => l.contentWidth > 0);
  
  // Finde die Mitte des Schwerts (basierend auf der breitesten Zeile)
  const widestLine = contentLines.reduce((max, line) => 
    line.contentWidth > max.contentWidth ? line : max, 
    { contentWidth: 0, leadingSpaces: 0, content: '' }
  );
  
  const swordCenter = widestLine.leadingSpaces + Math.floor(widestLine.contentWidth / 2);
  
  // Fixierte Breite für konsistente Darstellung
  const fixedWidth = Math.max(maxWidth, 20); 
  const targetCenter = Math.floor(fixedWidth / 2);
  
  // Zentriere jede Zeile basierend auf der berechneten Mitte
  return lines.map(line => {
    if (line.trim() === '') return ' '.repeat(fixedWidth);
    
    const trimmedLine = line.trimEnd();
    const leadingSpaces = line.length - line.trimStart().length;
    const lineContentWidth = trimmedLine.length - leadingSpaces;
    
    // Berechne die Mitte dieser Zeile
    const lineCenter = leadingSpaces + Math.floor(lineContentWidth / 2);
    
    // Berechne die benötigte Verschiebung, um die Mitte dieser Zeile mit der Schwertmitte auszurichten
    const shift = targetCenter - lineCenter;
    
    // Wende die Verschiebung an
    const centeredLine = ' '.repeat(Math.max(0, leadingSpaces + shift)) + line.trim();
    
    // Fülle auf die fixierte Breite auf
    const padding = fixedWidth - centeredLine.length;
    return centeredLine + ' '.repeat(Math.max(0, padding));
  });
}

// Hilfsfunktion: Generiert Cluster von zusammenhängenden Positionen
function generateCluster(x: number, y: number, size: number, maxWidth: number, maxHeight: number): Array<{x: number, y: number}> {
  const cluster: Array<{x: number, y: number}> = [{x, y}];
  
  // Füge benachbarte Positionen hinzu, bis die gewünschte Größe erreicht ist
  for (let i = 1; i < size; i++) {
    // Wähle eine zufällige Position aus dem bestehenden Cluster
    const basePos = cluster[Math.floor(Math.random() * cluster.length)];
    
    // Versuche eine benachbarte Position zu finden
    const directions = [
      {dx: 1, dy: 0},  // rechts
      {dx: -1, dy: 0}, // links
      {dx: 0, dy: 1},  // unten
      {dx: 0, dy: -1}  // oben
    ];
    
    // Mische die Richtungen für zufälligere Cluster
    directions.sort(() => Math.random() - 0.5);
    
    let added = false;
    for (const dir of directions) {
      const newX = basePos.x + dir.dx;
      const newY = basePos.y + dir.dy;
      
      // Prüfe, ob die neue Position gültig ist und nicht bereits im Cluster
      if (
        newX >= 0 && newX < maxWidth &&
        newY >= 0 && newY < maxHeight &&
        !cluster.some(pos => pos.x === newX && pos.y === newY)
      ) {
        cluster.push({x: newX, y: newY});
        added = true;
        break;
      }
    }
    
    // Wenn keine neue Position hinzugefügt werden konnte, breche ab
    if (!added) break;
  }
  
  return cluster;
}

// Hilfsfunktion: Generiert einen felsigen Höhlen-Hintergrund
function generateCaveBackground(width: number, height: number): string[][] {
  const background: string[][] = [];
  
  // Initialisiere den Hintergrund mit leeren Zeichen
  for (let y = 0; y < height; y++) {
    background[y] = [];
    for (let x = 0; x < width; x++) {
      // Verwende die Muster aus caveBgPatterns, aber mit zufälliger Variation
      const patternY = y % caveBgPatterns.length;
      const patternX = x % caveBgPatterns[patternY].length;
      
      // Füge etwas Zufälligkeit hinzu
      if (Math.random() < 0.7) {
        background[y][x] = caveBgPatterns[patternY][patternX];
      } else {
        // Zufälliges Felszeichen
        const rockChars = ['░', '▒', '▓', '╱', '╲', '╳', '╭', '╮', '╯', '╰'];
        background[y][x] = rockChars[Math.floor(Math.random() * rockChars.length)];
      }
    }
  }
  
  // Füge einige größere Felsformationen hinzu
  const numFormations = Math.floor((width * height) / 100) + 3;
  
  for (let i = 0; i < numFormations; i++) {
    const formationX = Math.floor(Math.random() * width);
    const formationY = Math.floor(Math.random() * height);
    const formationSize = Math.floor(Math.random() * 8) + 3; // 3-10 Zeichen große Formationen
    
    const formation = generateCluster(formationX, formationY, formationSize, width, height);
    
    formation.forEach(pos => {
      if (pos.y < height && pos.x < width) {
        // Dichter Fels für Formationen
        background[pos.y][pos.x] = '▓';
      }
    });
  }
  
  // Füge einige Stalaktiten/Stalagmiten hinzu
  const numStalactites = Math.floor(width / 5);
  
  for (let i = 0; i < numStalactites; i++) {
    const stalX = Math.floor(Math.random() * width);
    const isTop = Math.random() < 0.5;
    
    if (isTop) {
      // Stalaktit von oben
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        if (y < height) {
          background[y][stalX] = '▼';
        }
      }
    } else {
      // Stalagmit von unten
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        const posY = height - 1 - y;
        if (posY >= 0) {
          background[posY][stalX] = '▲';
        }
      }
    }
  }
  
  return background;
}

// Hilfsfunktion: Generiert farbige Äderchen im Gestein
function generateColoredVeins(width: number, height: number, numVeins: number): Array<{x: number, y: number, color: string}> {
  const veins: Array<{x: number, y: number, color: string}> = [];
  
  for (let i = 0; i < numVeins; i++) {
    // Wähle einen zufälligen Startpunkt
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    
    // Wähle eine zufällige Farbe aus accentColors
    const color = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Generiere eine Ader (kurze Linie in eine zufällige Richtung)
    const length = Math.floor(Math.random() * 4) + 2; // 2-5 Zeichen lang
    const direction = Math.floor(Math.random() * 8); // 8 mögliche Richtungen
    
    // Richtungsvektoren: horizontal, vertikal und diagonal
    const directions = [
      {dx: 1, dy: 0},   // rechts
      {dx: 1, dy: 1},   // rechts unten
      {dx: 0, dy: 1},   // unten
      {dx: -1, dy: 1},  // links unten
      {dx: -1, dy: 0},  // links
      {dx: -1, dy: -1}, // links oben
      {dx: 0, dy: -1},  // oben
      {dx: 1, dy: -1}   // rechts oben
    ];
    
    const {dx, dy} = directions[direction];
    
    // Zeichne die Ader
    for (let j = 0; j < length; j++) {
      const x = startX + (dx * j);
      const y = startY + (dy * j);
      
      // Prüfe, ob die Position innerhalb der Grenzen liegt
      if (x >= 0 && x < width && y >= 0 && y < height) {
        veins.push({x, y, color});
      }
    }
  }
  
  return veins;
}

// Hilfsfunktion: Berechnet die Komplementärfarbe zu einer gegebenen Farbe
function getComplementaryColor(hexColor: string): string {
  // Konvertiere Hex zu RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Berechne Komplementärfarbe (255 - Wert)
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  
  // Konvertiere zurück zu Hex
  return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

// Hilfsfunktion: Erzeugt eine dunklere Version einer Farbe
function getDarkerColor(hexColor: string, factor: number = 0.08): string {
  // Konvertiere Hex zu RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Erzeuge eine dunklere Version
  const darkR = Math.floor(r * factor);
  const darkG = Math.floor(g * factor);
  const darkB = Math.floor(b * factor);
  
  return `rgb(${darkR}, ${darkG}, ${darkB})`;
}

// Hilfsfunktion: Erzeugt eine hellere Version einer Farbe
function getLighterColor(hexColor: string, factor: number = 0.1): string {
  // Konvertiere Hex zu RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Erzeuge eine hellere Version (addiere einen Prozentsatz zum Originalwert)
  const lighterR = Math.min(255, Math.floor(r * (1 + factor)));
  const lighterG = Math.min(255, Math.floor(g * (1 + factor)));
  const lighterB = Math.min(255, Math.floor(b * (1 + factor)));
  
  return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
}

// Hilfsfunktion: Prüft, ob ein Zeichen eine dünne Linie ist
function isEdgeChar(char: string): boolean {
  return ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰'].includes(char);
}

// Hilfsfunktion: Prüft, ob eine Position zum Griff gehört
function isHandlePosition(x: number, y: number, centeredLines: string[]): boolean {
  // Identifiziere den Griff-Bereich basierend auf dem Muster
  const line = centeredLines[y];
  if (!line) return false;
  
  const char = line[x];
  if (!char) return false;
  
  // Suche nach dem Griff-Muster (die letzten 3-5 Zeilen des Schwertes)
  const totalLines = centeredLines.length;
  
  // Griff ist typischerweise in den letzten 30% des Schwertes
  const handleStartLine = Math.floor(totalLines * 0.7);
  
  // Wenn wir im Griff-Bereich sind
  if (y >= handleStartLine) {
    // Prüfe auf spezifische Griff-Zeichen (|█|, __▓█▓__, /███████\, etc.)
    if (char === '█' || char === '▓' || char === '_') {
      return true;
    }
  }
  
  return false;
}

// Hilfsfunktion: Berechnet eine zufällige Verschiebung basierend auf der Vibrations-Intensität
function getRandomOffset(intensity: number): {x: number, y: number} {
  // Maximale Verschiebung basierend auf Intensität (0-2 Pixel)
  const maxOffset = Math.floor(intensity * 2);
  
  // Zufällige Verschiebung in beide Richtungen
  return {
    x: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset,
    y: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset
  };
}

export default function AsciiSword({ level = 1 }: AsciiSwordProps) {
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState(baseColors[0]);
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor(baseColors[0]));
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
  const intervalsRef = useRef<{[key: string]: NodeJS.Timeout | null}>({
    glow: null,
    glitch: null,
    edge: null,
    unicodeGlitch: null,
    colorChange: null,
    background: null,
    veins: null
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
        clearInterval(intervalsRef.current[key]!);
        intervalsRef.current[key] = null;
      }
    });
  };
  
  // Finde alle nicht-leeren Positionen im Schwert (nur einmal berechnen)
  const getSwordPositions = () => {
    const positions: Array<{x: number, y: number}> = [];
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
  const getEdgePositions = () => {
    const positions: Array<{x: number, y: number, char: string}> = [];
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
    
    // Generiere den Höhlenhintergrund
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    
    // Generiere farbige Äderchen basierend auf glitchLevel
    const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
    const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
    setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    
    // Hintergrund ab und zu neu generieren
    intervalsRef.current.background = setInterval(() => {
      if (Math.random() > 0.9) { // 10% Chance
        setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
      }
    }, 5000);
    
    // Äderchen-Glitch-Effekt
    intervalsRef.current.veins = setInterval(() => {
      // Häufigkeit der Glitches basierend auf glitchLevel
      const glitchChance = 0.8 - (glitchLevel * 0.1); // 0.8, 0.7, 0.6, 0.5
      
      if (Math.random() > glitchChance) { // Chance für Glitch steigt mit glitchLevel
        // Generiere neue Äderchen für Glitch-Effekt
        setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
        
        // Nach kurzer Zeit zurücksetzen
        setTimeout(() => {
          setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
        }, 100);
      }
    }, 2000 - (glitchLevel * 300));
    
    // Aufräumen beim Unmounten
    return () => {
      if (intervalsRef.current.background) clearInterval(intervalsRef.current.background);
      if (intervalsRef.current.veins) clearInterval(intervalsRef.current.veins);
    };
  }, [glitchLevel]);
  
  // Haupteffekte (Glow, Farbe, Glitches)
  useEffect(() => {
    const swordPositions = getSwordPositions();
    
    // Aggressiver Puls-Effekt
    intervalsRef.current.glow = setInterval(() => {
      // Zufällige Intensität zwischen 0.3 und 1.0
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
    }, Math.floor(Math.random() * 100) + 100);
    
    // Farbwechsel-Effekt
    intervalsRef.current.colorChange = setInterval(() => {
      // Gelegentlich Basis-Farbe ändern (basierend auf glitchLevel)
      const colorChangeChance = 0.95 - (glitchLevel * 0.05); // 0.95, 0.9, 0.85, 0.8
      if (Math.random() > colorChangeChance) {
        const randomColorIndex = Math.floor(Math.random() * baseColors.length);
        const newBaseColor = baseColors[randomColorIndex];
        setBaseColor(newBaseColor);
        
        // Aktualisiere die Hintergrundfarbe als Komplementärfarbe
        setBgColor(getComplementaryColor(newBaseColor));
      }
      
      // Zufällige Tiles mit Akzentfarben einfärben
      const newColoredTiles: Array<{x: number, y: number, color: string}> = [];
      
      // Anzahl der Cluster basierend auf glitchLevel
      const numClusters = Math.floor(Math.random() * 2) + (colorEffectIntensity[glitchLevel as keyof typeof colorEffectIntensity] || 1);
      
      for (let i = 0; i < numClusters; i++) {
        // Wähle eine zufällige Position und Clustergröße
        if (swordPositions.length === 0) continue;
        
        const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
        const basePos = swordPositions[randomPosIndex];
        
        // Clustergröße: 1-5 zusammenhängende Tiles, größer bei höherem glitchLevel
        const clusterSize = Math.floor(Math.random() * (3 + glitchLevel)) + 1;
        
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
        cluster.forEach(pos => {
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
    }, Math.floor(Math.random() * 100) + 150);
    
    // DOS-Style Glitch-Effekte
    intervalsRef.current.glitch = setInterval(() => {
      if (Math.random() > 0.5) { // 50% Chance für Glitch
        const newGlitches: Array<{x: number, y: number, char: string}> = [];
        // 2-8 Glitches gleichzeitig
        const numGlitches = Math.floor(Math.random() * 7) + 2;
        
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
        }, 80); // Noch kürzere Dauer für aggressiveren Effekt
      }
    }, Math.floor(Math.random() * 200) + 200);
    
    // Aufräumen beim Unmounten oder wenn sich die Abhängigkeiten ändern
    return () => {
      if (intervalsRef.current.glow) clearInterval(intervalsRef.current.glow);
      if (intervalsRef.current.colorChange) clearInterval(intervalsRef.current.colorChange);
      if (intervalsRef.current.glitch) clearInterval(intervalsRef.current.glitch);
    };
  }, [centeredSwordLines, glitchLevel]);
  
  // Charge-Effekte für die dünnen Linien
  useEffect(() => {
    const edgePositions = getEdgePositions();
    
    // Vibrations- und Glitch-Effekte für dünne Linien
    intervalsRef.current.edge = setInterval(() => {
      // Wenn keine Kanten vorhanden sind, nichts tun
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
      
      // Aktuelle Level-Werte abrufen (basierend auf chargeLevel)
      const currentVibration = vibrationIntensity[chargeLevel as keyof typeof vibrationIntensity] || vibrationIntensity[1];
      const currentGlitchFreq = glitchFrequency[chargeLevel as keyof typeof glitchFrequency] || glitchFrequency[1];
      const currentColorFreq = colorEffectFrequency[chargeLevel as keyof typeof colorEffectFrequency] || colorEffectFrequency[1];
      const currentGlitchChars = edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars] || edgeGlitchChars[1];
      
      // Für jede dünne Linie Effekte anwenden
      edgePositions.forEach(pos => {
        const effect: {x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}} = {
          x: pos.x,
          y: pos.y
        };
        
        // 1. Vibration basierend auf chargeLevel
        if (Math.random() < currentVibration) {
          effect.offset = getRandomOffset(currentVibration);
        }
        
        // 2. Glitch-Effekt basierend auf chargeLevel
        if (Math.random() < currentGlitchFreq) {
          effect.char = currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)];
        }
        
        // 3. Farbeffekt basierend auf chargeLevel
        if (Math.random() < currentColorFreq) {
          effect.color = accentColors[Math.floor(Math.random() * accentColors.length)];
        }
        
        // Nur hinzufügen, wenn mindestens ein Effekt angewendet wurde
        if (effect.offset || effect.char || effect.color) {
          newEdgeEffects.push(effect);
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // Bei höheren Charge-Leveln schnellere Aktualisierung
      const updateSpeed = chargeLevel === 3 ? 50 : (chargeLevel === 2 ? 80 : 120);
      
      // Nach kurzer Zeit zurücksetzen für Flacker-Effekt
      if (chargeLevel > 1) {
        setTimeout(() => {
          // Bei Charge-Level 3 komplexere Flacker-Muster
          if (chargeLevel === 3 && Math.random() > 0.5) {
            // Neuer Satz von Effekten statt komplettem Reset
            const flickerEffects = newEdgeEffects.map(effect => {
              // 50% Chance, dass sich der Effekt ändert
              if (Math.random() > 0.5) {
                return {
                  ...effect,
                  char: Math.random() > 0.7 ? currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)] : effect.char,
                  color: Math.random() > 0.7 ? accentColors[Math.floor(Math.random() * accentColors.length)] : effect.color,
                  offset: Math.random() > 0.5 ? getRandomOffset(currentVibration) : effect.offset
                };
              }
              return effect;
            });
            setEdgeEffects(flickerEffects);
          } else {
            // Bei Charge-Level 1-2 einfacher Reset
            setEdgeEffects([]);
          }
        }, updateSpeed / 2);
      }
    }, chargeLevel === 3 ? 100 : (chargeLevel === 2 ? 150 : 200));
    
    // Aufräumen beim Unmounten oder wenn sich die Abhängigkeiten ändern
    return () => {
      if (intervalsRef.current.edge) clearInterval(intervalsRef.current.edge);
    };
  }, [centeredSwordLines, chargeLevel]);
  
  // Unicode-Glitch-Effekte basierend auf glitchLevel
  useEffect(() => {
    // Wenn glitchLevel 0 ist, keine Glitch-Effekte anwenden
    if (glitchLevel === 0) {
      setUnicodeGlitches([]);
      if (intervalsRef.current.unicodeGlitch) {
        clearInterval(intervalsRef.current.unicodeGlitch);
        intervalsRef.current.unicodeGlitch = null;
      }
      return;
    }
    
    const swordPositions = getSwordPositions();
    
    // Unicode-Glitch-Effekte
    intervalsRef.current.unicodeGlitch = setInterval(() => {
      // Aktuelle Glitch-Intensität und -Häufigkeit basierend auf glitchLevel
      const currentGlitchIntensity = glitchIntensity[glitchLevel as keyof typeof glitchIntensity] || 0;
      const currentGlitchFreq = glitchFrequency[glitchLevel as keyof typeof glitchFrequency] || 0;
      
      if (Math.random() < currentGlitchFreq) {
        const newGlitches: Array<{x: number, y: number, char: string}> = [];
        
        // Anzahl der Glitches basierend auf Level und Intensität
        const numGlitches = Math.floor(Math.random() * (glitchLevel * 3)) + glitchLevel * 2;
        
        // Verfügbare Glitch-Zeichen für dieses Level
        const availableGlitchChars = unicodeGlitchChars[glitchLevel as keyof typeof unicodeGlitchChars] || [];
        
        for (let i = 0; i < numGlitches; i++) {
          // Wähle eine zufällige Position aus den Schwert-Positionen
          if (swordPositions.length === 0) continue;
          
          const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
          const pos = swordPositions[randomPosIndex];
          
          newGlitches.push({
            x: pos.x,
            y: pos.y,
            char: availableGlitchChars[Math.floor(Math.random() * availableGlitchChars.length)]
          });
        }
        
        setUnicodeGlitches(newGlitches);
        
        // Glitches nach kurzer Zeit zurücksetzen (Dauer abhängig vom Level)
        setTimeout(() => {
          setUnicodeGlitches([]);
        }, 100 - (glitchLevel * 15));
      }
    }, 300 - (glitchLevel * 50));
    
    // Aufräumen beim Unmounten oder wenn sich die Abhängigkeiten ändern
    return () => {
      if (intervalsRef.current.unicodeGlitch) clearInterval(intervalsRef.current.unicodeGlitch);
    };
  }, [centeredSwordLines, glitchLevel]);
  
  // Füge einen useEffect hinzu, um Blur-Effekte clientseitig zu generieren
  useEffect(() => {
    if (glitchLevel > 0) {
      const newBlurredChars: Array<{x: number, y: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generiere zufällige verschwommene Zeichen basierend auf glitchLevel
      const numBlurred = Math.floor(swordPositions.length * (glitchLevel * 0.01));
      for (let i = 0; i < numBlurred; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        newBlurredChars.push(swordPositions[randomIndex]);
      }
      
      setBlurredChars(newBlurredChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newBlurredChars: Array<{x: number, y: number}> = [];
        for (let i = 0; i < numBlurred; i++) {
          if (swordPositions.length === 0) continue;
          const randomIndex = Math.floor(Math.random() * swordPositions.length);
          newBlurredChars.push(swordPositions[randomIndex]);
        }
        setBlurredChars(newBlurredChars);
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setBlurredChars([]);
    }
  }, [glitchLevel]);
  
  // Füge einen useEffect für die Skew-Effekte hinzu
  useEffect(() => {
    if (glitchLevel >= 2) {
      const newSkewedChars: Array<{x: number, y: number, angle: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generiere zufällige verzerrte Zeichen basierend auf glitchLevel
      const numSkewed = Math.floor(swordPositions.length * (glitchLevel * 0.005));
      for (let i = 0; i < numSkewed; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        const angle = (Math.random() * 10) - 5;
        newSkewedChars.push({...swordPositions[randomIndex], angle});
      }
      
      setSkewedChars(newSkewedChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newSkewedChars: Array<{x: number, y: number, angle: number}> = [];
        for (let i = 0; i < numSkewed; i++) {
          if (swordPositions.length === 0) continue;
          const randomIndex = Math.floor(Math.random() * swordPositions.length);
          const angle = (Math.random() * 10) - 5;
          newSkewedChars.push({...swordPositions[randomIndex], angle});
        }
        setSkewedChars(newSkewedChars);
      }, 300);
      
      return () => clearInterval(interval);
    } else {
      setSkewedChars([]);
    }
  }, [glitchLevel]);
  
  // Füge einen useEffect für die Opacity-Effekte hinzu
  useEffect(() => {
    if (glitchLevel >= 3) {
      const newFadedChars: Array<{x: number, y: number, opacity: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generiere zufällige verblasste Zeichen basierend auf glitchLevel
      const numFaded = Math.floor(swordPositions.length * (glitchLevel * 0.003));
      for (let i = 0; i < numFaded; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        const opacity = 0.7 + (Math.random() * 0.3);
        newFadedChars.push({...swordPositions[randomIndex], opacity});
      }
      
      setFadedChars(newFadedChars);
      
      // Aktualisiere regelmäßig
      const interval = setInterval(() => {
        const newFadedChars: Array<{x: number, y: number, opacity: number}> = [];
        for (let i = 0; i < numFaded; i++) {
          if (swordPositions.length === 0) continue;
          const randomIndex = Math.floor(Math.random() * swordPositions.length);
          const opacity = 0.7 + (Math.random() * 0.3);
          newFadedChars.push({...swordPositions[randomIndex], opacity});
        }
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
        transition: glitchLevel >= 2 ? 'background-color 0.3s ease' : 'background-color 1s ease',
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
          opacity: 0.35 + (glitchLevel * 0.08), // Helligkeit stärker erhöhen mit glitchLevel
          color: lighterBgColor,
          filter: `brightness(${0.5 + (glitchLevel * 0.15)}) contrast(${1.1 + (glitchLevel * 0.1)})`,
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
            transform: 'scale(1.5)', // Stärker vergrößert, um sicherzustellen, dass es den gesamten Viewport abdeckt
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        >
          <pre className="font-mono text-xs sm:text-sm leading-[1.0] whitespace-pre select-none">
            {caveBackground.map((row, y) => (
              <div key={y} style={{ lineHeight: '1.0' }}>
                {row.map((char, x) => {
                  // Prüfe, ob an dieser Position eine farbige Ader ist
                  const vein = coloredVeins.find(v => v.x === x && v.y === y);
                  
                  // Stil für dieses Zeichen
                  const style = vein ? {
                    color: vein.color,
                    textShadow: `0 0 ${3 + glitchLevel}px ${vein.color}`,
                    display: 'inline-block',
                    filter: `contrast(${1.1 + (glitchLevel * 0.1)})`
                  } : { 
                    display: 'inline-block'
                  };
                  
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
          lineHeight: '1.2'
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
              
              // Anwenden von Positions-Effekten für Kanten
              if (isEdge && edgeEffect?.offset) {
                style.transform = `translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`;
                
                // Bei höheren Charge-Leveln zusätzliche Effekte
                if (chargeLevel >= 2) {
                  style.transition = 'transform 0.05s ease';
                }
                if (chargeLevel >= 3) {
                  style.filter = Math.random() > 0.7 ? 'brightness(1.5)' : '';
                }
              }
              
              // Zeichen bestimmen (Priorität: UnicodeGlitch > Glitch > EdgeEffect > Original)
              const displayChar = unicodeGlitch ? unicodeGlitch.char :
                                 (glitch ? glitch.char : 
                                 (edgeEffect?.char ? edgeEffect.char : char));
              
              return (
                <span key={`${x}-${y}`} style={style}>
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