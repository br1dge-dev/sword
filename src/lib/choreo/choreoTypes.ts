export type ChoreoTrackV1 = {
  version: 1;
  trackName: string; // e.g. "DR4GONSWORD"
  src: string; // e.g. "/music/DR4GONSWORD.mp3"
  createdAtIso: string;
  hopSec: number; // e.g. 0.0232..0.05
  windowSec: number; // analysis window size in seconds
  frames: number;
  // Deterministic driving signals (0..1 unless otherwise noted)
  energy: number[];
  bass: number[];
  mid?: number[];
  high?: number[];
  onset: number[];
  // 0/1 beat flags per frame (kick-like)
  beat: number[];
  // Optional 16-band levels (0..1) for driving the sword EQ deterministically
  bands16?: number[][];
  meta?: Record<string, any>;
};

export type ChoreoTrack = ChoreoTrackV1;


