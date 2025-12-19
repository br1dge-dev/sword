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
      vibrationChance = 0.12 + (energy * 0.24); // erhöht von 0.1+0.2
      glitchChance = 0.06; // erhöht von 0.05
      colorChance = 0.096; // erhöht von 0.08
      rotationChance = 0.18; // erhöht von 0.15
      patternSwapChance = 0.024; // erhöht von 0.02
      break;

    case 2:
      // CHARGE LVL2: Stärkere Vibrationen, stärkerer Glow (um 20% erhöht)
      vibrationChance = 0.36 + (energy * 0.48); // erhöht von 0.3+0.4
      glitchChance = 0.18; // erhöht von 0.15
      colorChance = 0.3; // erhöht von 0.25
      rotationChance = 0.3; // erhöht von 0.25
      patternSwapChance = 0.096; // erhöht von 0.08
      break;

    case 3:
      // CHARGE LVL3: Von allem noch mehr (um 20% erhöht)
      vibrationChance = 0.6 + (energy * 0.72); // erhöht von 0.5+0.6
      glitchChance = 0.36; // erhöht von 0.3
      colorChance = 0.48; // erhöht von 0.4
      rotationChance = 0.48; // erhöht von 0.4
      patternSwapChance = 0.18; // erhöht von 0.15
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
  const energyMultiplier = 1 + (energy * 1.5);

  // Effektive Chancen mit Energie-Multiplikator
  const effectiveVibrationChance = Math.min(0.8, vibrationChance * energyMultiplier);
  const effectiveGlitchChance = Math.min(0.7, glitchChance * energyMultiplier);
  const effectiveColorChance = Math.min(0.7, colorChance * energyMultiplier);
  const effectiveRotationChance = Math.min(0.6, rotationChance * energyMultiplier);
  const effectivePatternSwapChance = Math.min(0.3, patternSwapChance * energyMultiplier);

  edgePositions.forEach((pos) => {
    // VIBRATION (reaktiv auf Musik-Intensität)
    if (Math.random() < effectiveVibrationChance) {
      const intensity = energy * (chargeLevel * 0.5 + 0.5); // Stärkere Vibration bei höherem Level
      const offsetX = (Math.random() - 0.5) * intensity * 2;
      const offsetY = (Math.random() - 0.5) * intensity * 2;

      effects.push({
        x: pos.x,
        y: pos.y,
        offset: { x: offsetX, y: offsetY },
      });
    }

    // ROTATION (dünne Linien drehen sich)
    if (Math.random() < effectiveRotationChance) {
      const rotationAngle = (Math.random() - 0.5) * 30; // ±15 Grad Rotation
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
  const cleanupMs = beatDetected ? 250 : Math.max(200, Math.min(300, Math.floor(energy * 150)));

  return { effects, cleanupMs };
}


