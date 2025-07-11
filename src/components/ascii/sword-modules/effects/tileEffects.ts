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
  colorEffectIntensity: {[key: number]: number},
  energy: number = 0.5 // NEU: Energy-Parameter für energieabhängige Generierung
): Array<{x: number, y: number, color: string}> {
  const coloredTiles: Array<{x: number, y: number, color: string}> = [];
  
  // NEU: Energieabhängige Cluster-Anzahl
  const baseClusters = 3;
  const randomClusters = Math.floor(Math.random() * 4); // 0-3 zufällige Cluster
  const levelBonus = (colorEffectIntensity[glitchLevel] || 2);
  
  // VERSTÄRKT: Mehr Cluster ab Level 2 und 3
  let levelMultiplier = 1;
  if (glitchLevel >= 2) levelMultiplier = 1.5; // 50% mehr ab Level 2
  if (glitchLevel >= 3) levelMultiplier = 2.0; // 100% mehr ab Level 3
  
  // NEU: Energie-Multiplikator für dezente Effekte bei niedriger Energy
  let energyMultiplier = 1;
  if (energy < 0.1) energyMultiplier = 0.3; // 70% weniger bei sehr niedriger Energy
  else if (energy < 0.2) energyMultiplier = 0.5; // 50% weniger bei niedriger Energy
  else if (energy < 0.3) energyMultiplier = 0.7; // 30% weniger bei mittlerer Energy
  else if (energy < 0.5) energyMultiplier = 0.9; // 10% weniger bei höherer Energy
  // Ab 0.5 Energy: normale Anzahl (100%)
  
  const numClusters = Math.floor((baseClusters + randomClusters + levelBonus) * levelMultiplier * energyMultiplier);
  
  for (let i = 0; i < numClusters; i++) {
    // Wähle eine zufällige Position
    if (swordPositions.length === 0) continue;
    
    const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
    const basePos = swordPositions[randomPosIndex];
    
    // NEU: Energieabhängige Clustergröße
    const baseClusterSize = Math.floor(Math.random() * 5) + 2; // 2-6 Tiles (Basis)
    const sizeIncrease = Math.floor(baseClusterSize * 0.1); // 10% Erhöhung
    
    // VERSTÄRKT: Größere Cluster ab Level 2 und 3
    let levelSizeBonus = 0;
    if (glitchLevel >= 2) levelSizeBonus = 1; // +1 Tile ab Level 2
    if (glitchLevel >= 3) levelSizeBonus = 2; // +2 Tiles ab Level 3
    
    // NEU: Energieabhängige Größenanpassung
    let energySizeMultiplier = 1;
    if (energy < 0.1) energySizeMultiplier = 0.5; // 50% kleinere Cluster bei sehr niedriger Energy
    else if (energy < 0.2) energySizeMultiplier = 0.7; // 30% kleinere Cluster bei niedriger Energy
    else if (energy < 0.3) energySizeMultiplier = 0.85; // 15% kleinere Cluster bei mittlerer Energy
    // Ab 0.3 Energy: normale Größe (100%)
    
    const clusterSize = Math.max(1, Math.floor((baseClusterSize + sizeIncrease + levelSizeBonus) * energySizeMultiplier));
    
    // NEU: Energieabhängige Einzel-Tile-Wahrscheinlichkeit
    let singleTileChance = 0.15; // Basis: 15% Chance
    if (energy < 0.1) singleTileChance = 0.05; // 5% bei sehr niedriger Energy (weniger Einzel-Tiles)
    else if (energy < 0.2) singleTileChance = 0.08; // 8% bei niedriger Energy
    else if (energy < 0.3) singleTileChance = 0.12; // 12% bei mittlerer Energy
    // Ab 0.3 Energy: normale 15% Chance
    
    const isSingleTile = Math.random() < singleTileChance;
    
    if (isSingleTile) {
      // Einzel-Tile hinzufügen
      const accentColor = accentColors[Math.floor(Math.random() * accentColors.length)];
      coloredTiles.push({
        x: basePos.x,
        y: basePos.y,
        color: accentColor
      });
    } else {
      // Normaler Cluster
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