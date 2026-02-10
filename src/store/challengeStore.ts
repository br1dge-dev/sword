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
  userClicks: number[]; // Timestamps of user clicks in seconds
  missedBeats: number; // Count of beats that passed without being hit
  totalBeats: number; // Total beats in challenge window
  accuracy: number; // Current accuracy percentage
  timeLeft: number;

  // Actions
  setMode: (mode: 'music' | 'challenge') => void;
  setPhase: (phase: 'idle' | 'countdown' | 'active' | 'results') => void;
  setAudioTime: (time: number) => void;
  setHitMap: (hitMap: HitMapData) => void;
  addHit: (hit: ChallengeHit) => void;
  addUserClick: (timestamp: number) => void;
  addMissedBeat: () => void;
  setTotalBeats: (count: number) => void;
  resetChallenge: () => void;
  startChallenge: (totalBeats: number) => void;
  finalizeAccuracy: () => void; // Call when challenge ends to include missed beats
  setTimeLeft: (time: number) => void;

  // Computed
  getAccuracy: () => number;
  getUpcomingBeats: (lookaheadMs: number) => number[];
  getClaimData: () => { hitmap: number[]; userClicks: number[] } | null;
  getScore: () => { hits: number; missed: number; wrong: number; total: number; accuracy: number };
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  // Initial state
  mode: 'music',
  phase: 'idle',
  audioTime: 0,
  hitMap: null,
  hits: [],
  userClicks: [],
  missedBeats: 0,
  totalBeats: 0,
  accuracy: 0,
  timeLeft: 45,

  // Actions
  setMode: (mode) => set({ mode, phase: mode === 'challenge' ? 'idle' : 'idle' }),

  setPhase: (phase) => set({ phase }),

  setAudioTime: (time) => set({ audioTime: time }),

  setHitMap: (hitMap) => set({ hitMap }),

  // Helper to calculate accuracy during challenge (hits / (hits + wrong))
  calculateAccuracy: () => {
    const { hits } = get();
    const successfulHits = hits.filter(h => h.hit).length;
    const wrongClicks = hits.filter(h => !h.hit).length;
    const totalAttempts = successfulHits + wrongClicks;
    if (totalAttempts === 0) return 0;
    return Math.round((successfulHits / totalAttempts) * 100);
  },

  addHit: (hit) => set((state) => {
    const newHits = [...state.hits, hit];
    // Count successful hits and wrong clicks
    const successfulHits = newHits.filter(h => h.hit).length;
    const wrongClicks = newHits.filter(h => !h.hit).length;
    // Calculate accuracy: hits / (hits + wrong)
    const totalAttempts = successfulHits + wrongClicks;
    const newAccuracy = totalAttempts > 0 ? Math.round((successfulHits / totalAttempts) * 100) : 0;
    return {
      hits: newHits,
      accuracy: newAccuracy
    };
  }),

  addUserClick: (timestamp) => set((state) => ({
    userClicks: [...state.userClicks, timestamp]
  })),

  addMissedBeat: () => set((state) => ({
    missedBeats: state.missedBeats + 1
  })),

  setTotalBeats: (count) => set({ totalBeats: count }),

  resetChallenge: () => set({
    hits: [],
    userClicks: [],
    missedBeats: 0,
    accuracy: 0,
    // totalBeats is NOT reset here - it's set when challenge starts
    timeLeft: 45,
    phase: 'idle',
    audioTime: 0
  }),

  // Start challenge with total beats - resets state AND sets totalBeats in one update
  startChallenge: (totalBeats) => set({
    hits: [],
    userClicks: [],
    missedBeats: 0,
    totalBeats,
    accuracy: 0,
    timeLeft: 45,
    phase: 'idle',
    audioTime: 0
  }),

  // Finalize accuracy at end of challenge (include missed beats)
  finalizeAccuracy: () => set((state) => {
    const successfulHits = state.hits.filter(h => h.hit).length;
    const wrongClicks = state.hits.filter(h => !h.hit).length;
    const missedBeats = state.missedBeats;
    // Final accuracy: hits / (hits + wrong + missed)
    const total = successfulHits + wrongClicks + missedBeats;
    const finalAccuracy = total > 0 ? Math.round((successfulHits / total) * 100) : 0;
    return { accuracy: finalAccuracy };
  }),

  setTimeLeft: (time) => set({ timeLeft: time }),

  // Computed: get current accuracy (during challenge)
  getAccuracy: () => {
    const { hits } = get();
    const successfulHits = hits.filter(h => h.hit).length;
    const wrongClicks = hits.filter(h => !h.hit).length;
    const total = successfulHits + wrongClicks;
    if (total === 0) return 0;
    return Math.round((successfulHits / total) * 100);
  },

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
  },

  // Get data for claim API call
  getClaimData: () => {
    const { hitMap, userClicks, audioTime } = get();
    if (!hitMap) return null;

    const startTime = hitMap.challengeConfig.startOffset;
    const endTime = startTime + hitMap.challengeConfig.duration;

    // Filter beats within challenge window
    const beatsInWindow = hitMap.fullHitMap
      .filter(t => t >= startTime && t <= endTime)
      .map(t => t - startTime); // Convert to relative time

    // Filter user clicks within challenge window
    const clicksInWindow = userClicks
      .filter(t => t >= startTime && t <= endTime)
      .map(t => t - startTime); // Convert to relative time

    return {
      hitmap: beatsInWindow,
      userClicks: clicksInWindow,
    };
  },

  // Get current score breakdown
  getScore: () => {
    const { hits, missedBeats, totalBeats } = get();
    const successfulHits = hits.filter(h => h.hit).length;
    const wrongClicks = hits.filter(h => !h.hit).length;
    // Calculate accuracy including wrong clicks and missed beats
    const total = successfulHits + wrongClicks + missedBeats;
    const accuracy = total > 0 ? Math.round((successfulHits / total) * 100) : 0;
    
    return {
      hits: successfulHits,
      missed: missedBeats,
      wrong: wrongClicks,
      total: totalBeats,
      accuracy
    };
  }
}));
