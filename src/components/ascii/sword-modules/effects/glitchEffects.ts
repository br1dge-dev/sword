/**
 * glitchEffects.ts
 * 
 * Funktionen zur Generierung von Glitch-Effekten für die ASCII-Schwert-Komponente
 */
import { edgeGlitchChars, unicodeGlitchChars, accentColors } from '../constants/swordConstants';
import { getRandomOffset } from '../utils/swordUtils';

/**
 * Generiert Glitch-Effekte für die Kanten des Schwerts
 * @param edgePositions Positionen der Kanten
 * @param glitchLevel Glitch-Level (0-3)
 * @returns Array mit Glitch-Effekten für die Kanten
 */
export function generateEdgeGlitches(
  edgePositions: Array<{x: number, y: number, char: string}>,
  glitchLevel: number
): Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> {
  const edgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
  
  // Wenn kein Glitch-Level, keine Effekte
  if (glitchLevel === 0) return [];
  
  // Wähle zufällige Kanten für Glitch-Effekte aus
  const numGlitches = Math.floor(edgePositions.length * (0.05 + (glitchLevel * 0.05)));
  
  for (let i = 0; i < numGlitches; i++) {
    if (edgePositions.length === 0) continue;
    
    // Wähle eine zufällige Kante
    const randomIndex = Math.floor(Math.random() * edgePositions.length);
    const edgePos = edgePositions[randomIndex];
    
    // Bestimme den Effekt-Typ (Zeichen, Farbe, Position)
    const effectType = Math.floor(Math.random() * 3); // 0: Zeichen, 1: Farbe, 2: Position
    
    let effect: {x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}} = {
      x: edgePos.x,
      y: edgePos.y
    };
    
    switch (effectType) {
      case 0: // Zeichen-Glitch
        {
          // Wähle ein zufälliges Glitch-Zeichen
          const glitchChars = edgeGlitchChars[glitchLevel as keyof typeof edgeGlitchChars] || edgeGlitchChars[1];
          const randomChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
          effect.char = randomChar;
        }
        break;
        
      case 1: // Farb-Glitch
        {
          // Wähle eine zufällige Akzentfarbe
          const randomColor = accentColors[Math.floor(Math.random() * accentColors.length)];
          effect.color = randomColor;
        }
        break;
        
      case 2: // Positions-Glitch
        {
          // Berechne einen zufälligen Offset basierend auf dem Glitch-Level
          const intensity = 0.2 + (glitchLevel * 0.2); // 0.2-0.8
          effect.offset = getRandomOffset(intensity);
        }
        break;
    }
    
    edgeEffects.push(effect);
  }
  
  return edgeEffects;
}

/**
 * Generiert Unicode-Glitches für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @returns Array mit Unicode-Glitches
 */
export function generateUnicodeGlitches(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number
): Array<{x: number, y: number, char: string}> {
  const glitches: Array<{x: number, y: number, char: string}> = [];
  
  // Wenn kein Glitch-Level, keine Glitches
  if (glitchLevel === 0) return [];
  
  // Anzahl der Glitches basierend auf dem Glitch-Level
  const glitchPercentage = 0.01 + (glitchLevel * 0.01); // 1-4% der Schwertpositionen
  const numGlitches = Math.floor(swordPositions.length * glitchPercentage);
  
  // Wähle zufällige Positionen für Glitches
  for (let i = 0; i < numGlitches; i++) {
    if (swordPositions.length === 0) continue;
    
    // Wähle eine zufällige Position
    const randomIndex = Math.floor(Math.random() * swordPositions.length);
    const pos = swordPositions[randomIndex];
    
    // Wähle ein zufälliges Unicode-Glitch-Zeichen
    const chars = unicodeGlitchChars[glitchLevel as keyof typeof unicodeGlitchChars] || unicodeGlitchChars[1];
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    
    glitches.push({
      x: pos.x,
      y: pos.y,
      char: randomChar
    });
  }
  
  return glitches;
}

/**
 * Generiert verschwommene Zeichen für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @returns Array mit verschwommenen Zeichen
 */
export function generateBlurredChars(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number
): Array<{x: number, y: number}> {
  // Wenn Glitch-Level unter 1, keine verschwommenen Zeichen
  if (glitchLevel < 1) return [];
  
  const blurredChars: Array<{x: number, y: number}> = [];
  
  // Anzahl der verschwommenen Zeichen basierend auf dem Glitch-Level
  const numBlurred = Math.floor(swordPositions.length * (glitchLevel * 0.01)); // 1-3% der Schwertpositionen
  
  // Wähle zufällige Positionen für verschwommene Zeichen
  for (let i = 0; i < numBlurred; i++) {
    if (swordPositions.length === 0) continue;
    
    // Wähle eine zufällige Position
    const randomIndex = Math.floor(Math.random() * swordPositions.length);
    blurredChars.push(swordPositions[randomIndex]);
  }
  
  return blurredChars;
}

/**
 * Generiert verzerrte Zeichen für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @returns Array mit verzerrten Zeichen
 */
export function generateSkewedChars(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number
): Array<{x: number, y: number, angle: number}> {
  // Wenn Glitch-Level unter 2, keine verzerrten Zeichen
  if (glitchLevel < 2) return [];
  
  const skewedChars: Array<{x: number, y: number, angle: number}> = [];
  
  // Anzahl der verzerrten Zeichen basierend auf dem Glitch-Level
  const numSkewed = Math.floor(swordPositions.length * (glitchLevel * 0.005)); // 0.5-1.5% der Schwertpositionen
  
  // Wähle zufällige Positionen für verzerrte Zeichen
  for (let i = 0; i < numSkewed; i++) {
    if (swordPositions.length === 0) continue;
    
    // Wähle eine zufällige Position
    const randomIndex = Math.floor(Math.random() * swordPositions.length);
    const angle = (Math.random() * 10) - 5; // -5 bis +5 Grad
    
    skewedChars.push({
      ...swordPositions[randomIndex],
      angle
    });
  }
  
  return skewedChars;
}

/**
 * Generiert verblasste Zeichen für das Schwert
 * @param swordPositions Positionen des Schwerts
 * @param glitchLevel Glitch-Level (0-3)
 * @returns Array mit verblassten Zeichen
 */
export function generateFadedChars(
  swordPositions: Array<{x: number, y: number}>,
  glitchLevel: number
): Array<{x: number, y: number, opacity: number}> {
  // Wenn Glitch-Level unter 3, keine verblassten Zeichen
  if (glitchLevel < 3) return [];
  
  const fadedChars: Array<{x: number, y: number, opacity: number}> = [];
  
  // Anzahl der verblassten Zeichen basierend auf dem Glitch-Level
  const numFaded = Math.floor(swordPositions.length * (glitchLevel * 0.003)); // 0.9% der Schwertpositionen bei Level 3
  
  // Wähle zufällige Positionen für verblasste Zeichen
  for (let i = 0; i < numFaded; i++) {
    if (swordPositions.length === 0) continue;
    
    // Wähle eine zufällige Position
    const randomIndex = Math.floor(Math.random() * swordPositions.length);
    const opacity = 0.7 + (Math.random() * 0.3); // 0.7-1.0
    
    fadedChars.push({
      ...swordPositions[randomIndex],
      opacity
    });
  }
  
  return fadedChars;
} 