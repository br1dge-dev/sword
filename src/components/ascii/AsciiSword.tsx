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

// ASCII art for different sword levels
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

// Thin line characters for different levels
const edgeChars = {
  1: ['/', '\\', '|', 'V', '_'],
  2: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_'],
  3: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_', '╱', '╲', '┃', '┏', '┓', '┗', '┛']
};

// Glitch variants for thin lines
const edgeGlitchChars = {
  1: ['/', '\\', '|', 'V', '_', '╱', '╲', '│'],
  2: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰'],
  3: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰', '⌜', '⌝', '⌞', '⌟', '◢', '◣', '◤', '◥']
};

// Vibration intensity for different levels
const vibrationIntensity = {
  1: 0.2,  // Light vibration
  2: 0.6,  // Medium vibration (increased from 0.5)
  3: 0.8   // Strong vibration
};

// Glitch intensity for different levels
const glitchIntensity = {
  0: 0,    // No glitch
  1: 0.3,  // Light glitches
  2: 0.6,  // Medium glitches
  3: 1.0   // Strong glitches
};

// Glitch frequency for different levels
const glitchFrequency = {
  0: 0,    // No glitch
  1: 0.1,  // 10% chance for glitch
  2: 0.25, // 25% chance for glitch
  3: 0.4   // 40% chance for glitch
};

// Color effect frequency for different levels
const colorEffectFrequency = {
  0: 0.05,  // Minimal color effects
  1: 0.15,  // 15% chance for color effects
  2: 0.25,  // 25% chance for color effects
  3: 0.4    // 40% chance for color effects
};

// Color effect intensity (number of colored tiles)
const colorEffectIntensity = {
  0: 2,     // Minimal color effects (increased from 1)
  1: 4,     // 4 clusters (increased from 3)
  2: 7,     // 7 clusters (increased from 5)
  3: 10     // 10 clusters (increased from 8)
};

// Cave/rock background patterns
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

// Unorthodox color palette
const baseColors = [
  '#00FCA6', // Cyber-Green (Base)
  '#FF3EC8', // Neon-Pink
  '#3EE6FF', // Electric Blue
  '#F8E16C', // Acid-Yellow
  '#9D00FF', // Purple
  '#FF5722', // Burning Orange
  '#00FF66', // Radioactive Green
  '#FF00A0', // Hot Pink
  '#7DF9FF', // Electric Cyan
  '#CCFF00', // Toxic Green-Yellow
  '#FF5F1F', // Neon-Orange
  '#19FFBF', // Turquoise
  '#B3FF00', // Lime
  '#FF00FF', // Magenta
  '#00FFCC'  // Mint
];

// Even more unusual accent colors
const accentColors = [
  '#FC2F9E', // Magenta-Pink
  '#09FBD3', // Turquoise
  '#FE53BB', // Hot Pink
  '#F5D300', // Bright Yellow
  '#7122FA', // Electric Purple
  '#08F7FE', // Cyan
  '#00FFFF', // Aqua
  '#FF2281', // Neon-Pink
  '#FF8B8B', // Coral
  '#93FFD8', // Mint Green
  '#CEFF00', // Lime
  '#A6A6FF', // Lavender
  '#FF9E7A', // Peach
  '#08F7FE', // Electric Blue
  '#09FBD3', // Turquoise
  '#FE53BB', // Magenta
  '#F5D300'  // Yellow
];

// Glitch symbols for DOS-style glitches
const glitchSymbols = ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼'];

// Unicode glitch symbols for different levels
const unicodeGlitchChars = {
  1: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►'],
  2: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥'],
  3: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']
};

// Background vein intensity for different levels
const veinIntensity = {
  0: 1,    // Normal
  1: 1.5,  // Slightly more
  2: 2.5,  // Significantly more
  3: 4     // Many veins
};

