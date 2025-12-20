import type { ColoredVein } from '../types/swordTypes';
import { accentColors } from '../constants/swordConstants';

export type OrganicPatch = {
  x: number;
  y: number;
  color: string;
  radius: number;
  targetRadius: number;
  wobble: number;
};

export type OrganicPatchState = {
  patches: OrganicPatch[];
  lastSpawnMs: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(prev: number, target: number, amount01: number) {
  return prev + (target - prev) * clamp(amount01, 0, 1);
}

function randInt(min: number, maxInclusive: number) {
  return Math.floor(min + Math.random() * (maxInclusive - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function withinBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export type OrganicPatchTickInput = {
  nowMs: number;
  width: number;
  height: number;
  /** 0..1 (smoothed) */
  energy: number;
  /** 0..1 (smoothed onset proxy) */
  onset: number;
  /** 0..1 (smoothed beat strength) */
  beat: number;
  /** raw beat boolean (for “events”) */
  beatDetected: boolean;
  /** stable "monochrome scaffold" positions to tint */
  baseVeinPositions: Array<{ x: number; y: number }>;
  /** hard cap per tick for performance */
  maxEmits: number;
};

export type OrganicPatchTickOutput = {
  state: OrganicPatchState;
  emitted: ColoredVein[];
};

export function createOrganicPatchState(): OrganicPatchState {
  return { patches: [], lastSpawnMs: 0 };
}

export function tickOrganicPatches(
  state: OrganicPatchState,
  input: OrganicPatchTickInput,
): OrganicPatchTickOutput {
  const { nowMs, width, height, energy, onset, beat, beatDetected, baseVeinPositions } = input;
  const maxEmits = Math.max(0, input.maxEmits | 0);

  // Ensure a few persistent patches exist.
  const desired = clamp(Math.floor(2 + energy * 4), 2, 6);
  const spawnCooldown = 1100;
  let patches = state.patches.slice();

  if (patches.length < desired && nowMs - state.lastSpawnMs > spawnCooldown) {
    const p: OrganicPatch = {
      x: randInt(0, Math.max(0, width - 1)),
      y: randInt(0, Math.max(0, height - 1)),
      color: pick(accentColors),
      radius: 8,
      targetRadius: 14,
      wobble: Math.random() * Math.PI * 2,
    };
    patches.push(p);
    state.lastSpawnMs = nowMs;
  }

  // Music-reactive size: expand on beat/onset; breathe on energy.
  const beatKick = beatDetected ? 1 : 0;
  const intensity = clamp(0.15 + energy * 0.9 + onset * 1.2 + beat * 0.9, 0, 1.8);
  const emitted: ColoredVein[] = [];

  // Emit helper: tint a few nearby "monochrome" veins, plus a small random walk for organic bleed.
  const emitFrom = (cx: number, cy: number, color: string, radius: number, count: number) => {
    const r2 = radius * radius;
    let attempts = 0;
    while (emitted.length < maxEmits && count > 0 && attempts < count * 10) {
      attempts++;
      // Prefer tinting existing base veins so it feels like “neighbors get colored”
      let x: number;
      let y: number;
      if (baseVeinPositions.length && Math.random() < 0.85) {
        const seed = baseVeinPositions[Math.floor(Math.random() * baseVeinPositions.length)];
        x = seed.x;
        y = seed.y;
      } else {
        x = randInt(0, Math.max(0, width - 1));
        y = randInt(0, Math.max(0, height - 1));
      }
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;

      // “Particle” itself
      emitted.push({ x, y, color });
      count--;

      // Organic bleed: 1-3 step random walk to neighbor tiles
      const steps = 1 + randInt(0, 2);
      let wx = x;
      let wy = y;
      for (let s = 0; s < steps && emitted.length < maxEmits; s++) {
        const dir = randInt(0, 3);
        if (dir === 0) wx++;
        if (dir === 1) wx--;
        if (dir === 2) wy++;
        if (dir === 3) wy--;
        if (!withinBounds(wx, wy, width, height)) break;
        emitted.push({ x: wx, y: wy, color });
      }
    }
  };

  // Update patches
  patches = patches.map((p, idx) => {
    const wobble = p.wobble + 0.06 + energy * 0.08;
    const breath = 0.6 + Math.sin(nowMs / (850 + idx * 120) + wobble) * 0.25;

    // Expand targets under “intense passages”
    const baseTarget = 10 + idx * 2;
    const targetRadius = clamp(baseTarget + intensity * 18 * breath + beatKick * 10, 8, 42);
    const radius = smooth(p.radius, targetRadius, 0.08 + energy * 0.12);

    // Occasional hue shift on strong events
    const color = (beatDetected && Math.random() < 0.25) || (onset > 0.22 && Math.random() < 0.12)
      ? pick(accentColors)
      : p.color;

    // Emit rate: more when strong, but capped.
    const emitCount = Math.floor(6 + intensity * 26);
    emitFrom(p.x, p.y, color, radius, emitCount);

    // Slow drift (keeps it “alive” without teleport spam)
    let nx = p.x;
    let ny = p.y;
    if (Math.random() < 0.04 + energy * 0.08) {
      nx += randInt(-2, 2);
      ny += randInt(-2, 2);
    }
    nx = clamp(nx, 0, Math.max(0, width - 1));
    ny = clamp(ny, 0, Math.max(0, height - 1));

    return { ...p, x: nx, y: ny, wobble, color, targetRadius, radius };
  });

  // Keep patch count bounded
  if (patches.length > 7) patches = patches.slice(patches.length - 7);

  return {
    state: { patches, lastSpawnMs: state.lastSpawnMs },
    emitted,
  };
}


