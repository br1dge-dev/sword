import type { ChoreoTrack } from "./choreoTypes";

export type ChoreoSample = {
  ok: boolean;
  tSec: number;
  idx: number;
  energy: number;
  bass: number;
  mid: number;
  high: number;
  onset: number;
  beatPulse: boolean;
  beatStrength: number; // 0..1 (derived from beatPulse, decays)
  bands16?: number[];
};

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

export function sampleChoreo(track: ChoreoTrack, timeSec: number, beatPulseMs = 120): ChoreoSample {
  const tSec = Math.max(0, timeSec || 0);
  const hop = Math.max(0.001, track.hopSec || 0.05);
  const idx = Math.min(track.frames - 1, Math.max(0, Math.floor(tSec / hop)));
  const e = clamp01(track.energy[idx] ?? 0);
  const b = clamp01(track.bass[idx] ?? 0);
  const m = clamp01(track.mid?.[idx] ?? 0);
  const h = clamp01(track.high?.[idx] ?? 0);
  const o = clamp01(track.onset[idx] ?? 0);
  const beatFlag = (track.beat[idx] ?? 0) > 0;

  // Beat pulse: treat beat frames as impulses lasting `beatPulseMs`.
  const beatPulseFrames = Math.max(1, Math.round((beatPulseMs / 1000) / hop));
  let beatPulse = beatFlag;
  if (!beatPulse) {
    for (let i = 1; i <= beatPulseFrames; i++) {
      const j = idx - i;
      if (j < 0) break;
      if ((track.beat[j] ?? 0) > 0) {
        beatPulse = true;
        break;
      }
    }
  }

  // Simple strength: 1 on pulse, else decays over ~220ms.
  const decayMs = 220;
  let beatStrength = beatPulse ? 1 : 0;
  if (!beatPulse) {
    // distance to last beat
    let lastBeatDistFrames = Infinity;
    for (let i = 1; i < Math.min(100, idx + 1); i++) {
      const j = idx - i;
      if ((track.beat[j] ?? 0) > 0) {
        lastBeatDistFrames = i;
        break;
      }
    }
    if (lastBeatDistFrames !== Infinity) {
      const dtMs = lastBeatDistFrames * hop * 1000;
      beatStrength = clamp01(1 - dtMs / decayMs);
    }
  }

  return {
    ok: true,
    tSec,
    idx,
    energy: e,
    bass: b,
    mid: m,
    high: h,
    onset: o,
    beatPulse,
    beatStrength,
    bands16: track.bands16?.[idx],
  };
}


