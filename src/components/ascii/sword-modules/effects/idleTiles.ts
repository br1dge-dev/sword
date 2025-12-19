import type { ColoredTile, SwordPosition } from '../types/swordTypes';
import { accentColors } from '../constants/swordConstants';

export function getIdleTilesForIndex(swordPositions: SwordPosition[], colorIndex: number): ColoredTile[] {
  const safeIndex =
    Number.isFinite(colorIndex) && accentColors.length > 0
      ? ((colorIndex % accentColors.length) + accentColors.length) % accentColors.length
      : 0;

  const color = accentColors[safeIndex] ?? '#00FCA6';
  return swordPositions.map((pos) => ({ ...pos, color }));
}

export function nextIdleTilesColorIndex(prevIndex: number): number {
  if (!accentColors.length) return 0;
  const safePrev = Number.isFinite(prevIndex) ? prevIndex : 0;
  return (safePrev + 1) % accentColors.length;
}


