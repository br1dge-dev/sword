import type { EdgePosition, Point } from '../types/swordTypes';
import { accentColors, edgeGlitchChars } from '../constants/swordConstants';

export type EdgeEffectRender = Point & {
  char?: string;
  color?: string;
  offset?: Point;
  rotation?: number;
};

type GenerateReactiveEdgeEffectsOptions = {
  edgePositions: EdgePosition[];
  chargeLevel: number;
  energy: number;
  beatDetected: boolean;
};

export function generateReactiveEdgeEffects({
  edgePositions,
  chargeLevel,
  energy,
  beatDetected,
}: GenerateReactiveEdgeEffectsOptions): { effects: EdgeEffectRender[]; cleanupMs: number } {
  const effects: EdgeEffectRender[] = [];

  // CHARGE-LEVEL BASIERTE EFFEKTE (um 20% erhöht)
  let vibrationChance: number, glitchChance: number, colorChance: number, rotationChance: number, patternSwapChance: number;

  switch (chargeLevel) {
    case 1:
      // CHARGE LVL1: Dünne Außenlinien, minimal vibrieren, selten Pattern-Tausch (um 20% erhöht)
      vibrationChance = 0.08 + (energy * 0.16);
      glitchChance = 0.04;
      colorChance = 0.07;
      rotationChance = 0.11;
      patternSwapChance = 0.016;
      break;

    case 2:
      // CHARGE LVL2: Stärkere Vibrationen, stärkerer Glow (um 20% erhöht)
      // Keep close to “current good”
      vibrationChance = 0.36 + (energy * 0.48);
      glitchChance = 0.18;
      colorChance = 0.3;
      rotationChance = 0.3;
      patternSwapChance = 0.096;
      break;

    case 3:
      // CHARGE LVL3: Von allem noch mehr (um 20% erhöht)
      vibrationChance = 0.72 + (energy * 0.92);
      glitchChance = 0.55;
      colorChance = 0.72;
      rotationChance = 0.62;
      patternSwapChance = 0.26;
      break;

    default:
      // Fallback für Level 0 oder undefined (um 20% erhöht)
      vibrationChance = 0.06;
      glitchChance = 0.024;
      colorChance = 0.06;
      rotationChance = 0.06;
      patternSwapChance = 0.012;
  }

  // Energie-Multiplikator für reaktive Intensität
  const energyMultiplier = 1 + (energy * 1.7);

  // Effektive Chancen mit Energie-Multiplikator
  const vibrationCap = chargeLevel >= 3 ? 0.95 : 0.8;
  const glitchCap = chargeLevel >= 3 ? 0.92 : 0.7;
  const colorCap = chargeLevel >= 3 ? 0.92 : 0.7;
  const rotationCap = chargeLevel >= 3 ? 0.82 : 0.6;
  const swapCap = chargeLevel >= 3 ? 0.55 : 0.3;

  const effectiveVibrationChance = Math.min(vibrationCap, vibrationChance * energyMultiplier);
  const effectiveGlitchChance = Math.min(glitchCap, glitchChance * energyMultiplier);
  const effectiveColorChance = Math.min(colorCap, colorChance * energyMultiplier);
  const effectiveRotationChance = Math.min(rotationCap, rotationChance * energyMultiplier);
  const effectivePatternSwapChance = Math.min(swapCap, patternSwapChance * energyMultiplier);

  edgePositions.forEach((pos) => {
    // VIBRATION (reaktiv auf Musik-Intensität)
    if (Math.random() < effectiveVibrationChance) {
      const intensity = energy * (chargeLevel * 0.65 + 0.45);
      const amp = chargeLevel >= 3 ? 3.2 : 2.0;
      const offsetX = (Math.random() - 0.5) * intensity * amp;
      const offsetY = (Math.random() - 0.5) * intensity * amp;

      effects.push({
        x: pos.x,
        y: pos.y,
        offset: { x: offsetX, y: offsetY },
      });
    }

    // ROTATION (dünne Linien drehen sich)
    if (Math.random() < effectiveRotationChance) {
      const maxDeg = chargeLevel >= 3 ? 46 : 30;
      const rotationAngle = (Math.random() - 0.5) * maxDeg;
      effects.push({
        x: pos.x,
        y: pos.y,
        rotation: rotationAngle,
      });
    }

    // GLITCH-ZEICHEN
    if (Math.random() < effectiveGlitchChance) {
      const glitchChars = edgeGlitchChars[chargeLevel as keyof typeof edgeGlitchChars] || edgeGlitchChars[1];
      const glitchCharSet = Math.floor(Math.random() * glitchChars.length);
      const glitchChar = glitchChars[glitchCharSet];

      effects.push({
        x: pos.x,
        y: pos.y,
        char: glitchChar,
      });
    }

    // FARB-EFFEKTE
    if (Math.random() < effectiveColorChance) {
      const colorIndex = Math.floor(Math.random() * accentColors.length);
      const edgeColor = accentColors[colorIndex];

      effects.push({
        x: pos.x,
        y: pos.y,
        color: edgeColor,
      });
    }

    // PATTERN-SWAP (mit Hintergrund-Elementen tauschen)
    if (Math.random() < effectivePatternSwapChance) {
      const backgroundChars = ['░', '▒', '▓', '█', '▄', '▀', '▌', '▐'];
      const randomBgChar = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];

      effects.push({
        x: pos.x,
        y: pos.y,
        char: randomBgChar,
      });
    }
  });

  // Cleanup für Edge-Effekte - Längere Dauer für sanftere Übergänge
  const baseCleanup = beatDetected ? 250 : Math.max(200, Math.min(300, Math.floor(energy * 150)));
  const cleanupMs = chargeLevel >= 3 ? Math.floor(baseCleanup * 1.25) : baseCleanup;

  // L3 “charge burst”: on beat, add an extra edge-wide color pulse (very impactful).
  if (chargeLevel >= 3 && beatDetected && edgePositions.length > 0) {
    const pulseColor = accentColors[Math.floor(Math.random() * accentColors.length)];
    const step = energy > 0.45 ? 1 : 2; // denser when loud
    for (let i = 0; i < edgePositions.length; i += step) {
      const p = edgePositions[i];
      effects.push({ x: p.x, y: p.y, color: pulseColor });
    }
  }

  return { effects, cleanupMs };
}


