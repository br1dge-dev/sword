import { generateHarmonicColorPair } from './colorEffects';

export type ColorCycleResult = {
  swordColor: string;
  bgColor: string;
  newStability: number;
};

type AdaptiveColorCycleOptions = {
  energy: number;
  beatDetected: boolean;
  lastColorChangeTime: number;
  colorStability: number;
  nowMs: number;
};

export function computeAdaptiveColorCycle({
  energy,
  beatDetected,
  lastColorChangeTime,
  colorStability,
  nowMs,
}: AdaptiveColorCycleOptions): ColorCycleResult | null {
  // NEU: Adaptive Schwellenwerte basierend auf tatsächlichen Energy-Werten
  const adaptiveEnergyThreshold = 0.15; // Reduziert von 0.05 für bessere Reaktivität
  const adaptiveHighEnergyThreshold = 0.3; // Reduziert von 0.8 für realistische Werte

  if (!((energy > adaptiveEnergyThreshold || beatDetected) && (nowMs - lastColorChangeTime > colorStability))) {
    return null;
  }

  const { swordColor, bgColor } = generateHarmonicColorPair();

  // NEU: Adaptive Stabilität basierend auf realen Energy-Werten
  const newStability =
    energy > adaptiveHighEnergyThreshold
      ? Math.max(600, Math.floor(1200 - (energy * 200))) // 600-1200ms bei hoher Energy
      : Math.floor(1500 + Math.random() * 2000); // 1500-3500ms bei niedriger Energy

  return { swordColor, bgColor, newStability };
}

type OptimizedColorCycleOptions = {
  energy: number;
  beatDetected: boolean;
  lastColorChangeTime: number;
  colorStability: number;
  nowMs: number;
};

export function computeOptimizedColorCycle({
  energy,
  beatDetected,
  lastColorChangeTime,
  colorStability,
  nowMs,
}: OptimizedColorCycleOptions): ColorCycleResult | null {
  if (!((energy > 0.05 || beatDetected) && (nowMs - lastColorChangeTime > colorStability))) {
    return null;
  }

  const { swordColor, bgColor } = generateHarmonicColorPair();

  const newStability =
    energy > 0.8 // Erhöht von 0.7 auf 0.8 für längere Stabilität
      ? Math.max(800, Math.floor(1500 - (energy * 300))) // Erhöht von 500/1200 auf 800/1500
      : Math.floor(2000 + Math.random() * 2500); // Erhöht von 1500+2000 auf 2000+2500

  return { swordColor, bgColor, newStability };
}


