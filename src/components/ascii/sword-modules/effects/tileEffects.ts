/**
 * tileEffects.ts
 * 
 * Funktionen zur Generierung von Tile-Effekten für die ASCII-Schwert-Komponente
 * Überarbeitet für bessere Musik-Reaktivität und dynamische Skalierung
 */
import { accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';
import { SwordPosition } from '../types/swordTypes';

// Konfiguration für Tile-Effekte (kann vom Modal überschrieben werden)
export interface TileEffectConfig {
  minCount: number;           // Minimale Anzahl Tiles bei niedriger Energie
  maxPercent: number;         // Maximaler Prozentsatz der Tiles (0-1)
  energyCurve: number;        // Wie stark die Energie den Anstieg beeinflusst (1=linear, >1=exponentiell)
  beatBoost: number;          // Multiplikator für die Anzahl bei Beat
  waveForm: boolean;          // Wellenform-Animation aktivieren
  clusterSize: {
    min: number;              // Minimale Cluster-Größe
    max: number;              // Maximale Cluster-Größe
    energyMultiplier: number; // Wie stark die Energie die Cluster-Größe beeinflusst
  };
}

// Standard-Konfiguration
export const defaultTileConfig: TileEffectConfig = {
  minCount: 2,
  maxPercent: 0.5,
  energyCurve: 2.0,
  beatBoost: 1.5,
  waveForm: true,
  clusterSize: {
    min: 2,
    max: 8,
    energyMultiplier: 2.0
  }
};

/**
 * Generiert farbige Tiles für das Schwert basierend auf Musik-Intensität
 * @param swordPositions Positionen des Schwerts
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param glitchLevel Glitch-Level (0-3)
 * @param config Optionale Konfiguration für Tile-Effekte
 * @returns Array mit farbigen Tiles
 */
export function generateColoredTiles(
  swordPositions: Array<SwordPosition>,
  energy: number,
  beatDetected: boolean,
  glitchLevel: number,
  config: Partial<TileEffectConfig> = {}
): Array<{x: number, y: number, color: string}> {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: TileEffectConfig = {
    ...defaultTileConfig,
    ...config,
    clusterSize: {
      ...defaultTileConfig.clusterSize,
      ...(config.clusterSize || {})
    }
  };
  
  // Leeres Array für farbige Tiles
  const coloredTiles: Array<{x: number, y: number, color: string}> = [];
  
  // Wenn keine Schwertpositionen vorhanden sind, früh zurückkehren
  if (!swordPositions.length) return coloredTiles;
  
  // ===== BERECHNUNG DER ANZAHL DER TILES =====
  
  // Berechne den Energie-Faktor mit exponentieller Kurve für natürlichere Skalierung
  const energyFactor = Math.pow(energy, effectiveConfig.energyCurve);
  
  // Berechne die Basis-Anzahl der Tiles basierend auf Energie
  // Bei niedriger Energie: minCount, bei hoher Energie: bis zu maxPercent der Gesamtpositionen
  const minTiles = effectiveConfig.minCount;
  const maxTiles = Math.floor(swordPositions.length * effectiveConfig.maxPercent);
  let numTiles = Math.floor(minTiles + (maxTiles - minTiles) * energyFactor);
  
  // Boost bei Beat-Erkennung
  if (beatDetected) {
    numTiles = Math.min(maxTiles, Math.floor(numTiles * effectiveConfig.beatBoost));
  }
  
  // Zusätzlicher Boost bei höherem Glitch-Level
  numTiles += Math.floor(glitchLevel * swordPositions.length * 0.05);
  
  // Stelle sicher, dass die Anzahl im gültigen Bereich liegt
  numTiles = Math.max(minTiles, Math.min(numTiles, maxTiles));
  
  // ===== AUSWAHL DER POSITIONEN =====
  
  // Wenn Wellenform aktiviert ist, wähle Positionen in einer Welle aus
  if (effectiveConfig.waveForm && numTiles > 5) {
    // Sortiere Positionen nach Y-Koordinate für Welleneffekt
    const sortedPositions = [...swordPositions].sort((a, b) => a.y - b.y);
    
    // Berechne Wellen-Parameter basierend auf Energie und Beat
    const waveFrequency = 0.1 + energy * 0.3; // Höhere Frequenz bei höherer Energie
    const waveAmplitude = 0.3 + energy * 0.7; // Höhere Amplitude bei höherer Energie
    const timeOffset = Date.now() * 0.001; // Zeitbasierte Animation
    const beatPhase = beatDetected ? 0.5 : 0; // Phasenverschiebung bei Beat
    
    // Wähle Positionen basierend auf Wellenform aus
    for (let i = 0; i < sortedPositions.length; i++) {
      const pos = sortedPositions[i];
      const normalizedY = i / sortedPositions.length; // 0-1 basierend auf Y-Position
      
      // Berechne Wellenform-Wahrscheinlichkeit für diese Position
      const waveValue = Math.sin((normalizedY * waveFrequency + timeOffset + beatPhase) * Math.PI * 2);
      const normalizedWave = (waveValue + 1) / 2; // Normalisiere auf 0-1
      
      // Höhere Wahrscheinlichkeit bei höherer Energie und in Wellenbergen
      const probability = normalizedWave * waveAmplitude * energy * 2;
      
      // Wähle diese Position mit berechneter Wahrscheinlichkeit
      if (Math.random() < probability && coloredTiles.length < numTiles) {
        // Bestimme Cluster-Größe basierend auf Energie und Konfiguration
        const minSize = effectiveConfig.clusterSize.min;
        const maxSize = effectiveConfig.clusterSize.max;
        const energyBoost = energy * effectiveConfig.clusterSize.energyMultiplier;
        const clusterSize = Math.floor(minSize + (maxSize - minSize) * energyBoost);
        
        // Wähle Farbe basierend auf Position im Schwert (für Farbverläufe)
        const colorIndex = Math.floor(normalizedY * accentColors.length) % accentColors.length;
        const color = accentColors[colorIndex];
        
        // Generiere Cluster um diese Position
        const cluster = generateCluster(pos.x, pos.y, clusterSize, 20, 30);
        
        // Füge Cluster-Positionen hinzu
        cluster.forEach(clusterPos => {
          if (coloredTiles.length < numTiles) {
            coloredTiles.push({
              x: clusterPos.x,
              y: clusterPos.y,
              color
            });
          }
        });
      }
    }
    
    // Falls nicht genug Tiles durch Wellenform, fülle mit zufälligen auf
    if (coloredTiles.length < numTiles) {
      const remainingTiles = numTiles - coloredTiles.length;
      const availablePositions = swordPositions.filter(pos => 
        !coloredTiles.some(tile => tile.x === pos.x && tile.y === pos.y)
      );
      
      // Wähle zufällige Positionen für die restlichen Tiles
      const randomPositions = [...availablePositions]
        .sort(() => Math.random() - 0.5)
        .slice(0, remainingTiles);
      
      // Füge zufällige Positionen hinzu
      randomPositions.forEach(pos => {
        coloredTiles.push({
          x: pos.x,
          y: pos.y,
          color: accentColors[Math.floor(Math.random() * accentColors.length)]
        });
      });
    }
  } 
  // Sonst klassische zufällige Auswahl mit Clustern
  else {
    // Berechne die Anzahl der Cluster basierend auf der Gesamtzahl der Tiles
    const numClusters = Math.max(1, Math.floor(numTiles / 5));
    
    // Bestimme Cluster-Größe basierend auf Energie und Konfiguration
    const minSize = effectiveConfig.clusterSize.min;
    const maxSize = effectiveConfig.clusterSize.max;
    const energyBoost = energy * effectiveConfig.clusterSize.energyMultiplier;
    const avgClusterSize = Math.floor(minSize + (maxSize - minSize) * energyBoost);
    
    // Generiere Cluster
    for (let i = 0; i < numClusters && coloredTiles.length < numTiles; i++) {
      // Wähle zufällige Position für Cluster-Zentrum
      const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
      const basePos = swordPositions[randomPosIndex];
      
      // Variiere Cluster-Größe leicht um Durchschnitt
      const clusterSize = Math.max(minSize, Math.min(maxSize, 
        avgClusterSize + Math.floor(Math.random() * 3) - 1
      ));
      
      // Wähle Farbe für dieses Cluster
      const color = accentColors[Math.floor(Math.random() * accentColors.length)];
      
      // Generiere Cluster
      const cluster = generateCluster(basePos.x, basePos.y, clusterSize, 20, 30);
      
      // Füge Cluster-Positionen hinzu, solange Limit nicht erreicht
      cluster.forEach(pos => {
        if (coloredTiles.length < numTiles) {
          // Prüfe, ob Position bereits verwendet
          const isDuplicate = coloredTiles.some(tile => tile.x === pos.x && tile.y === pos.y);
          
          if (!isDuplicate) {
            coloredTiles.push({
              x: pos.x,
              y: pos.y,
              color
            });
          }
        }
      });
    }
    
    // Falls nicht genug Tiles durch Cluster, fülle mit Einzeltiles auf
    if (coloredTiles.length < numTiles) {
      const remainingTiles = numTiles - coloredTiles.length;
      const availablePositions = swordPositions.filter(pos => 
        !coloredTiles.some(tile => tile.x === pos.x && tile.y === pos.y)
      );
      
      // Wähle zufällige Positionen für die restlichen Tiles
      const randomPositions = [...availablePositions]
        .sort(() => Math.random() - 0.5)
        .slice(0, remainingTiles);
      
      // Füge zufällige Positionen hinzu
      randomPositions.forEach(pos => {
        coloredTiles.push({
          x: pos.x,
          y: pos.y,
          color: accentColors[Math.floor(Math.random() * accentColors.length)]
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