// Helper function: Center ASCII art with improved consistency
function centerAsciiArt(art: string): string[] {
  const lines = art.trim().split('\n');
  
  // Find the maximum width of all lines
  const maxWidth = Math.max(...lines.map(line => line.length));
  
  // Find the actual width of the sword (without trailing spaces)
  const actualWidths = lines.map(line => {
    // Remove trailing spaces
    const trimmedLine = line.trimEnd();
    // Count leading spaces
    const leadingSpaces = line.length - line.trimStart().length;
    return {
      content: trimmedLine,
      leadingSpaces,
      contentWidth: trimmedLine.length
    };
  });
  
  // Calculate the center of the sword based on lines with actual content
  const contentLines = actualWidths.filter(l => l.contentWidth > 0);
  
  // Find the center of the sword (based on the widest line)
  const widestLine = contentLines.reduce((max, line) => 
    line.contentWidth > max.contentWidth ? line : max, 
    { contentWidth: 0, leadingSpaces: 0, content: '' }
  );
  
  const swordCenter = widestLine.leadingSpaces + Math.floor(widestLine.contentWidth / 2);
  
  // Fixed width for consistent display
  const fixedWidth = Math.max(maxWidth, 20); 
  const targetCenter = Math.floor(fixedWidth / 2);
  
  // Center each line based on the calculated center
  return lines.map(line => {
    if (line.trim() === '') return ' '.repeat(fixedWidth);
    
    const trimmedLine = line.trimEnd();
    const leadingSpaces = line.length - line.trimStart().length;
    const lineContentWidth = trimmedLine.length - leadingSpaces;
    
    // Calculate the center of this line
    const lineCenter = leadingSpaces + Math.floor(lineContentWidth / 2);
    
    // Calculate the needed shift to align the center of this line with the sword center
    const shift = targetCenter - lineCenter;
    
    // Apply the shift
    const centeredLine = ' '.repeat(Math.max(0, leadingSpaces + shift)) + line.trim();
    
    // Fill to the fixed width
    const padding = fixedWidth - centeredLine.length;
    return centeredLine + ' '.repeat(Math.max(0, padding));
  });
}

