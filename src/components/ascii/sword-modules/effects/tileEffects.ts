/**
 * tileEffects.ts
 * 
 * Funktionen zur Generierung von Tile-Effekten für die ASCII-Schwert-Komponente
 */
import { accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';

/**
 * Generiert farbige Tiles für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @param colorEffectIntensity Intensität der Farbeffekte
 * @returns Array mit farbigen Tiles
 */
export function generateColoredTiles(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number,
  colorEffectIntensity: {[key: number]: number}
): Array<{x: number, y: number, color: string}> {
  const coloredTiles: Array<{x: number, y: number, color: string}> = [];
  
  // Anzahl der Cluster basierend auf glitchLevel
  const numClusters = Math.floor(Math.random() * 4) + 3 + (colorEffectIntensity[glitchLevel] || 2);
  
  for (let i = 0; i < numClusters; i++) {
    // Wähle eine zufällige Position und Clustergröße
    if (swordPositions.length === 0) continue;
    
    const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
    const basePos = swordPositions[randomPosIndex];
    
    // Clustergröße: 2-6 zusammenhängende Tiles, größer bei höherem glitchLevel
    const clusterSize = Math.floor(Math.random() * 5) + 2; // Mindestens 2, maximal 6 Tiles
    
    // Generiere Cluster
    const cluster = generateCluster(
      basePos.x, 
      basePos.y, 
      clusterSize,
      20, // maxWidth
      30  // maxHeight
    );
    
    // Wähle eine zufällige Akzentfarbe für dieses Cluster
    const accentColor = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Füge alle Positionen im Cluster hinzu
    cluster.forEach(pos => {
      coloredTiles.push({
        x: pos.x,
        y: pos.y,
        color: accentColor
      });
    });
  }
  
  return coloredTiles;
}

/**
 * Generiert Glitch-Zeichen für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @param glitchFrequency Häufigkeit der Glitches
 * @param glitchSymbols Verfügbare Glitch-Symbole
 * @returns Array mit Glitch-Zeichen
 */
export function generateGlitchChars(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number,
  glitchFrequency: {[key: number]: number},
  glitchSymbols: string[]
): Array<{x: number, y: number, char: string}> {
  const glitchChars: Array<{x: number, y: number, char: string}> = [];
  
  // Wenn kein Glitch-Level, keine Glitches
  if (glitchLevel === 0) return [];
  
  // Berechne die Anzahl der Glitches basierend auf dem Glitch-Level und der Frequenz
  const frequency = glitchFrequency[glitchLevel] || 0.1;
  const numGlitches = Math.floor(swordPositions.length * frequency);
  
  // Wähle zufällige Positionen für Glitches
  for (let i = 0; i < numGlitches; i++) {
    if (swordPositions.length === 0) continue;
    
    // Wähle eine zufällige Position
    const randomIndex = Math.floor(Math.random() * swordPositions.length);
    const pos = swordPositions[randomIndex];
    
    // Wähle ein zufälliges Glitch-Symbol
    const randomChar = glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)];
    
    glitchChars.push({
      x: pos.x,
      y: pos.y,
      char: randomChar
    });
  }
  
  return glitchChars;
} 