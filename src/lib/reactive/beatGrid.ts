export type BeatGridConfig = {
  /**
   * Expected BPM range. Used to clamp estimates and reject outliers.
   */
  minBpm?: number;
  maxBpm?: number;
  /**
   * Beats per bar for downbeat detection (4 = common time).
   */
  beatsPerBar?: number;
  /**
   * How strongly to correct phase when we receive a beat hit (0..1).
   * Higher => snappier lock, but can jitter if detection is noisy.
   */
  phaseCorrection?: number;
  /**
   * How strongly to update BPM (0..1) from measured intervals.
   * Higher => adapts faster, but can wobble.
   */
  bpmCorrection?: number;
  /**
   * Maximum normalized phase error (0..0.5) for considering a hit "on-grid".
   * Example: 0.18 means ~18% of a beat early/late.
   */
  lockWindow01?: number;
};

export type BeatGridState = {
  bpm: number;
  phase01: number; // 0..1
  confidence01: number; // 0..1
  beatIndex: number; // increments on grid beats
  lastNowMs: number;
  lastHitMs: number;
  intervalEmaMs: number;
};

export type BeatGridInput = {
  nowMs: number;
  /**
   * Edge-triggered beat (a "hit") from the analyzer/beat detector.
   * This is used to correct the grid, but the grid can also run without hits.
   */
  beatHit: boolean;
};

export type BeatGridOutput = {
  bpm: number;
  phase01: number;
  confidence01: number;
  beatIndex: number;
  /**
   * Quantized grid beat. This is the event you want to drive rhythmic visuals with.
   */
  gridBeatEvent: boolean;
  /**
   * Downbeat (bar start). Useful for bigger events / macro changes.
   */
  downbeatEvent: boolean;
  /**
   * 0..1 phase within the bar.
   */
  barPhase01: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function wrap01(v: number) {
  // keep within [0,1)
  v = v % 1;
  if (v < 0) v += 1;
  return v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function phaseErrorSigned01(phase01: number) {
  // represent error relative to phase=0 as signed value in [-0.5, 0.5]
  return phase01 > 0.5 ? phase01 - 1 : phase01;
}

export function createBeatGridState(seedBpm = 120): BeatGridState {
  return {
    bpm: clamp(seedBpm, 60, 200),
    phase01: 0,
    confidence01: 0,
    beatIndex: 0,
    lastNowMs: 0,
    lastHitMs: -1,
    intervalEmaMs: 60000 / clamp(seedBpm, 60, 200),
  };
}

export function stepBeatGrid(
  state: BeatGridState,
  input: BeatGridInput,
  cfg: BeatGridConfig = {},
): BeatGridOutput {
  const minBpm = cfg.minBpm ?? 70;
  const maxBpm = cfg.maxBpm ?? 190;
  const beatsPerBar = cfg.beatsPerBar ?? 4;
  const kPhase = clamp(cfg.phaseCorrection ?? 0.22, 0, 1);
  const kBpm = clamp(cfg.bpmCorrection ?? 0.12, 0, 1);
  const lockWin = clamp(cfg.lockWindow01 ?? 0.18, 0.01, 0.5);

  const now = input.nowMs;
  const rawDt = state.lastNowMs ? now - state.lastNowMs : 0;
  const dt = clamp(rawDt, 0, 50);
  state.lastNowMs = now;

  const beatPeriodMs = 60000 / clamp(state.bpm, minBpm, maxBpm);
  const dPhase = beatPeriodMs > 0 ? dt / beatPeriodMs : 0;
  const prevPhase = state.phase01;
  state.phase01 = wrap01(state.phase01 + dPhase);

  let gridBeatEvent = false;
  if (dt > 0 && prevPhase + dPhase >= 1) {
    gridBeatEvent = true;
    state.beatIndex = (state.beatIndex + 1) | 0;
  }

  // --- Hit-based correction (PLL) ---
  if (input.beatHit) {
    const phaseErr = phaseErrorSigned01(state.phase01); // signed [-0.5..0.5]
    const absErr = Math.abs(phaseErr);

    // Update confidence: reward on-grid hits, penalize off-grid hits.
    if (absErr <= lockWin) {
      state.confidence01 = clamp(lerp(state.confidence01, 1, 0.18), 0, 1);
    } else {
      state.confidence01 = clamp(lerp(state.confidence01, 0, 0.22), 0, 1);
    }

    // Phase correction: pull phase toward 0. Keep it gentle to avoid jitter.
    // If we're late (phase>0), subtract; if early (phase<0), add.
    state.phase01 = wrap01(state.phase01 - phaseErr * kPhase);

    // BPM correction from hit interval (only if interval looks plausible).
    if (state.lastHitMs > 0) {
      const interval = now - state.lastHitMs;
      // reject obvious outliers; allow 1/2x and 2x by folding into nearest octave
      const minMs = 60000 / maxBpm;
      const maxMs = 60000 / minBpm;
      if (interval > minMs * 0.6 && interval < maxMs * 1.4) {
        // fold into near beat period
        let folded = interval;
        while (folded < beatPeriodMs * 0.7) folded *= 2;
        while (folded > beatPeriodMs * 1.3) folded *= 0.5;
        state.intervalEmaMs = lerp(state.intervalEmaMs, folded, kBpm);
        const bpm = 60000 / Math.max(1, state.intervalEmaMs);
        state.bpm = clamp(bpm, minBpm, maxBpm);
      }
    }
    state.lastHitMs = now;
  } else {
    // Decay confidence slowly if no hits.
    if (dt > 0) state.confidence01 = clamp(state.confidence01 - dt / 6000, 0, 1);
  }

  const downbeatEvent = gridBeatEvent && (state.beatIndex % beatsPerBar === 0);
  const barPhase01 = wrap01((state.beatIndex % beatsPerBar) / beatsPerBar + state.phase01 / beatsPerBar);

  return {
    bpm: state.bpm,
    phase01: state.phase01,
    confidence01: state.confidence01,
    beatIndex: state.beatIndex,
    gridBeatEvent,
    downbeatEvent,
    barPhase01,
  };
}


