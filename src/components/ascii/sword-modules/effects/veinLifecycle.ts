import type { ColoredVein } from '../types/swordTypes';

export type VeinMapValue = { vein: ColoredVein; birth: number };

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  // hex
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    if (color.length === 4) {
      const r = parseInt(color[1] + color[1], 16);
      const g = parseInt(color[2] + color[2], 16);
      const b = parseInt(color[3] + color[3], 16);
      return { r, g, b };
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return { r, g, b };
  }
  // rgb(...)
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  // rgba(...)
  const m2 = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i);
  if (m2) return { r: Number(m2[1]), g: Number(m2[2]), b: Number(m2[3]) };
  return null;
}

function withAlpha(color: string, alpha01: number) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return color; // fallback
  const a = clamp01(alpha01);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a.toFixed(3)})`;
}

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

export function upsertVeinsInMap(
  map: Map<string, VeinMapValue>,
  veins: ColoredVein[],
  birthMs: number,
): void {
  veins.forEach((vein) => {
    const key = `${vein.x}-${vein.y}`;
    map.set(key, { vein, birth: birthMs });
  });
}

export function mapToVeins(map: Map<string, VeinMapValue>): ColoredVein[] {
  return Array.from(map.values()).map((v) => v.vein);
}

export function mapToVeinsWithFade(
  map: Map<string, VeinMapValue>,
  nowMs: number,
  lifetimeMs: number,
  fadeMs: number,
): ColoredVein[] {
  const out: ColoredVein[] = [];
  const hardExpire = Math.max(0, lifetimeMs) + Math.max(0, fadeMs);
  map.forEach((value) => {
    const age = nowMs - value.birth;
    if (age < 0) return;
    if (age > hardExpire) return;
    let alpha = 1;
    if (fadeMs > 0 && age > lifetimeMs) {
      const t = (age - lifetimeMs) / fadeMs;
      // smooth-ish fade (less linear “flashy”)
      alpha = 1 - clamp01(t);
      alpha = alpha * alpha;
    }
    out.push({ ...value.vein, color: withAlpha(value.vein.color, alpha) });
  });
  return out;
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

export function pruneVeinsByLifetimeWithFade(
  map: Map<string, VeinMapValue>,
  nowMs: number,
  lifetimeMs: number,
  fadeMs: number,
): boolean {
  const hardExpire = Math.max(0, lifetimeMs) + Math.max(0, fadeMs);
  let changed = false;
  Array.from(map.entries()).forEach(([key, value]) => {
    if (nowMs - value.birth > hardExpire) {
      map.delete(key);
      changed = true;
    }
  });
  return changed;
}


