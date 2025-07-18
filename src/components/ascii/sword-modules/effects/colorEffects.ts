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
  // Maximal 1-3 Tiles aktiv, langsam rotierend
  const coloredTiles: Array<{x: number, y: number, color: string}> = [];

  // Bestimme die Anzahl der Tiles (1 bei wenig Energie, max. 3 bei Beat oder hoher Energie)
  let numTiles = 1;
  if (energy > 0.08 || beatDetected) numTiles = 2;
  if (energy > 0.15 || (beatDetected && glitchLevel > 0)) numTiles = 3;

  // Wähle zufällige, aber stabile Positionen (z.B. per Seed aus Energie/Beat)
  const seed = Math.floor((energy * 1000) + (beatDetected ? 100 : 0) + (glitchLevel * 10));
  const stablePositions = [...positions].sort((a, b) => {
    // Einfache Pseudozufallsfunktion
    const aVal = ((a.x + 1) * (a.y + 1) * seed) % 1000;
    const bVal = ((b.x + 1) * (b.y + 1) * seed) % 1000;
    return aVal - bVal;
  });
  const selectedPositions = stablePositions.slice(0, numTiles);

  // Dezente Farben: Wähle aus accentColors, aber mische mit Basisfarbe für weniger Sättigung
  for (const pos of selectedPositions) {
    const accent = accentColors[Math.floor(Math.random() * accentColors.length)];
    // Mische mit Basisfarbe (z.B. 60% Basis, 40% Akzent)
    const base = baseColors[Math.floor(Math.random() * baseColors.length)];
    const color = mixColors(base, accent, 0.4); // 0.4 = 40% Akzent, 60% Basis
    coloredTiles.push({ x: pos.x, y: pos.y, color });
  }

  return coloredTiles;
}

// Hilfsfunktion zum Mischen zweier Hex-Farben
function mixColors(hex1: string, hex2: string, ratio: number): string {
  // ratio: Anteil von hex2
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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