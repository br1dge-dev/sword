/**
 * colorEffects.ts
 * 
 * Funktionen zur Generierung von Farbeffekten für die ASCII-Schwert-Komponente
 */
import { baseColors, accentColors } from '../constants/swordConstants';
import { getComplementaryColor } from '../utils/swordUtils';

/**
 * Generiert ein harmonisches Farbpaar für Schwert und Hintergrund
 * @returns Objekt mit harmonischen Farben für Schwert und Hintergrund
 */
export function generateHarmonicColorPair(): { baseColor: string, bgColor: string } {
  // Wähle eine zufällige Basisfarbe aus den Akzentfarben
  const baseColor = accentColors[Math.floor(Math.random() * accentColors.length)];
  
  // Generiere eine komplementäre Farbe für den Hintergrund
  const bgColor = getComplementaryColor(baseColor);
  
  return { baseColor, bgColor };
} 