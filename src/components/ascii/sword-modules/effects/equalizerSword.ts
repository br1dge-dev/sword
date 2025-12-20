import type { SwordPosition } from '../types/swordTypes';
import { isEdgeChar, isHandlePosition, getLighterColor } from '../utils/swordUtils';

export type EqBar = {
  // 0..(barCount-1)
  index: number;
  // positions sorted bottom->top
  cells: Array<{ x: number; y: number }>;
};

export type EqGeometry = {
  barCount: number;
  bars: EqBar[];
};

export function buildEqualizerGeometry(
  centeredSwordLines: string[],
  swordPositions: SwordPosition[],
  barCount: number,
): EqGeometry {
  const positions = swordPositions.filter((p) => {
    const line = centeredSwordLines[p.y] ?? '';
    const ch = line[p.x] ?? ' ';
    if (ch === ' ') return false;
    // Prefer inner “fill” cells (exclude edges).
    if (isEdgeChar(ch)) return false;
    // Avoid handle area for the bar fill (keeps a cleaner blade-like EQ).
    if (isHandlePosition(p.x, p.y, centeredSwordLines)) return false;
    return true;
  });

  if (!positions.length || barCount <= 0) {
    return { barCount, bars: Array.from({ length: Math.max(0, barCount) }).map((_, i) => ({ index: i, cells: [] })) };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  const span = Math.max(1, maxX - minX + 1);

  const buckets: Array<Array<{ x: number; y: number }>> = Array.from({ length: barCount }, () => []);
  for (const p of positions) {
    const t = (p.x - minX) / span;
    const idx = Math.min(barCount - 1, Math.max(0, Math.floor(t * barCount)));
    buckets[idx].push({ x: p.x, y: p.y });
  }

  const bars: EqBar[] = buckets.map((cells, idx) => ({
    index: idx,
    cells: cells.sort((a, b) => b.y - a.y), // bottom->top (larger y is lower on screen)
  }));

  return { barCount, bars };
}

export type EqState = {
  // smoothed levels in [0..1]
  levels: number[];
  // peak heights in [0..1]
  peaks: number[];
};

export type EqConfig = {
  barCount: number;
  // ms
  attackMs: number;
  releaseMs: number;
  peakHoldMs: number;
  peakDecayPerSec: number;
  // frequency bin range selection
  minBin?: number;
  maxBin?: number;
};

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function smoothAR(prev: number, target: number, dtMs: number, attackMs: number, releaseMs: number) {
  const tau = target > prev ? attackMs : releaseMs;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / Math.max(1, tau));
  return prev + (target - prev) * alpha;
}

export function computeEqBands(
  frequencyData: Uint8Array,
  config: EqConfig,
): number[] {
  const n = config.barCount;
  if (!frequencyData.length || n <= 0) return Array.from({ length: n }, () => 0);

  const minBin = Math.max(0, config.minBin ?? 0);
  const maxBin = Math.min(frequencyData.length, config.maxBin ?? frequencyData.length);
  const span = Math.max(1, maxBin - minBin);

  const out = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) {
    const a = minBin + Math.floor((i / n) * span);
    const b = minBin + Math.floor(((i + 1) / n) * span);
    const end = Math.max(a + 1, b);
    let sum = 0;
    let count = 0;
    for (let k = a; k < end && k < maxBin; k++) {
      sum += frequencyData[k];
      count++;
    }
    out[i] = count ? clamp01((sum / count) / 255) : 0;
  }
  return out;
}

export function stepEqState(
  prev: EqState,
  rawLevels: number[],
  nowMs: number,
  lastMs: number,
  config: EqConfig,
  peakHoldUntilMs: number[],
): { state: EqState; peakHoldUntilMs: number[] } {
  const dt = lastMs ? nowMs - lastMs : 0;
  const n = config.barCount;

  const levels = prev.levels.length === n ? [...prev.levels] : Array.from({ length: n }, () => 0);
  const peaks = prev.peaks.length === n ? [...prev.peaks] : Array.from({ length: n }, () => 0);
  const holds = peakHoldUntilMs.length === n ? [...peakHoldUntilMs] : Array.from({ length: n }, () => 0);

  for (let i = 0; i < n; i++) {
    const raw = clamp01(rawLevels[i] ?? 0);
    levels[i] = clamp01(smoothAR(levels[i], raw, dt, config.attackMs, config.releaseMs));

    // peak hold + decay
    const lvl = levels[i];
    if (lvl >= peaks[i]) {
      peaks[i] = lvl;
      holds[i] = nowMs + config.peakHoldMs;
    } else {
      if (nowMs < holds[i]) {
        // hold
      } else if (dt > 0) {
        const decay = (config.peakDecayPerSec * dt) / 1000;
        peaks[i] = clamp01(peaks[i] - decay);
      }
    }
  }

  return { state: { levels, peaks }, peakHoldUntilMs: holds };
}

function eqColorForHeight(h01: number): string {
  // bottom green -> mid yellow -> top pink/red
  if (h01 < 0.55) return '#00FCA6';
  if (h01 < 0.80) return '#F8E16C';
  return '#FF3EC8';
}

export function renderEqTiles(
  geom: EqGeometry,
  state: EqState,
): Array<{ x: number; y: number; color: string }> {
  const out: Array<{ x: number; y: number; color: string }> = [];
  const n = geom.barCount;

  for (let i = 0; i < n; i++) {
    const bar = geom.bars[i];
    if (!bar?.cells?.length) continue;
    const cells = bar.cells;
    const height = Math.max(0, Math.min(cells.length, Math.floor((state.levels[i] ?? 0) * cells.length)));
    const peak = Math.max(0, Math.min(cells.length - 1, Math.floor((state.peaks[i] ?? 0) * cells.length)));

    // filled body
    for (let c = 0; c < height; c++) {
      const p = cells[c];
      const h01 = cells.length ? c / cells.length : 0;
      out.push({ x: p.x, y: p.y, color: eqColorForHeight(h01) });
    }

    // peak cap (one bright cell)
    const peakPos = cells[peak];
    if (peakPos) {
      out.push({ x: peakPos.x, y: peakPos.y, color: getLighterColor('#3EE6FF', 0.25) });
    }
  }

  return out;
}


