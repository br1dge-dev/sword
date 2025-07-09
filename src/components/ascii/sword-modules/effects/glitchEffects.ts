/**
 * glitchEffects.ts
 * 
 * Funktionen zur Generierung von Glitch-Effekten für die ASCII-Schwert-Komponente
 * Überarbeitet für bessere Musik-Reaktivität und dynamische Skalierung
 */
import { edgeGlitchChars, unicodeGlitchChars } from '../constants/swordConstants';
import { SwordPosition } from '../types/swordTypes';

// Konfiguration für Glitch-Effekte (kann vom Modal überschrieben werden)
export interface GlitchEffectConfig {
  minCount: number;           // Minimale Anzahl Glitches bei niedriger Energie
  maxPercent: number;         // Maximaler Prozentsatz der Positionen (0-1)
  energyCurve: number;        // Wie stark die Energie den Anstieg beeinflusst (1=linear, >1=exponentiell)
  beatBoost: number;          // Multiplikator für die Anzahl bei Beat
  duration: {
    min: number;              // Minimale Dauer in ms
    max: number;              // Maximale Dauer in ms
    energyMultiplier: number; // Wie stark die Energie die Dauer beeinflusst
  };
  glitchIntensity: number;    // Allgemeiner Intensitäts-Multiplikator (0-2)
}

// Standard-Konfiguration
export const defaultGlitchConfig: GlitchEffectConfig = {
  minCount: 1,
  maxPercent: 0.2,
  energyCurve: 1.5,
  beatBoost: 2.0,
  duration: {
    min: 80,
    max: 250,
    energyMultiplier: 1.5
  },
  glitchIntensity: 1.0
};

/**
 * Generiert DOS-Style Glitch-Effekte basierend auf Musik-Intensität
 * @param positions Array von Schwertpositionen
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param glitchLevel Aktuelles Glitch-Level (0-3)
 * @param config Optionale Konfiguration für Glitch-Effekte
 * @returns Array von Glitch-Positionen mit Zeichen
 */
export function generateGlitchChars(
  positions: Array<SwordPosition>,
  energy: number,
  beatDetected: boolean,
  glitchLevel: number,
  config: Partial<GlitchEffectConfig> = {}
): Array<{x: number, y: number, char: string}> {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: GlitchEffectConfig = {
    ...defaultGlitchConfig,
    ...config,
    duration: {
      ...defaultGlitchConfig.duration,
      ...(config.duration || {})
    }
  };
  
  // Leeres Array für Glitch-Effekte
  const glitchChars: Array<{x: number, y: number, char: string}> = [];
  
  // Wenn keine Positionen vorhanden sind, früh zurückkehren
  if (!positions.length) return glitchChars;
  
  // ===== BERECHNUNG DER ANZAHL DER GLITCHES =====
  
  // Berechne den Energie-Faktor mit exponentieller Kurve für natürlichere Skalierung
  const energyFactor = Math.pow(energy, effectiveConfig.energyCurve);
  
  // Berechne die Basis-Anzahl der Glitches basierend auf Energie
  // Bei niedriger Energie: minCount, bei hoher Energie: bis zu maxPercent der Gesamtpositionen
  const minGlitches = effectiveConfig.minCount;
  const maxGlitches = Math.floor(positions.length * effectiveConfig.maxPercent);
  let numGlitches = Math.floor(minGlitches + (maxGlitches - minGlitches) * energyFactor);
  
  // Boost bei Beat-Erkennung
  if (beatDetected) {
    numGlitches = Math.min(maxGlitches, Math.floor(numGlitches * effectiveConfig.beatBoost));
  }
  
  // Zusätzlicher Boost bei höherem Glitch-Level
  numGlitches += Math.floor(glitchLevel * positions.length * 0.03);
  
  // Globaler Intensitäts-Multiplikator
  numGlitches = Math.floor(numGlitches * effectiveConfig.glitchIntensity);
  
  // Stelle sicher, dass die Anzahl im gültigen Bereich liegt
  numGlitches = Math.max(minGlitches, Math.min(numGlitches, maxGlitches));
  
  // ===== AUSWAHL DER POSITIONEN =====
  
  // Wähle zufällige Positionen aus
  const selectedPositions = [...positions]
    .sort(() => Math.random() - 0.5)
    .slice(0, numGlitches);
  
  // Wähle für jede Position ein Glitch-Zeichen aus
  selectedPositions.forEach(pos => {
    // Wähle zufälliges Glitch-Zeichen basierend auf Energie und Glitch-Level
    // Höhere Energie und Glitch-Level = komplexere Glitches
    const glitchIndex = Math.min(3, Math.max(1, Math.floor(energy * 3))) as 1 | 2 | 3;
    const charSet = edgeGlitchChars[glitchIndex];
    const char = charSet[Math.floor(Math.random() * charSet.length)];
    
    // Füge Glitch hinzu
    glitchChars.push({
      x: pos.x,
      y: pos.y,
      char
    });
  });
  
  return glitchChars;
}

