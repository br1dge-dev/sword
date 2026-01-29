/**
 * Challenge Store - Single source of truth for rhythm challenge state
 *
 * Used by both AudioControlPanel and page.tsx to stay in sync
 */
import { create } from 'zustand';

export interface ChallengeHit {
  timestamp: number; // Audio time in seconds
  beatIndex: number;
  delta: number; // ms difference from perfect hit
  hit: boolean;
}

export interface HitMapData {
  track: string;
  displayName: string;
  fullHitMap: number[]; // Beat times in seconds
  challengeConfig: {
    startOffset: number;
    duration: number;
    toleranceMs: number;
  };
  totalDuration: number;
}

export interface ChallengeState {
  // Mode
  mode: 'music' | 'challenge';
  phase: 'idle' | 'countdown' | 'active' | 'results';

  // Audio sync
  audioTime: number; // Current audio playback time in seconds
  hitMap: HitMapData | null;

  // Stats
  hits: ChallengeHit[];
  combo: number;
  accuracy: number;
  timeLeft: number;

  // Actions
  setMode: (mode: 'music' | 'challenge') => void;
  setPhase: (phase: 'idle' | 'countdown' | 'active' | 'results') => void;
  setAudioTime: (time: number) => void;
  setHitMap: (hitMap: HitMapData) => void;
  addHit: (hit: ChallengeHit) => void;
  resetChallenge: () => void;
  setTimeLeft: (time: number) => void;

  // Computed
  getUpcomingBeats: (lookaheadMs: number) => number[];
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  // Initial state
  mode: 'music',
  phase: 'idle',
  audioTime: 0,
  hitMap: null,
  hits: [],
  combo: 0,
  accuracy: 100,
  timeLeft: 45,

  // Actions
  setMode: (mode) => set({ mode, phase: mode === 'challenge' ? 'idle' : 'idle' }),

  setPhase: (phase) => set({ phase }),

  setAudioTime: (time) => set({ audioTime: time }),

  setHitMap: (hitMap) => set({ hitMap }),

  addHit: (hit) => set((state) => {
    const newHits = [...state.hits, hit];
    const successfulHits = newHits.filter(h => h.hit).length;
    const totalAttempts = newHits.length;
    const newAccuracy = totalAttempts > 0 ? (successfulHits / totalAttempts) * 100 : 100;
    const newCombo = hit.hit ? state.combo + 1 : 0;

    return {
      hits: newHits,
      combo: newCombo,
      accuracy: newAccuracy
    };
  }),

  resetChallenge: () => set({
    hits: [],
    combo: 0,
    accuracy: 100,
    timeLeft: 45,
    phase: 'idle',
    audioTime: 0
  }),

  setTimeLeft: (time) => set({ timeLeft: time }),

  // Computed: get upcoming beats based on audio time
  getUpcomingBeats: (lookaheadMs: number) => {
    const { audioTime, hitMap, phase } = get();
    if (phase !== 'active' || !hitMap) return [];

    const lookaheadSec = lookaheadMs / 1000;
    const startTime = hitMap.challengeConfig.startOffset;
    const endTime = startTime + hitMap.challengeConfig.duration;

    // Filter beats that are coming up in the lookahead window
    return hitMap.fullHitMap
      .filter(beatTime => {
        const relativeTime = beatTime - startTime; // Time since challenge start
        return relativeTime >= 0 && relativeTime <= (audioTime - startTime) + lookaheadSec;
      })
      .map(beatTime => {
        const relativeTime = beatTime - startTime; // Time since challenge start
        const timeUntil = (relativeTime - (audioTime - startTime)) * 1000; // ms until beat
        return timeUntil;
      })
      .filter(t => t >= 0);
  }
}));