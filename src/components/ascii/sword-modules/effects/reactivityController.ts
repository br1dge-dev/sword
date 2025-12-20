export type ReactivityInput = {
  nowMs: number;
  /**
   * Overall energy (typically 0..1) from AudioAnalyzer / store.
   */
  energy: number;
  /**
   * Beat boolean (short pulse) from store.
   */
  beatDetected: boolean;
  /**
   * Raw FFT magnitudes (0..255). Can be null when not analyzing.
   */
  frequencyData: Uint8Array | null;
};

export type ReactivityOutput = {
  /** Smoothed overall energy (0..1) */
  energy: number;
  /** Smoothed band energies (0..1) */
  bass: number;
  mid: number;
  high: number;
  /**
   * Smoothed onset / spectral flux proxy (0..1).
   * High when spectrum has many rising bins (good trigger for “hits”).
   */
  onset: number;
  /**
   * Beat pulse strength (0..1) with decay; more stable than a single boolean.
   */
  beat: number;
};

type SmoothAROptions = {
  attackMs: number;
  releaseMs: number;
};

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function smoothAR(prev: number, target: number, dtMs: number, opts: SmoothAROptions) {
  // Exponential smoothing with different attack/release time constants.
  const tau = target > prev ? opts.attackMs : opts.releaseMs;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / Math.max(1, tau));
  return prev + (target - prev) * alpha;
}

function avgBand(freq: Uint8Array, start: number, endExclusive: number): number {
  const end = Math.min(freq.length, Math.max(start, endExclusive));
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += freq[i];
  return sum / (end - start);
}

function computeOnsetFluxNormalized(curr: Uint8Array, prev: Uint8Array | null): number {
  if (!prev || prev.length !== curr.length) return 0;
  // Spectral flux proxy: sum of positive differences.
  let flux = 0;
  for (let i = 0; i < curr.length; i++) {
    const d = curr[i] - prev[i];
    if (d > 0) flux += d;
  }
  // Normalize to roughly 0..1 (depends on FFT size; this works well as a trigger signal).
  const maxFlux = curr.length * 255;
  return clamp01(flux / maxFlux);
}

export type ReactivityControllerOptions = {
  energySmoothing?: SmoothAROptions;
  bandSmoothing?: SmoothAROptions;
  onsetSmoothing?: SmoothAROptions;
  beatDecayMs?: number;
  /**
   * Portion of FFT bins used for bass/mid/high. Default matches existing logic.
   */
  bands?: { bassEnd: number; midEnd: number };
};

export function createReactivityController(opts: ReactivityControllerOptions = {}) {
  const energySmooth = opts.energySmoothing ?? { attackMs: 80, releaseMs: 220 };
  const bandSmooth = opts.bandSmoothing ?? { attackMs: 70, releaseMs: 180 };
  const onsetSmooth = opts.onsetSmoothing ?? { attackMs: 35, releaseMs: 140 };
  const beatDecayMs = opts.beatDecayMs ?? 220;
  const bands = opts.bands ?? { bassEnd: 0.2, midEnd: 0.6 };

  let lastNow = 0;
  let prevSpectrum: Uint8Array | null = null;

  let energy = 0;
  let bass = 0;
  let mid = 0;
  let high = 0;
  let onset = 0;
  let beat = 0;

  const update = (input: ReactivityInput): ReactivityOutput => {
    const now = input.nowMs;
    const dt = lastNow ? now - lastNow : 0;
    lastNow = now;

    // Beat pulse with decay (stable “strength” signal).
    if (input.beatDetected) beat = 1;
    else if (dt > 0) beat = Math.max(0, beat - dt / beatDecayMs);

    // Always smooth energy (even without frequency).
    energy = clamp01(smoothAR(energy, clamp01(input.energy), dt, energySmooth));

    const freq = input.frequencyData;
    if (!freq || freq.length === 0) {
      // If we have no spectrum, keep previous band values but decay gently toward 0.
      bass = clamp01(smoothAR(bass, 0, dt, bandSmooth));
      mid = clamp01(smoothAR(mid, 0, dt, bandSmooth));
      high = clamp01(smoothAR(high, 0, dt, bandSmooth));
      onset = clamp01(smoothAR(onset, 0, dt, onsetSmooth));
      return { energy, bass, mid, high, onset, beat };
    }

    const bassEnd = Math.floor(freq.length * bands.bassEnd);
    const midEnd = Math.floor(freq.length * bands.midEnd);
    const bassRaw = avgBand(freq, 0, bassEnd) / 255;
    const midRaw = avgBand(freq, bassEnd, midEnd) / 255;
    const highRaw = avgBand(freq, midEnd, freq.length) / 255;

    bass = clamp01(smoothAR(bass, bassRaw, dt, bandSmooth));
    mid = clamp01(smoothAR(mid, midRaw, dt, bandSmooth));
    high = clamp01(smoothAR(high, highRaw, dt, bandSmooth));

    const fluxRaw = computeOnsetFluxNormalized(freq, prevSpectrum);
    onset = clamp01(smoothAR(onset, fluxRaw, dt, onsetSmooth));

    // Copy spectrum for next flux computation (copy is important: Uint8Array is mutable in some pipelines).
    prevSpectrum = freq.slice();

    return { energy, bass, mid, high, onset, beat };
  };

  return { update };
}


