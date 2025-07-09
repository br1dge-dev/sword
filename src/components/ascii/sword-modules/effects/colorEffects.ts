/**
 * colorEffects.ts
 * 
 * Funktionen zur Generierung von Farbeffekten für die ASCII-Schwert-Komponente
 * Überarbeitet für bessere Musik-Reaktivität und dynamische Skalierung
 */
import { baseColors, accentColors } from '../constants/swordConstants';
import { SwordPosition } from '../types/swordTypes';

// Konfiguration für Farbeffekte (kann vom Modal überschrieben werden)
export interface ColorEffectConfig {
  baseIntensity: number;      // Basis-Intensität der Farben (0-1)
  energyMultiplier: number;   // Wie stark die Energie die Intensität beeinflusst
  beatBoost: number;          // Multiplikator für die Intensität bei Beat
  pulseSpeed: number;         // Geschwindigkeit der Farbpulsation (1-10)
  colorShift: boolean;        // Ob Farben bei höherer Energie wechseln sollen
  hueShift: number;           // Stärke der Farbverschiebung (0-1)
}

// Standard-Konfiguration
export const defaultColorConfig: ColorEffectConfig = {
  baseIntensity: 0.6,
  energyMultiplier: 2.0,
  beatBoost: 1.5,
  pulseSpeed: 3,
  colorShift: true,
  hueShift: 0.3
};

/**
 * Berechnet eine pulsierende Farbe basierend auf der Basis-Farbe und Audio-Energie
 * @param baseColor Basis-Farbe als Hex-String
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param config Optionale Konfiguration für Farbeffekte
 * @returns Neue Farbe als Hex-String
 */
