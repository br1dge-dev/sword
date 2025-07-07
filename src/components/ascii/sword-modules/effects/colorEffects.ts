/**
 * colorEffects.ts
 * 
 * Funktionen zur Generierung von Farbeffekten für die ASCII-Schwert-Komponente
 */
import { baseColors, accentColors } from '../constants/swordConstants';
import { getComplementaryColor } from '../utils/swordUtils';
import { SwordPosition } from '../types/swordTypes';

/**
 * Generiert ein harmonisches Farbpaar für Schwert und Hintergrund
 * @returns Objekt mit Schwert- und Hintergrundfarbe
 */
export function generateHarmonicColorPair(): { swordColor: string, bgColor: string } {
  // Wähle eine zufällige Basisfarbe für das Schwert
  const swordColor = baseColors[Math.floor(Math.random() * baseColors.length)];
  
  // Wähle eine Strategie für die Hintergrundfarbe
  const strategy = Math.floor(Math.random() * 4); // 0-3
  let bgColor = '';
  
  switch (strategy) {
    case 0: // Komplementärfarbe
      bgColor = getComplementaryColor(swordColor);
      break;
      
    case 1: // Leicht verschobene Farbe (ähnlich, aber anders)
      {
        // Konvertiere Hex zu RGB
        const hex = swordColor.slice(1); // Entferne #
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        
        // Verschiebe die Farbe um einen zufälligen Betrag
        const newR = Math.min(255, Math.max(0, r + (Math.random() * 100) - 50));
        const newG = Math.min(255, Math.max(0, g + (Math.random() * 100) - 50));
        const newB = Math.min(255, Math.max(0, b + (Math.random() * 100) - 50));
        
        // Konvertiere zurück zu Hex
        bgColor = `#${Math.floor(newR).toString(16).padStart(2, '0')}${Math.floor(newG).toString(16).padStart(2, '0')}${Math.floor(newB).toString(16).padStart(2, '0')}`;
      }
      break;
      
    case 2: // Verschobener Farbton (gleiche Sättigung und Helligkeit)
      {
        // Konvertiere Hex zu HSL
        const hex = swordColor.slice(1); // Entferne #
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          
          h /= 6;
        }
        
        // Verschiebe den Farbton um 90-180 Grad
        const hueShift = 90 + Math.floor(Math.random() * 90); // 90-180 Grad
        let newH = (h * 360 + hueShift) % 360;
        
        // Konvertiere zurück zu RGB
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        const newR = Math.round(hue2rgb(p, q, (newH / 360 + 1/3) % 1) * 255);
        const newG = Math.round(hue2rgb(p, q, (newH / 360) % 1) * 255);
        const newB = Math.round(hue2rgb(p, q, (newH / 360 - 1/3) % 1) * 255);
        
        bgColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
      break;
      
    case 3: // Zufällige Akzentfarbe, die gut zum Schwert passt
    default:
      {
        // Filtere Akzentfarben, die gut zur Schwertfarbe passen
        const swordColorHex = swordColor.slice(1); // Entferne #
        const swordR = parseInt(swordColorHex.slice(0, 2), 16);
        const swordG = parseInt(swordColorHex.slice(2, 4), 16);
        const swordB = parseInt(swordColorHex.slice(4, 6), 16);
        
        // Wähle Farben, die einen gewissen Kontrast haben
        const compatibleColors = accentColors.filter(color => {
          const colorHex = color.slice(1); // Entferne #
          const r = parseInt(colorHex.slice(0, 2), 16);
          const g = parseInt(colorHex.slice(2, 4), 16);
          const b = parseInt(colorHex.slice(4, 6), 16);
          
          // Berechne Farbdifferenz (vereinfacht)
          const diff = Math.abs(r - swordR) + Math.abs(g - swordG) + Math.abs(b - swordB);
          return diff > 150; // Mindestens eine gewisse Differenz
        });
        
        if (compatibleColors.length > 0) {
          bgColor = compatibleColors[Math.floor(Math.random() * compatibleColors.length)];
        } else {
          // Fallback auf Komplementärfarbe
          bgColor = getComplementaryColor(swordColor);
        }
      }
      break;
  }
  
  return { swordColor, bgColor };
}

/**
 * Generiert farbige Kacheln für das Schwert basierend auf der Energie und dem Beat
 * @param positions Array von Schwertpositionen
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param glitchLevel Aktuelles Glitch-Level (0-3)
 * @returns Array von farbigen Kacheln
 */
