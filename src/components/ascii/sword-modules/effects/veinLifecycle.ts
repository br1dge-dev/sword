import type { ColoredVein } from '../types/swordTypes';

export type VeinMapValue = { vein: ColoredVein; birth: number };

export function replaceVeinsInMap(
  map: Map<string, VeinMapValue>,
  veins: ColoredVein[],
  birthMs: number,
): void {
  map.clear();
  veins.forEach((vein) => {
    const key = `${vein.x}-${vein.y}`;
    map.set(key, { vein, birth: birthMs });
  });
}

export function mapToVeins(map: Map<string, VeinMapValue>): ColoredVein[] {
  return Array.from(map.values()).map((v) => v.vein);
}

export function computeBeatVeinLifetimeMs(energy: number, beatDetected: boolean): number {
  // OPTIMIERT: Längere Lebensdauer für Beat-Veins (4-10 Sekunden)
  return beatDetected ? 4000 : Math.max(4000, Math.min(10000, Math.floor(energy * 12000)));
}

export function pruneVeinsByLifetime(
  map: Map<string, VeinMapValue>,
  nowMs: number,
  lifetimeMs: number,
): boolean {
  let changed = false;
  Array.from(map.entries()).forEach(([key, value]) => {
    if (nowMs - value.birth > lifetimeMs) {
      map.delete(key);
      changed = true;
    }
  });
  return changed;
}


