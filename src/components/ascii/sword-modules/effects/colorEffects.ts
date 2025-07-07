/**
 * colorEffects.ts
 * 
 * Funktionen zur Generierung von Farbeffekten für die ASCII-Schwert-Komponente
 */
import { baseColors, accentColors } from '../constants/swordConstants';
import { getComplementaryColor } from '../utils/swordUtils';

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