export function calculatePulsingColor(
  baseColor: string,
  energy: number,
  beatDetected: boolean,
  config: Partial<ColorEffectConfig> = {}
): string {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: ColorEffectConfig = {
    ...defaultColorConfig,
    ...config
  };
  
  // Konvertiere Hex zu RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Berechne Intensitäts-Faktor basierend auf Energie und Beat
  let intensity = effectiveConfig.baseIntensity + (energy * effectiveConfig.energyMultiplier);
  
  // Boost bei Beat-Erkennung
  if (beatDetected) {
    intensity *= effectiveConfig.beatBoost;
  }
  
  // Pulsation basierend auf Zeit
  const pulseFrequency = effectiveConfig.pulseSpeed * 0.1;
  const pulseFactor = Math.sin(Date.now() * pulseFrequency * 0.001) * 0.2 + 0.8;
  
  // Kombiniere alle Faktoren
  intensity = Math.min(1.5, intensity * pulseFactor); // Cap bei 1.5 (150%)
  
  // Berechne neue RGB-Werte
  let newR = Math.min(255, Math.floor(r * intensity));
  let newG = Math.min(255, Math.floor(g * intensity));
  let newB = Math.min(255, Math.floor(b * intensity));
  
  // Farbverschiebung bei höherer Energie, wenn aktiviert
  if (effectiveConfig.colorShift && energy > 0.6) {
    // Verschiebe Farben basierend auf Energie und Beat
    const hueShift = effectiveConfig.hueShift * energy * (beatDetected ? 2 : 1);
    
    // RGB zu HSL konvertieren, Hue verschieben, zurück zu RGB
    const [h, s, l] = rgbToHsl(newR, newG, newB);
    const newHue = (h + hueShift) % 1.0;
    const [shiftedR, shiftedG, shiftedB] = hslToRgb(newHue, s, l);
    
    newR = shiftedR;
    newG = shiftedG;
    newB = shiftedB;
  }
  
  // Konvertiere zurück zu Hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Wählt eine Farbe aus der Farbpalette basierend auf Energie und Beat
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param palette Farbpalette (baseColors oder accentColors)
 * @returns Ausgewählte Farbe
 */
export function selectDynamicColor(
  energy: number,
  beatDetected: boolean,
  palette: string[] = accentColors
): string {
  // Bei höherer Energie: hellere/intensivere Farben wählen
  const energyFactor = Math.pow(energy, 1.5); // Exponentiell für natürlichere Skalierung
  
  // Sortiere Farben nach Helligkeit/Sättigung
  const sortedColors = [...palette].sort((a, b) => {
    const [, sa, la] = hexToHsl(a);
    const [, sb, lb] = hexToHsl(b);
    
    // Hellere und gesättigtere Farben bevorzugen
    const scoreA = sa * 0.7 + la * 0.3;
    const scoreB = sb * 0.7 + lb * 0.3;
    
    return scoreB - scoreA; // Absteigend sortieren
  });
  
  // Wähle Farbe basierend auf Energie
  const index = Math.min(
    sortedColors.length - 1,
    Math.floor(energyFactor * sortedColors.length)
  );
  
  // Bei Beat: Bevorzuge hellere Farben
  if (beatDetected) {
    return sortedColors[Math.max(0, Math.min(index - 2, sortedColors.length - 1))];
  }
  
  return sortedColors[index];
}

/**
 * Generiert einen dynamischen Farbverlauf basierend auf Energie und Beat
 * @param numColors Anzahl der Farben im Verlauf
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @returns Array mit Farben für den Verlauf
 */
export function generateDynamicGradient(
  numColors: number,
  energy: number,
  beatDetected: boolean
): string[] {
  // Wähle Basis-Farben für den Verlauf
  const startColor = selectDynamicColor(energy, beatDetected, baseColors);
  let endColor = selectDynamicColor(energy, beatDetected, accentColors);
  
  // Bei Beat: kontrastreichere Farben
  if (beatDetected) {
    // Wähle eine komplementäre Farbe für mehr Kontrast
    const [h, s, l] = hexToHsl(startColor);
    const complementaryHue = (h + 0.5) % 1.0;
    endColor = hslToHex(complementaryHue, Math.min(1, s * 1.2), Math.min(1, l * 1.2));
  }
  
  // Generiere Farbverlauf zwischen Start- und Endfarbe
  return interpolateColors(startColor, endColor, numColors);
}

/**
 * Berechnet dynamische Farbwerte für das Schwert basierend auf Musik-Intensität
 * @param positions Array von Schwertpositionen
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param config Optionale Konfiguration für Farbeffekte
 * @returns Objekt mit Basis- und Akzentfarben
 */
export function calculateDynamicColors(
  positions: Array<SwordPosition>,
  energy: number,
  beatDetected: boolean,
  config: Partial<ColorEffectConfig> = {}
): {baseColor: string, accentColor: string, edgeColor: string} {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: ColorEffectConfig = {
    ...defaultColorConfig,
    ...config
  };
  
  // Wähle Basis-Farbe
  const baseColorIndex = Math.floor(energy * baseColors.length * 0.8);
  const baseColor = baseColors[Math.min(baseColorIndex, baseColors.length - 1)];
  
  // Wähle Akzent-Farbe
  const accentColorIndex = Math.floor((energy * 0.8 + 0.2) * accentColors.length);
  const accentColor = accentColors[Math.min(accentColorIndex, accentColors.length - 1)];
  
  // Berechne pulsierende Farbe für Kanten
  const edgeColor = calculatePulsingColor(
    beatDetected ? accentColor : baseColor,
    energy,
    beatDetected,
    config
  );
  
  return {
    baseColor,
    accentColor,
    edgeColor
  };
}

// ===== HILFSFUNKTIONEN FÜR FARBBERECHNUNGEN =====

/**
 * Konvertiert RGB zu HSL
 * @param r Rot (0-255)
 * @param g Grün (0-255)
 * @param b Blau (0-255)
 * @returns [h, s, l] Array mit HSL-Werten (0-1)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
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
  
  return [h, s, l];
}

/**
 * Konvertiert HSL zu RGB
 * @param h Farbton (0-1)
 * @param s Sättigung (0-1)
 * @param l Helligkeit (0-1)
 * @returns [r, g, b] Array mit RGB-Werten (0-255)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // Graustufe
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

/**
 * Konvertiert Hex-Farbe zu HSL
 * @param hex Hex-Farbcode
 * @returns [h, s, l] Array mit HSL-Werten (0-1)
 */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  return rgbToHsl(r * 255, g * 255, b * 255);
}

/**
 * Konvertiert HSL zu Hex-Farbe
 * @param h Farbton (0-1)
 * @param s Sättigung (0-1)
 * @param l Helligkeit (0-1)
 * @returns Hex-Farbcode
 */
function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpoliert zwischen zwei Farben
 * @param color1 Erste Farbe als Hex-String
 * @param color2 Zweite Farbe als Hex-String
 * @param steps Anzahl der Zwischenschritte
 * @returns Array mit interpolierten Farben
 */
function interpolateColors(color1: string, color2: string, steps: number): string[] {
  const [h1, s1, l1] = hexToHsl(color1);
  const [h2, s2, l2] = hexToHsl(color2);
  
  const result: string[] = [];
  
  // Kürzester Weg für Hue finden (über 0 oder 1)
  let hDiff = h2 - h1;
  if (Math.abs(hDiff) > 0.5) {
    if (hDiff > 0) {
      hDiff = hDiff - 1;
    } else {
      hDiff = hDiff + 1;
    }
  }
  
  for (let i = 0; i < steps; i++) {
    const factor = i / (steps - 1);
    
    // Interpoliere HSL-Werte
    let h = h1 + hDiff * factor;
    if (h < 0) h += 1;
    if (h > 1) h -= 1;
    
    const s = s1 + (s2 - s1) * factor;
    const l = l1 + (l2 - l1) * factor;
    
    // Konvertiere zurück zu Hex
    result.push(hslToHex(h, s, l));
  }
  
  return result;
} 