// Helper function: Generates a cluster of connected positions
function generateCluster(x: number, y: number, size: number, maxWidth: number, maxHeight: number): Array<{x: number, y: number}> {
  const cluster: Array<{x: number, y: number}> = [{x, y}];
  
  // Add adjacent positions until the desired size is reached
  for (let i = 1; i < size; i++) {
    // Choose a random position from the existing cluster
    const basePos = cluster[Math.floor(Math.random() * cluster.length)];
    
    // Try to find an adjacent position
    const directions = [
      {dx: 1, dy: 0},  // right
      {dx: -1, dy: 0}, // left
      {dx: 0, dy: 1},  // down
      {dx: 0, dy: -1}  // up
    ];
    
    // Mix the directions for more random clusters
    directions.sort(() => Math.random() - 0.5);
    
    let added = false;
    for (const dir of directions) {
      const newX = basePos.x + dir.dx;
      const newY = basePos.y + dir.dy;
      
      // Check if the new position is valid and not already in the cluster
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
    
    // If no new position could be added, break
    if (!added) break;
  }
  
  return cluster;
}

// Helper function: Generates a rocky cave background
function generateCaveBackground(width: number, height: number): string[][] {
  const background: string[][] = [];
  
  // Initialize the background with empty characters
  for (let y = 0; y < height; y++) {
    background[y] = [];
    for (let x = 0; x < width; x++) {
      // Use patterns from caveBgPatterns, but with random variation
      const patternY = y % caveBgPatterns.length;
      const patternX = x % caveBgPatterns[patternY].length;
      
      // Add some randomness
      if (Math.random() < 0.7) {
        background[y][x] = caveBgPatterns[patternY][patternX];
      } else {
        // Random rock character
        const rockChars = ['░', '▒', '▓', '╱', '╲', '╳', '╭', '╮', '╯', '╰'];
        background[y][x] = rockChars[Math.floor(Math.random() * rockChars.length)];
      }
    }
  }
  
  // Add some larger rock formations
  const numFormations = Math.floor((width * height) / 100) + 3;
  
  for (let i = 0; i < numFormations; i++) {
    const formationX = Math.floor(Math.random() * width);
    const formationY = Math.floor(Math.random() * height);
    const formationSize = Math.floor(Math.random() * 8) + 3; // 3-10 character large formations
    
    const formation = generateCluster(formationX, formationY, formationSize, width, height);
    
    formation.forEach(pos => {
      if (pos.y < height && pos.x < width) {
        // Dense rock for formations
        background[pos.y][pos.x] = '▓';
      }
    });
  }
  
  // Add some stalactites/stalagmites
  const numStalactites = Math.floor(width / 5);
  
  for (let i = 0; i < numStalactites; i++) {
    const stalX = Math.floor(Math.random() * width);
    const isTop = Math.random() < 0.5;
    
    if (isTop) {
      // Stalactite from top
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        if (y < height) {
          background[y][stalX] = '▼';
        }
      }
    } else {
      // Stalagmite from bottom
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

// Helper function: Generates colored veins in the rock
function generateColoredVeins(width: number, height: number, numVeins: number): Array<{x: number, y: number, color: string}> {
  const veins: Array<{x: number, y: number, color: string}> = [];
  
  for (let i = 0; i < numVeins; i++) {
    // Choose a random starting point
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    
    // Choose a random accent color from accentColors
    const color = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Generate a vein (short line in a random direction)
    const length = Math.floor(Math.random() * 4) + 2; // 2-5 characters long
    const direction = Math.floor(Math.random() * 8); // 8 possible directions
    
    // Direction vectors: horizontal, vertical and diagonal
    const directions = [
      {dx: 1, dy: 0},   // right
      {dx: 1, dy: 1},   // right down
      {dx: 0, dy: 1},   // down
      {dx: -1, dy: 1},  // left down
      {dx: -1, dy: 0},  // left
      {dx: -1, dy: -1}, // left up
      {dx: 0, dy: -1},  // up
      {dx: 1, dy: -1}   // right up
    ];
    
    const {dx, dy} = directions[direction];
    
    // Draw the vein
    for (let j = 0; j < length; j++) {
      const x = startX + (dx * j);
      const y = startY + (dy * j);
      
      // Check if the position is within the bounds
      if (x >= 0 && x < width && y >= 0 && y < height) {
        veins.push({x, y, color});
      }
    }
  }
  
  return veins;
}

// Helper function: Calculates the complementary color to a given color
function getComplementaryColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate complementary color (255 - value)
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  
  // Convert back to hex
  return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

// Helper function: Creates a darker version of a color
function getDarkerColor(hexColor: string, factor: number = 0.08): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Create a darker version
  const darkR = Math.floor(r * factor);
  const darkG = Math.floor(g * factor);
  const darkB = Math.floor(b * factor);
  
  return `rgb(${darkR}, ${darkG}, ${darkB})`;
}

// Helper function: Creates a lighter version of a color
function getLighterColor(hexColor: string, factor: number = 0.1): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Create a lighter version (add a percentage to the original value)
  const lighterR = Math.min(255, Math.floor(r * (1 + factor)));
  const lighterG = Math.min(255, Math.floor(g * (1 + factor)));
  const lighterB = Math.min(255, Math.floor(b * (1 + factor)));
  
  return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
}

// Helper function: Checks if a character is a thin line
function isEdgeChar(char: string): boolean {
  return ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰'].includes(char);
}

// Helper function: Checks if a position belongs to the handle
function isHandlePosition(x: number, y: number, centeredLines: string[]): boolean {
  // Identify the handle area based on the pattern
  const line = centeredLines[y];
  if (!line) return false;
  
  const char = line[x];
  if (!char) return false;
  
  // Search for the handle pattern (last 3-5 lines of the sword)
  const totalLines = centeredLines.length;
  
  // Handle is typically in the last 30% of the sword
  const handleStartLine = Math.floor(totalLines * 0.7);
  
  // If we're in the handle area
  if (y >= handleStartLine) {
    // Check for specific handle characters (|█|, __▓█▓__, /███████\, etc.)
    if (char === '█' || char === '▓' || char === '_') {
      return true;
    }
  }
  
  return false;
}

// Helper function: Calculates a random offset based on vibration intensity
function getRandomOffset(intensity: number): {x: number, y: number} {
  // Maximum shift based on intensity (0-2 pixels)
  const maxOffset = Math.floor(intensity * 2);
  
  // Random shift in both directions
  return {
    x: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset,
    y: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset
  };
}

/**
 * Creates a harmonic color combination for sword and background
 * @returns {Object} An object with sword and background colors
 */
function generateHarmonicColorPair(): { swordColor: string, bgColor: string } {
  // Choose a random base color for the sword
  const swordColor = baseColors[Math.floor(Math.random() * baseColors.length)];
  
  // Generate a harmonic background color
  let bgColor;
  
  // Random selection of color harmony type
  const harmonyType = Math.floor(Math.random() * 4);
  
  switch (harmonyType) {
    case 0: // Complementary with variation
      {
        const compColor = getComplementaryColor(swordColor);
        // Add slight variation
        const variation = Math.floor(Math.random() * 30) - 15; // -15 to +15
        const r = parseInt(compColor.slice(1, 3), 16);
        const g = parseInt(compColor.slice(3, 5), 16);
        const b = parseInt(compColor.slice(5, 7), 16);
        
        // Apply variation with limits
        const newR = Math.min(255, Math.max(0, r + variation));
        const newG = Math.min(255, Math.max(0, g + variation));
        const newB = Math.min(255, Math.max(0, b + variation));
        
        // Back to hex
        bgColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
      break;
      
    case 1: // Darker version of complementary color
      {
        const compColor = getComplementaryColor(swordColor);
        bgColor = getDarkerColor(compColor, 0.2 + Math.random() * 0.3); // 20-50% darker
      }
      break;
      
    case 2: // Analogous color (slightly shifted on the color wheel)
      {
        // Convert hex to RGB
        const r = parseInt(swordColor.slice(1, 3), 16);
        const g = parseInt(swordColor.slice(3, 5), 16);
        const b = parseInt(swordColor.slice(5, 7), 16);
        
        // Convert RGB to HSL (simplified formula)
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        
        let h;
        if (max === min) {
          h = 0;
        } else if (max === r / 255) {
          h = 60 * (0 + (g / 255 - b / 255) / (max - min));
        } else if (max === g / 255) {
          h = 60 * (2 + (b / 255 - r / 255) / (max - min));
        } else {
          h = 60 * (4 + (r / 255 - g / 255) / (max - min));
        }
        
        if (h < 0) h += 360;
        
        // Shift the hue by 30-60 degrees
        const shift = 30 + Math.floor(Math.random() * 30);
        let newH = h + (Math.random() > 0.5 ? shift : -shift);
        if (newH < 0) newH += 360;
        if (newH >= 360) newH -= 360;
        
        // Simplified HSL to RGB conversion
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        const s = max === 0 ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        const newR = Math.round(hue2rgb(p, q, (newH / 360 + 1/3) % 1) * 255);
        const newG = Math.round(hue2rgb(p, q, (newH / 360) % 1) * 255);
        const newB = Math.round(hue2rgb(p, q, (newH / 360 - 1/3) % 1) * 255);
        
        bgColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
      break;
      
    case 3: // Random accent color that pairs well with the sword
    default:
      {
        // Filter accent colors that pair well with the sword color
        const swordColorHex = swordColor.slice(1); // Remove #
        const swordR = parseInt(swordColorHex.slice(0, 2), 16);
        const swordG = parseInt(swordColorHex.slice(2, 4), 16);
        const swordB = parseInt(swordColorHex.slice(4, 6), 16);
        
        // Choose colors with a certain contrast
        const compatibleColors = accentColors.filter(color => {
          const colorHex = color.slice(1); // Remove #
          const r = parseInt(colorHex.slice(0, 2), 16);
          const g = parseInt(colorHex.slice(2, 4), 16);
          const b = parseInt(colorHex.slice(4, 6), 16);
          
          // Calculate color difference (simplified)
          const diff = Math.abs(r - swordR) + Math.abs(g - swordG) + Math.abs(b - swordB);
          return diff > 150; // At least a certain difference
        });
        
        if (compatibleColors.length > 0) {
          bgColor = compatibleColors[Math.floor(Math.random() * compatibleColors.length)];
        } else {
          // Fallback to complementary color
          bgColor = getComplementaryColor(swordColor);
        }
      }
      break;
  }
  
  return { swordColor, bgColor };
}

export default function AsciiSword({ level = 1 }: AsciiSwordProps) {
  // Access the PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // States for visual effects
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState(baseColors[0]);
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor(baseColors[0]));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(2000); // Minimum time for color stability
  const [coloredTiles, setColoredTiles] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [glitchChars, setGlitchChars] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [caveBackground, setCaveBackground] = useState<string[][]>([]);
  const [coloredVeins, setColoredVeins] = useState<Array<{x: number, y: number, color: string}>>([]);
  const [edgeEffects, setEdgeEffects] = useState<Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>>([]);
  const [unicodeGlitches, setUnicodeGlitches] = useState<Array<{x: number, y: number, char: string}>>([]);
  const [blurredChars, setBlurredChars] = useState<Array<{x: number, y: number}>>([]);
  const [skewedChars, setSkewedChars] = useState<Array<{x: number, y: number, angle: number}>>([]);
  const [fadedChars, setFadedChars] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  
  // Refs for intervals to avoid memory leaks
  const intervalsRef = useRef<{[key: string]: NodeJS.Timeout | null}>({
    glow: null,
    glitch: null,
    edge: null,
    unicodeGlitch: null,
    colorChange: null,
    background: null,
    veins: null,
    tileColors: null // New timer specifically for tile colorization
  });
  
  // Active level (from PowerUp-Store or props)
  const activeLevel = currentLevel || level;
  
  // Sword ASCII art based on level
  const swordArt = swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1];
  const centeredSwordLines = centerAsciiArt(swordArt);
  
  // Helper function to clean up all intervals
  const clearAllIntervals = () => {
    Object.keys(intervalsRef.current).forEach(key => {
      if (intervalsRef.current[key]) {
        clearInterval(intervalsRef.current[key] as NodeJS.Timeout);
        intervalsRef.current[key] = null;
      }
    });
  };
  
  // Find all non-empty positions in the sword (only calculate once)
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
  
  // Find all thin lines in the sword (only calculate once)
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
  
  // Background initialization
  useEffect(() => {
    // Determine size for the background
    const bgWidth = 120;
    const bgHeight = 80;
    
    // Generate the cave background
    setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    
    // Generate colored veins based on glitchLevel
    const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
    const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
    setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    
    // Background regeneration - NOCH HÄUFIGERE UPDATES
    intervalsRef.current.background = setInterval(() => {
      if (Math.random() > 0.5) { // 50% chance instead of 40%
        setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
        
        // Debug log for background update
        console.log(`%c[BACKGROUND] Background updated`, 'color: #00AA55; font-weight: bold;');
      }
    }, 2000); // 2 seconds (reduziert from 3)
    
    // Veins glitch effect - HÄUFIGER
    intervalsRef.current.veins = setInterval(() => {
      // Frequency of glitches based on glitchLevel
      const glitchChance = 0.7 - (glitchLevel * 0.1); // 0.7, 0.6, 0.5, 0.4 (erhöht)
      
      if (Math.random() > glitchChance) { // Chance for glitch increases with glitchLevel
        // Generate new veins for glitch effect
        setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
        
        // Reset after a short time
        setTimeout(() => {
          setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
        }, 100);
      }
    }, 1500 - (glitchLevel * 300)); // Schneller (reduziert from 2000)
    
    // Clean up on unmount
    return () => {
      if (intervalsRef.current.background) clearInterval(intervalsRef.current.background);
      if (intervalsRef.current.veins) clearInterval(intervalsRef.current.veins);
    };
  }, [glitchLevel]);
  
  // Main effects (Glow, Color, Glitches)
  useEffect(() => {
    const swordPositions = getSwordPositions();
    
    // Aggressive pulse effect
    intervalsRef.current.glow = setInterval(() => {
      // Random intensity between 0.3 and 1.0
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
    }, Math.floor(Math.random() * 100) + 100);
    
    // Color change effect - MAXIMALE WAHRSCHEINLICHKEIT
    intervalsRef.current.colorChange = setInterval(() => {
      const now = Date.now();
      const timeSinceLastChange = now - lastColorChangeTime;
      
      // Allow color change only if the minimum stability time has passed
      if (timeSinceLastChange >= colorStability) {
        // Extrem hohe Wahrscheinlichkeit für Farbwechsel
        const colorChangeChance = 0.15 - (glitchLevel * 0.03); // 0.15, 0.12, 0.09, 0.06 - extrem hohe Chance
        if (Math.random() > colorChangeChance) {
          // Erzeuge eine harmonische Farbkombination
          const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
          
          // Setze die neuen Farben
          setBaseColor(swordColor);
          setBgColor(newBgColor);
          
          // Aktualisiere den Zeitstempel für den letzten Farbwechsel
          setLastColorChangeTime(now);
          
          // Setze eine neue zufällige Stabilitätszeit (0.5-2 Sekunden) - stark verkürzt
          setColorStability(Math.floor(Math.random() * 1500) + 500);
          
          // Console log for debugging
          console.log(`%c[COLOR_CHANGE] New color: ${swordColor}, BG: ${newBgColor}, Stability: ${colorStability}ms`, 'color: #00FCA6; font-weight: bold;');
        }
      }
    }, Math.floor(Math.random() * 80) + 80); // 80-160ms für extrem häufige Updates
    
    // SEPARATE TIMER FOR TILE COLORIZATION
    intervalsRef.current.tileColors = setInterval(() => {
      // Random tiles with accent colors - GREATLY IMPROVED
      const newColoredTiles: Array<{x: number, y: number, color: string}> = [];
      
      // Number of clusters based on glitchLevel - SIGNIFICANTLY INCREASED
      const numClusters = Math.floor(Math.random() * 4) + 3 + (colorEffectIntensity[glitchLevel as keyof typeof colorEffectIntensity] || 2);
      
      for (let i = 0; i < numClusters; i++) {
        // Choose a random position and cluster size
        if (swordPositions.length === 0) continue;
        
        const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
        const basePos = swordPositions[randomPosIndex];
        
        // Cluster size: 2-6 connected tiles, larger at higher glitchLevel
        const clusterSize = Math.floor(Math.random() * 5) + 2; // At least 2, maximum 6 tiles
        
        // Generate cluster
        const cluster = generateCluster(
          basePos.x, 
          basePos.y, 
          clusterSize,
          20, // maxWidth
          centeredSwordLines.length // maxHeight
        );
        
        // Choose a random accent color for this cluster
        const accentColor = accentColors[Math.floor(Math.random() * accentColors.length)];
        
        // Add all positions in the cluster
        cluster.forEach(pos => {
          // Check if there's actually a sword tile at this position
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
      
      // Debug log for tile colorization
      if (newColoredTiles.length > 0) {
        console.log(`%c[TILES] Colored tiles: ${newColoredTiles.length} in ${numClusters} clusters`, 'color: #FF3EC8; font-weight: bold;');
      }
    }, Math.floor(Math.random() * 60) + 80); // 80-140ms for extremely frequent updates
    
    // DOS-Style glitch effect
    intervalsRef.current.glitch = setInterval(() => {
      if (Math.random() > 0.5) { // 50% Chance für Glitch
        const newGlitches: Array<{x: number, y: number, char: string}> = [];
        // 2-8 Glitches simultaneously
        const numGlitches = Math.floor(Math.random() * 7) + 2;
        
        for (let i = 0; i < numGlitches; i++) {
          // Choose a random position from the sword positions
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
        
        // Reset after a short time
        setTimeout(() => {
          setGlitchChars([]);
        }, 80); // Noch kürzere Dauer für aggressiveren Effekt
      }
    }, Math.floor(Math.random() * 200) + 200);
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (intervalsRef.current.glow) clearInterval(intervalsRef.current.glow);
      if (intervalsRef.current.colorChange) clearInterval(intervalsRef.current.colorChange);
      if (intervalsRef.current.tileColors) clearInterval(intervalsRef.current.tileColors);
      if (intervalsRef.current.glitch) clearInterval(intervalsRef.current.glitch);
    };
  }, [centeredSwordLines, glitchLevel]);
  
  // Charge effects for the thin lines
  useEffect(() => {
    const edgePositions = getEdgePositions();
    
    // Vibration and glitch effects for thin lines
    intervalsRef.current.edge = setInterval(() => {
      // If no edges are present, do nothing
      if (edgePositions.length === 0) return;
      
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
      
      // Get current level values (based on chargeLevel)
      const currentVibration = vibrationIntensity[chargeLevel as keyof typeof vibrationIntensity] || vibrationIntensity[1];
      const currentGlitchFreq = glitchFrequency[chargeLevel as keyof typeof glitchFrequency] || glitchFrequency[1];
      const currentColorFreq = colorEffectFrequency[chargeLevel as keyof typeof colorEffectFrequency] || colorEffectFrequency[1];
      const currentGlitchChars = edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars] || edgeGlitchChars[1];
      
      // Apply effects for each thin line
      edgePositions.forEach(pos => {
        const effect: {x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}} = {
          x: pos.x,
          y: pos.y
        };
        
        // 1. Vibration based on chargeLevel
        // At Level 2 and 3 always apply vibration, only vary strength
        if (chargeLevel >= 2 || Math.random() < currentVibration) {
          const intensityFactor = chargeLevel === 2 ? (Math.random() * 0.4 + 0.6) : 1.0; // 60-100% at Level 2
          effect.offset = getRandomOffset(currentVibration * intensityFactor);
        }
        
        // 2. Glitch effect based on chargeLevel
        // At Level 2 higher probability for glitch effects
        if ((chargeLevel === 2 && Math.random() < currentGlitchFreq * 1.5) || 
            (chargeLevel !== 2 && Math.random() < currentGlitchFreq)) {
          effect.char = currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)];
        }
        
        // 3. Color effect based on chargeLevel
        if (Math.random() < currentColorFreq) {
          effect.color = accentColors[Math.floor(Math.random() * accentColors.length)];
        }
        
        // At Level 2 always apply at least one effect
        if (chargeLevel === 2 && !effect.offset && !effect.char && !effect.color) {
          // Choose randomly one effect
          const randomEffect = Math.floor(Math.random() * 3);
          if (randomEffect === 0) {
            effect.offset = getRandomOffset(currentVibration * 0.7);
          } else if (randomEffect === 1) {
            effect.char = currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)];
          } else {
            effect.color = accentColors[Math.floor(Math.random() * accentColors.length)];
          }
        }
        
        // Only add if at least one effect was applied
        if (effect.offset || effect.char || effect.color) {
          newEdgeEffects.push(effect);
        }
      });
      
      setEdgeEffects(newEdgeEffects);
      
      // At higher charge levels faster update
      const updateSpeed = chargeLevel === 3 ? 50 : (chargeLevel === 2 ? 70 : 120); // Level 2: 80ms -> 70ms
      
      // Reset after a short time for flicker effect
      if (chargeLevel > 1) {
        setTimeout(() => {
          // At Charge Level 3 more complex flicker pattern
          if (chargeLevel === 3 && Math.random() > 0.5) {
            // New set of effects instead of complete reset
            const flickerEffects = newEdgeEffects.map(effect => {
              // 50% Chance that the effect changes
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
          } else if (chargeLevel === 2) {
            // At Charge Level 2 simple flicker instead of complete reset
            // Keep 30-70% of effects and slightly change them
            const reducedEffects = newEdgeEffects.filter(() => Math.random() > 0.3).map(effect => {
              // 40% Chance that the effect changes
              if (Math.random() > 0.6) {
                return {
                  ...effect,
                  char: Math.random() > 0.8 ? currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)] : effect.char,
                  color: Math.random() > 0.8 ? accentColors[Math.floor(Math.random() * accentColors.length)] : effect.color,
                  offset: Math.random() > 0.7 ? getRandomOffset(currentVibration * 0.7) : effect.offset
                };
              }
              return effect;
            });
            
            // Always add some new effects to enhance shaking
            const numNewEffects = Math.floor(Math.random() * 5) + 3; // 3-7 new effects
            for (let i = 0; i < numNewEffects; i++) {
              if (edgePositions.length === 0) continue;
              
              const randomPosIndex = Math.floor(Math.random() * edgePositions.length);
              const pos = edgePositions[randomPosIndex];
              
              const newEffect: {x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}} = {
                x: pos.x,
                y: pos.y
              };
              
              // Apply random effects
              if (Math.random() > 0.5) newEffect.offset = getRandomOffset(currentVibration);
              if (Math.random() > 0.6) newEffect.char = currentGlitchChars[Math.floor(Math.random() * currentGlitchChars.length)];
              if (Math.random() > 0.7) newEffect.color = accentColors[Math.floor(Math.random() * accentColors.length)];
              
              reducedEffects.push(newEffect);
            }
            
            setEdgeEffects(reducedEffects);
          } else {
            // At Charge Level 1 simple reset
            setEdgeEffects([]);
          }
        }, updateSpeed / 2);
      }
    }, chargeLevel === 3 ? 100 : (chargeLevel === 2 ? 120 : 200)); // Level 2: 150ms -> 120ms
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (intervalsRef.current.edge) clearInterval(intervalsRef.current.edge);
    };
  }, [centeredSwordLines, chargeLevel]);
  
  // Unicode glitch effects (improved)
  useEffect(() => {
    if (glitchLevel > 0) {
      // Unicode glitch effects
      intervalsRef.current.unicodeGlitch = setInterval(() => {
        // Probability for Unicode glitches based on glitchLevel
        const glitchChance = 0.7 - (glitchLevel * 0.1); // 0.7, 0.6, 0.5, 0.4
        
        if (Math.random() > glitchChance) { // Chance increases with glitchLevel
          const swordPositions = getSwordPositions();
          const newUnicodeGlitches: Array<{x: number, y: number, char: string}> = [];
          
          // Number of glitches based on glitchLevel
          const numGlitches = Math.floor(Math.random() * glitchLevel * 3) + glitchLevel;
          
          for (let i = 0; i < numGlitches; i++) {
            if (swordPositions.length === 0) continue;
            
            const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
            const pos = swordPositions[randomPosIndex];
            
            // Choose a Unicode glitch character based on glitchLevel
            const glitchChars = unicodeGlitchChars[glitchLevel as keyof typeof unicodeGlitchChars] || unicodeGlitchChars[1];
            const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            
            newUnicodeGlitches.push({
              x: pos.x,
              y: pos.y,
              char: glitchChar
            });
          }
          
          setUnicodeGlitches(newUnicodeGlitches);
          
          // Reset after a short time
          setTimeout(() => {
            setUnicodeGlitches([]);
          }, 100 + (glitchLevel * 20)); // Duration increases with glitchLevel
          
          // Debug log for Unicode glitches
          console.log(`%c[GLITCH] Unicode glitches: ${numGlitches}`, 'color: #FF3EC8; font-weight: bold;');
        }
      }, 500 - (glitchLevel * 50)); // Frequency increases with glitchLevel: 500, 450, 400, 350ms
      
      return () => {
        if (intervalsRef.current.unicodeGlitch) clearInterval(intervalsRef.current.unicodeGlitch);
      };
    } else {
      setUnicodeGlitches([]);
    }
  }, [glitchLevel]);
  
  // Add a useEffect to generate blurred effects client-side
  useEffect(() => {
    if (glitchLevel > 0) {
      const newBlurredChars: Array<{x: number, y: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generate random blurred characters based on glitchLevel
      const numBlurred = Math.floor(swordPositions.length * (glitchLevel * 0.01));
      for (let i = 0; i < numBlurred; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        newBlurredChars.push(swordPositions[randomIndex]);
      }
      
      setBlurredChars(newBlurredChars);
      
      // Update regularly
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
  
  // Add a useEffect for the skew effects
  useEffect(() => {
    if (glitchLevel >= 2) {
      const newSkewedChars: Array<{x: number, y: number, angle: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generate random skewed characters based on glitchLevel
      const numSkewed = Math.floor(swordPositions.length * (glitchLevel * 0.005));
      for (let i = 0; i < numSkewed; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        const angle = (Math.random() * 10) - 5;
        newSkewedChars.push({...swordPositions[randomIndex], angle});
      }
      
      setSkewedChars(newSkewedChars);
      
      // Update regularly
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
  
  // Add a useEffect for the opacity effects
  useEffect(() => {
    if (glitchLevel >= 3) {
      const newFadedChars: Array<{x: number, y: number, opacity: number}> = [];
      const swordPositions = getSwordPositions();
      
      // Generate random faded characters based on glitchLevel
      const numFaded = Math.floor(swordPositions.length * (glitchLevel * 0.003));
      for (let i = 0; i < numFaded; i++) {
        if (swordPositions.length === 0) continue;
        const randomIndex = Math.floor(Math.random() * swordPositions.length);
        const opacity = 0.7 + (Math.random() * 0.3);
        newFadedChars.push({...swordPositions[randomIndex], opacity});
      }
      
      setFadedChars(newFadedChars);
      
      // Update regularly
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
  
  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);
  
  // Calculate shadow based on glow intensity
  const shadowSize = Math.floor(glowIntensity * 20);
  const textShadow = `0 0 ${shadowSize + (glitchLevel * 2)}px ${baseColor}`;
  
  // Background color (darker version of complementary color)
  const backgroundColor = getDarkerColor(bgColor);
  // Lighter version of complementary color for cave background
  const lighterBgColor = getLighterColor(bgColor);
  
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 transition-colors"
        style={{ 
          backgroundColor,
          transition: 'background-color 0.05s ease-in-out' // Faster transition (reduced from 0.2s)
        }}
      >
        {/* Cave background */}
        <div 
          className="absolute inset-0"
          style={{ 
            color: lighterBgColor,
            transition: 'color 0.3s ease-in-out' // Faster transition (reduced from 0.5s)
          }}
        >
          {caveBackground.length > 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              {caveBackground.map((row, y) => (
                <div key={y} style={{ lineHeight: '1.0' }}>
                  {row.map((char, x) => {
                    // Check if there's a colored vein at this position
                    const vein = coloredVeins.find(v => v.x === x && v.y === y);
                    
                    // Style for this character
                    const style: React.CSSProperties = vein ? {
                      color: vein.color,
                      textShadow: `0 0 5px ${vein.color}`
                    } : {};
                    
                    // Check if this character is in the list of blurred characters
                    const isBlurred = blurredChars.some(c => c.x === x && c.y === y);
                    if (isBlurred) {
                      style.filter = `${style.filter || ''} blur(1px)`.trim();
                    }
                    
                    // Check if this character should be skewed
                    const skewEffect = skewedChars.find(c => c.x === x && c.y === y);
                    if (skewEffect) {
                      style.transform = `${style.transform || ''} skewX(${skewEffect.angle}deg)`.trim();
                    }
                    
                    // Check if this character should be faded
                    const fadeEffect = fadedChars.find(c => c.x === x && c.y === y);
                    if (fadeEffect) {
                      style.opacity = fadeEffect.opacity;
                    }
                    
                    return (
                      <span key={x} style={style}>{char}</span>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Sword in foreground */}
        <pre
          className="relative z-10 font-mono text-xs sm:text-sm md:text-base lg:text-lg whitespace-pre select-none"
          style={{
            color: baseColor,
            textShadow,
            transition: 'color 0.1s ease-in-out, text-shadow 0.1s ease-in-out' // Faster transition (reduced from 0.3s)
          }}
        >
          {centeredSwordLines.map((line, y) => (
            <div key={y} style={{ 
              lineHeight: '1.0',
              height: '1em'
            }}>
              {Array.from(line).map((char, x) => {
                // Find glitch effect at this position
                const glitch = glitchChars.find(g => g.x === x && g.y === y);
                
                // Find Unicode glitch at this position
                const unicodeGlitch = unicodeGlitches.find(g => g.x === x && g.y === y);
                
                // Find colored tile at this position
                const coloredTile = coloredTiles.find(t => t.x === x && t.y === y);
                
                // Find edge effect at this position
                const edgeEffect = edgeEffects.find(e => e.x === x && e.y === y);
                
                // Check if this character is a thin line and not in the handle area
                const isEdge = isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines);
                
                // Style for this character with all necessary properties
                let style: React.CSSProperties = { 
                  display: 'inline-block',
                  width: '1ch',
                  height: '1em',
                  position: 'relative'
                };
                
                // Apply color effects (Priority: Edge > ColoredTile)
                if (edgeEffect?.color) {
                  style.color = edgeEffect.color;
                  style.textShadow = `0 0 5px ${edgeEffect.color}`;
                } else if (coloredTile) {
                  style.color = coloredTile.color;
                  style.textShadow = `0 0 5px ${coloredTile.color}`;
                }
                
                // Apply position effects for edges
                if (isEdge && edgeEffect?.offset) {
                  style.transform = `translate(${edgeEffect.offset.x}px, ${edgeEffect.offset.y}px)`;
                  
                  // At higher charge levels additional effects
                  if (chargeLevel >= 2) {
                    style.transition = 'transform 0.05s ease';
                    if (chargeLevel === 3) {
                      style.filter = 'brightness(1.2)';
                    }
                  }
                }
                
                // Character determination (Priority: UnicodeGlitch > Glitch > EdgeEffect > Original)
                const displayChar = unicodeGlitch ? unicodeGlitch.char :
                                   (glitch ? glitch.char : 
                                    (edgeEffect?.char ? edgeEffect.char : char));
                
                return (
                  <span 
                    key={x} 
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
    </div>
  );
} 