/**
 * Generiert Unicode-Glitch-Effekte basierend auf Musik-Intensität
 * @param positions Array von Schwertpositionen
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param glitchLevel Aktuelles Glitch-Level (0-3)
 * @param config Optionale Konfiguration für Glitch-Effekte
 * @returns Array von Unicode-Glitch-Positionen mit Zeichen
 */
export function generateUnicodeGlitches(
  positions: Array<SwordPosition>,
  energy: number,
  beatDetected: boolean,
  glitchLevel: number,
  config: Partial<GlitchEffectConfig> = {}
): Array<{x: number, y: number, char: string}> {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: GlitchEffectConfig = {
    ...defaultGlitchConfig,
    ...config,
    duration: {
      ...defaultGlitchConfig.duration,
      ...(config.duration || {})
    }
  };
  
  // Leeres Array für Unicode-Glitches
  const unicodeGlitches: Array<{x: number, y: number, char: string}> = [];
  
  // Wenn keine Positionen vorhanden sind, früh zurückkehren
  if (!positions.length) return unicodeGlitches;
  
  // ===== BERECHNUNG DER ANZAHL DER UNICODE-GLITCHES =====
  
  // Berechne den Energie-Faktor mit exponentieller Kurve für natürlichere Skalierung
  const energyFactor = Math.pow(energy, effectiveConfig.energyCurve);
  
  // Berechne die Basis-Anzahl der Unicode-Glitches basierend auf Energie
  // Bei niedriger Energie: minCount, bei hoher Energie: bis zu maxPercent der Gesamtpositionen
  const minGlitches = effectiveConfig.minCount;
  const maxGlitches = Math.floor(positions.length * effectiveConfig.maxPercent * 0.5); // Unicode-Glitches sind auffälliger, daher weniger
  let numGlitches = Math.floor(minGlitches + (maxGlitches - minGlitches) * energyFactor);
  
  // Boost bei Beat-Erkennung
  if (beatDetected) {
    numGlitches = Math.min(maxGlitches, Math.floor(numGlitches * effectiveConfig.beatBoost));
  }
  
  // Zusätzlicher Boost bei höherem Glitch-Level
  numGlitches += Math.floor(glitchLevel * 3);
  
  // Globaler Intensitäts-Multiplikator
  numGlitches = Math.floor(numGlitches * effectiveConfig.glitchIntensity);
  
  // Stelle sicher, dass die Anzahl im gültigen Bereich liegt
  numGlitches = Math.max(minGlitches, Math.min(numGlitches, maxGlitches));
  
  // ===== AUSWAHL DER POSITIONEN =====
  
  // Wähle zufällige Positionen aus
  const selectedPositions = [...positions]
    .sort(() => Math.random() - 0.5)
    .slice(0, numGlitches);
  
  // Wähle für jede Position ein Unicode-Glitch-Zeichen aus
  selectedPositions.forEach(pos => {
    // Wähle zufälliges Unicode-Glitch-Zeichen basierend auf Energie und Glitch-Level
    // Höhere Energie und Glitch-Level = komplexere Unicode-Glitches
    const unicodeLevel = Math.min(3, Math.max(1, Math.floor(glitchLevel + (energy * 2)))) as 1 | 2 | 3;
    
    const charSet = unicodeGlitchChars[unicodeLevel];
    const charIndex = Math.floor(Math.random() * charSet.length);
    const char = charSet[charIndex];
    
    // Füge Unicode-Glitch hinzu
    unicodeGlitches.push({
      x: pos.x,
      y: pos.y,
      char
    });
  });
  
  return unicodeGlitches;
}

/**
 * Berechnet die optimale Dauer für Glitch-Effekte basierend auf Energie und Beat
 * @param energy Aktuelle Audio-Energie (0-1)
 * @param beatDetected Ob ein Beat erkannt wurde
 * @param config Optionale Konfiguration für Glitch-Effekte
 * @returns Dauer in Millisekunden
 */
export function calculateGlitchDuration(
  energy: number,
  beatDetected: boolean,
  config: Partial<GlitchEffectConfig> = {}
): number {
  // Kombiniere Standard-Konfiguration mit übergebenen Werten
  const effectiveConfig: GlitchEffectConfig = {
    ...defaultGlitchConfig,
    ...config,
    duration: {
      ...defaultGlitchConfig.duration,
      ...(config.duration || {})
    }
  };
  
  // Berechne Dauer basierend auf Energie
  const minDuration = effectiveConfig.duration.min;
  const maxDuration = effectiveConfig.duration.max;
  const energyBoost = energy * effectiveConfig.duration.energyMultiplier;
  let duration = minDuration + (maxDuration - minDuration) * energyBoost;
  
  // Boost bei Beat-Erkennung
  if (beatDetected) {
    duration *= 1.2;
  }
  
  // Stelle sicher, dass die Dauer im gültigen Bereich liegt
  return Math.max(minDuration, Math.min(Math.floor(duration), maxDuration));
} 