export function generateColoredTiles(
  positions: Array<SwordPosition>, 
  energy: number, 
  beatDetected: boolean,
  glitchLevel: number
): Array<{x: number, y: number, color: string}> {
  const coloredTiles: Array<{x: number, y: number, color: string}> = [];
  
  // Berechne die Anzahl der farbigen Kacheln basierend auf Energie und Beat
  // Erhöhte Basisanzahl und stärkere Reaktion auf Energie für bessere Sichtbarkeit
  let numTiles = Math.floor(positions.length * 0.05); // Basiswert: 5% der Schwertpositionen (erhöht von 0.03)
  
  // Erhöhe die Anzahl basierend auf Energie und Beat
  numTiles += Math.floor(positions.length * energy * 0.15); // Erhöht von 0.1 für bessere Sichtbarkeit
  
  // Zusätzliche Kacheln bei Beat-Erkennung
  if (beatDetected) {
    numTiles += Math.floor(positions.length * 0.08); // Erhöht von 0.05 für bessere Sichtbarkeit
  }
  
  // Zusätzliche Kacheln bei höherem Glitch-Level
  numTiles += Math.floor(glitchLevel * positions.length * 0.04); // Erhöht von 0.02 für bessere Sichtbarkeit
  
  // Begrenze die maximale Anzahl
  const maxTiles = Math.floor(positions.length * 0.4); // Erhöht von 0.3 für bessere Sichtbarkeit
  numTiles = Math.min(numTiles, maxTiles);
  
  // Wähle zufällige Positionen aus
  const selectedPositions = [...positions]
    .sort(() => Math.random() - 0.5)
    .slice(0, numTiles);
  
  // Erstelle farbige Kacheln für die ausgewählten Positionen
  for (const pos of selectedPositions) {
    // Wähle eine zufällige Farbe aus den Akzentfarben
    const color = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Füge die farbige Kachel hinzu
    coloredTiles.push({
      x: pos.x,
      y: pos.y,
      color
    });
  }
  
  return coloredTiles;
}

/**
 * Generiert einen Farbverlauf für das Schwert basierend auf der Energie
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param glitchLevel Aktuelles Glitch-Level (0-3)
 * @returns Farbe im Hex-Format
 */
export function generateSwordColor(
  energy: number, 
  beatDetected: boolean,
  glitchLevel: number
): string {
  // Basis-Farbwerte
  let r = 62; // 3E in Hex
  let g = 230; // E6 in Hex
  let b = 255; // FF in Hex
  
  // Pulsieren basierend auf Energie - verstärkte Reaktion für bessere Sichtbarkeit
  const pulseAmount = energy * 25; // Erhöht von 15 für stärkere Farbänderung
  r = Math.min(255, r + Math.floor(pulseAmount * 1.5)); // Erhöht von 1.2 für stärkere Rotkomponente
  g = Math.max(180, g - Math.floor(pulseAmount * 0.8)); // Erhöht von 0.5 für stärkere Grünreduktion
  
  // Zusätzliche Farbänderung bei Beat-Erkennung - verstärkte Reaktion für bessere Sichtbarkeit
  if (beatDetected) {
    r = Math.min(255, r + 25); // Erhöht von 15 für stärkeren Beat-Effekt
    g = Math.min(255, g + 15); // Erhöht von 10 für stärkeren Beat-Effekt
    b = Math.max(200, b - 15); // Erhöht von 10 für stärkeren Beat-Effekt
  }
  
  // Farbverschiebung bei höherem Glitch-Level - verstärkte Reaktion für bessere Sichtbarkeit
  if (glitchLevel > 0) {
    const glitchMultiplier = glitchLevel * 0.4; // Erhöht von 0.25 für stärkeren Glitch-Effekt
    r = Math.min(255, Math.floor(r * (1 + glitchMultiplier * 0.5)));
    g = Math.max(100, Math.floor(g * (1 - glitchMultiplier * 0.3)));
    b = Math.min(255, Math.floor(b * (1 + glitchMultiplier * 0.2)));
  }
  
  // Konvertiere zu Hex-Farbe
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generiert eine dunklere Hintergrundfarbe basierend auf der Schwertfarbe
 * @param baseColor Die Basisfarbe des Schwerts im Hex-Format
 * @returns Dunklere Farbe im Hex-Format
 */
export function getDarkerColor(baseColor: string): string {
  // Extrahiere RGB-Komponenten
  const r = parseInt(baseColor.substring(1, 3), 16);
  const g = parseInt(baseColor.substring(3, 5), 16);
  const b = parseInt(baseColor.substring(5, 7), 16);
  
  // Berechne dunklere Farbe - stärkerer Kontrast für bessere Sichtbarkeit
  const darkerR = Math.floor(r * 0.08); // Reduziert von 0.1 für dunkleren Hintergrund
  const darkerG = Math.floor(g * 0.08); // Reduziert von 0.1 für dunkleren Hintergrund
  const darkerB = Math.floor(b * 0.12); // Reduziert von 0.15 für dunkleren Hintergrund
  
  // Konvertiere zu Hex-Farbe
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

/**
 * Generiert eine hellere Farbe für den Höhlenhintergrund
 * @param baseColor Die Basisfarbe des Schwerts im Hex-Format
 * @returns Hellere Farbe im Hex-Format
 */
export function getLighterColor(baseColor: string): string {
  // Extrahiere RGB-Komponenten
  const r = parseInt(baseColor.substring(1, 3), 16);
  const g = parseInt(baseColor.substring(3, 5), 16);
  const b = parseInt(baseColor.substring(5, 7), 16);
  
  // Berechne hellere Farbe - verstärkter Kontrast für bessere Sichtbarkeit
  const lighterR = Math.min(255, Math.floor(r * 0.35)); // Erhöht von 0.25 für besseren Kontrast
  const lighterG = Math.min(255, Math.floor(g * 0.35)); // Erhöht von 0.25 für besseren Kontrast
  const lighterB = Math.min(255, Math.floor(b * 0.5)); // Erhöht von 0.4 für besseren Kontrast
  
  // Konvertiere zu Hex-Farbe
  return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
} 