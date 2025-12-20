import type { ColoredVein } from '../types/swordTypes';
import { accentColors } from '../constants/swordConstants';

export type OrganicPatch = {
  x: number;
  y: number;
  color: string;
  radius: number;
  targetRadius: number;
  wobble: number;
  vx: number;
  vy: number;
};

export type OrganicPatchState = {
  patches: OrganicPatch[];
  lastSpawnMs: number;
  spawnIndex: number;
  // Macro “flow field” mode blending (prevents hard pattern switches)
  macroMode: number;
  nextMacroMode: number;
  macroBlend01: number;
  macroLastSwapMs: number;
  lastNowMs: number;
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
  return {
    patches: [],
    lastSpawnMs: 0,
    spawnIndex: 0,
    macroMode: 0,
    nextMacroMode: 1,
    macroBlend01: 1,
    macroLastSwapMs: 0,
    lastNowMs: 0,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function vecLerp(ax: number, ay: number, bx: number, by: number, t: number) {
  const tt = clamp(t, 0, 1);
  return { x: ax + (bx - ax) * tt, y: ay + (by - ay) * tt };
}

function norm(x: number, y: number) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function spawnPositionStratified(width: number, height: number, index: number) {
  // Jittered grid -> avoids “hotspots” and keeps patches spread across the whole field.
  const cols = width >= 180 ? 5 : 4;
  const rows = height >= 120 ? 4 : 3;
  const cell = index % (cols * rows);
  const cx = cell % cols;
  const cy = Math.floor(cell / cols);
  const cellW = Math.max(1, Math.floor(width / cols));
  const cellH = Math.max(1, Math.floor(height / rows));
  const minX = cx * cellW;
  const minY = cy * cellH;
  const x = clamp(minX + randInt(0, cellW - 1), 0, Math.max(0, width - 1));
  const y = clamp(minY + randInt(0, cellH - 1), 0, Math.max(0, height - 1));
  return { x, y };
}

function flowVecForMode(
  mode: number,
  x: number,
  y: number,
  width: number,
  height: number,
  nowMs: number,
  wobble: number,
  energy: number,
  onset: number,
  beat: number,
) {
  const cx = width * 0.5;
  const cy = height * 0.5;
  const dx = x - cx;
  const dy = y - cy;
  const n = norm(dx, dy);
  const phase = nowMs / 1000;

  // NOTE: Keep these gentle; “sync” comes from beat/onset modulation, not raw speed.
  switch (mode % 5) {
    case 0: {
      // Breathing drift (subtle)
      const a = Math.sin(phase * (0.7 + energy * 0.6) + wobble);
      const b = Math.cos(phase * (0.6 + energy * 0.5) + wobble * 1.3);
      return norm(a, b);
    }
    case 1: {
      // Swirl (perpendicular to center vector)
      const swirl = 0.35 + energy * 0.8 + beat * 0.9;
      return norm(-n.y * swirl + Math.sin(phase + wobble) * 0.2, n.x * swirl + Math.cos(phase + wobble) * 0.2);
    }
    case 2: {
      // Horizontal wave field
      const f = 0.055 + energy * 0.04;
      const a = Math.sin((y * f) + phase * (1.2 + beat * 1.0) + wobble);
      const b = Math.cos((x * f) + phase * (0.9 + onset * 2.0) + wobble);
      return norm(a, b * 0.75);
    }
    case 3: {
      // Vertical wave field
      const f = 0.06 + energy * 0.05;
      const a = Math.sin((x * f) + phase * (1.1 + beat * 1.1) + wobble);
      const b = Math.cos((y * f) + phase * (1.0 + onset * 2.2) + wobble);
      return norm(a * 0.75, b);
    }
    case 4: {
      // Radial “push” (stronger on beat)
      const push = 0.25 + beat * 1.2 + onset * 0.6;
      return norm(n.x * push + Math.sin(phase + wobble) * 0.15, n.y * push + Math.cos(phase + wobble) * 0.15);
    }
    default:
      return { x: 0, y: 0 };
  }
}

export function tickOrganicPatches(
  state: OrganicPatchState,
  input: OrganicPatchTickInput,
): OrganicPatchTickOutput {
  const { nowMs, width, height, energy, onset, beat, beatDetected, baseVeinPositions } = input;
  const maxEmits = Math.max(0, input.maxEmits | 0);
  const dtMs = state.lastNowMs ? Math.max(0, nowMs - state.lastNowMs) : 16;
  state.lastNowMs = nowMs;

  // --- Macro pattern blending (no hard cuts) ---
  const MACRO_SWAP_COOLDOWN_MS = 1500;
  const MACRO_BLEND_MS = 2600;
  const wantsSwap = beatDetected && (energy > 0.22 || onset > 0.04) && nowMs - state.macroLastSwapMs > MACRO_SWAP_COOLDOWN_MS;
  if (wantsSwap) {
    state.macroLastSwapMs = nowMs;
    state.macroMode = state.nextMacroMode;
    state.nextMacroMode = randInt(0, 4);
    state.macroBlend01 = 0;
  }
  if (state.macroBlend01 < 1) {
    state.macroBlend01 = clamp(state.macroBlend01 + dtMs / MACRO_BLEND_MS, 0, 1);
  }

  // Ensure a few persistent patches exist.
  const desired = clamp(Math.floor(3 + energy * 5), 3, 7);
  const spawnCooldown = 850;
  let patches = state.patches.slice();

  if (patches.length < desired && nowMs - state.lastSpawnMs > spawnCooldown) {
    const pos = spawnPositionStratified(width, height, state.spawnIndex++);
    const p: OrganicPatch = {
      x: pos.x,
      y: pos.y,
      color: pick(accentColors),
      radius: 8,
      targetRadius: 14,
      wobble: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
    };
    patches.push(p);
    state.lastSpawnMs = nowMs;
  }

  // Music-reactive size: expand on beat/onset; breathe on energy.
  const beatKick = beatDetected ? 1 : 0;
  const intensity = clamp(0.12 + energy * 1.1 + onset * 1.6 + beat * 1.25, 0, 2.2);
  const emitted: ColoredVein[] = [];

  // Emit helper: tint a few nearby "monochrome" veins, plus a small random walk for organic bleed.
  const emitFrom = (cx: number, cy: number, color: string, radius: number, count: number) => {
    const r2 = radius * radius;
    let attempts = 0;
    while (emitted.length < maxEmits && count > 0 && attempts < count * 10) {
      attempts++;
      // Prefer “local” picks near the patch center (avoids global hotspots).
      let x = clamp(cx + randInt(-Math.floor(radius), Math.floor(radius)), 0, Math.max(0, width - 1));
      let y = clamp(cy + randInt(-Math.floor(radius), Math.floor(radius)), 0, Math.max(0, height - 1));
      // Occasionally snap to a real base vein coordinate (feels like recoloring existing veins).
      if (baseVeinPositions.length && Math.random() < 0.35) {
        const seed = baseVeinPositions[Math.floor(Math.random() * baseVeinPositions.length)];
        x = seed.x;
        y = seed.y;
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
    const wobble = p.wobble + 0.05 + energy * 0.07;
    // Beat-synced breathing (more “in time” than free-running sin)
    const beatPhase = nowMs / (520 - energy * 140);
    const breath = 0.62 + Math.sin(beatPhase + wobble + idx * 0.7) * (0.18 + beat * 0.22);

    // Expand targets under “intense passages”
    const baseTarget = 10 + idx * 2;
    const targetRadius = clamp(baseTarget + intensity * 20 * breath + beatKick * 14, 10, 54);
    const radius = smooth(p.radius, targetRadius, 0.07 + energy * 0.14 + beat * 0.12);

    // Occasional hue shift on strong events
    const color = (beatDetected && Math.random() < 0.38) || (onset > 0.04 && Math.random() < 0.18)
      ? pick(accentColors)
      : p.color;

    // Emit rate: more when strong, but capped.
    // Tie “macro” emission to beat/onset pulses: low idle trickle, big kick on beat.
    const baseEmit = 4 + Math.floor(intensity * 8);
    const beatEmit = beatDetected ? Math.floor(26 + intensity * 24) : 0;
    const onsetEmit = onset > 0.035 ? Math.floor(10 + intensity * 14) : 0;
    const emitCount = clamp(baseEmit + beatEmit + onsetEmit, 0, 90);
    emitFrom(p.x, p.y, color, radius, emitCount);

    // Flow-field motion with blending between macro modes (“sickering” transitions).
    const a = flowVecForMode(state.macroMode, p.x, p.y, width, height, nowMs, wobble, energy, onset, beat);
    const b = flowVecForMode(state.nextMacroMode, p.x, p.y, width, height, nowMs, wobble, energy, onset, beat);
    const flow = vecLerp(a.x, a.y, b.x, b.y, state.macroBlend01);

    const speed = 0.25 + energy * 0.85 + beat * 0.9;
    const impulse = beatDetected ? (0.7 + beat * 0.6) : 0;

    // Smooth velocity to keep motion coherent
    const nvx = lerp(p.vx, flow.x * speed, 0.12 + energy * 0.08);
    const nvy = lerp(p.vy, flow.y * speed, 0.12 + energy * 0.08);

    let nx = p.x + nvx + flow.x * impulse;
    let ny = p.y + nvy + flow.y * impulse;

    // Gentle wrap-like clamp (prevents sticking at edges)
    if (nx < 0) nx = width - 1;
    if (ny < 0) ny = height - 1;
    if (nx >= width) nx = 0;
    if (ny >= height) ny = 0;

    return { ...p, x: Math.floor(nx), y: Math.floor(ny), vx: nvx, vy: nvy, wobble, color, targetRadius, radius };
  });

  // Keep patch count bounded
  if (patches.length > 7) patches = patches.slice(patches.length - 7);

  return {
    state: {
      patches,
      lastSpawnMs: state.lastSpawnMs,
      spawnIndex: state.spawnIndex,
      macroMode: state.macroMode,
      nextMacroMode: state.nextMacroMode,
      macroBlend01: state.macroBlend01,
      macroLastSwapMs: state.macroLastSwapMs,
      lastNowMs: state.lastNowMs,
    },
    emitted,
  };
}


