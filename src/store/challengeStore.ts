/**
 * Challenge Store - State management for rhythm challenge mode
 * 
 * Manages:
 * - Challenge state (idle, countdown, active, results)
 * - Hit tracking and accuracy calculation
 * - Visual feedback triggers (ripples, pulses)
 */
import { create } from 'zustand';

// Hit-map structure from recorded JSON
export interface HitMap {
  track: string;
  displayName: string;
  fullHitMap: number[];
  challengeConfig: {
    startOffset: number;
    duration: number;
    toleranceMs: number;
  };
  difficulty: string;
  totalDuration: number;
}

// Individual hit result
export interface HitResult {
  timestamp: number;      // When user clicked
  expectedTime: number;   // Expected beat time
  delta: number;          // Difference in ms
  hit: boolean;           // Within tolerance?
  x: number;              // Click position for visual feedback
  y: number;
}

// Ripple effect for visual feedback
export interface Ripple {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  hit: boolean;           // true = green pulse, false = red
  intensity: number;      // 0-1 for visual strength
}

export type ChallengeState = 'idle' | 'countdown' | 'active' | 'results';

interface ChallengeStoreState {
  // Challenge state
  state: ChallengeState;
  currentHitMap: HitMap | null;
  
  // Timing
  challengeStartTime: number;     // performance.now() when challenge started
  audioStartTime: number;         // When audio started playing
  countdownSeconds: number;       // Countdown before challenge
  
  // Hits tracking
  hits: HitResult[];
  nextHitIndex: number;           // Which beat we're expecting next
  
  // Visual feedback
  ripples: Ripple[];
  lastClickIntensity: number;     // For background reaction
  comboCount: number;             // Consecutive hits
  
  // Results
  totalHits: number;
  successfulHits: number;
  accuracy: number;
  
  // Actions
  loadHitMap: (hitMap: HitMap) => void;
  startCountdown: () => void;
  startChallenge: (audioCurrentTime: number) => void;
  registerClick: (x: number, y: number, audioCurrentTime: number) => HitResult | null;
  endChallenge: () => void;
  reset: () => void;
  
  // Visual feedback
  addRipple: (x: number, y: number, hit: boolean, intensity: number) => void;
  clearOldRipples: () => void;
  
  // Computed
  getCurrentAccuracy: () => number;
  isInChallengeWindow: (audioCurrentTime: number) => boolean;
  getExpectedHits: (audioCurrentTime: number) => number[];
}

let rippleIdCounter = 0;

export const useChallengeStore = create<ChallengeStoreState>((set, get) => ({
  // Initial state
  state: 'idle',
  currentHitMap: null,
  challengeStartTime: 0,
  audioStartTime: 0,
  countdownSeconds: 3,
  hits: [],
  nextHitIndex: 0,
  ripples: [],
  lastClickIntensity: 0,
  comboCount: 0,
  totalHits: 0,
  successfulHits: 0,
  accuracy: 0,
  
  loadHitMap: (hitMap) => {
    set({
      currentHitMap: hitMap,
      state: 'idle',
      hits: [],
      nextHitIndex: 0,
      ripples: [],
      comboCount: 0,
      totalHits: hitMap.fullHitMap.length,
      successfulHits: 0,
      accuracy: 0,
    });
  },
  
  startCountdown: () => {
    set({ state: 'countdown', countdownSeconds: 3 });
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      const current = get().countdownSeconds;
      if (current <= 1) {
        clearInterval(countdownInterval);
        // Don't auto-start here, wait for audio sync
      } else {
        set({ countdownSeconds: current - 1 });
      }
    }, 1000);
  },
  
  startChallenge: (audioCurrentTime) => {
    const hitMap = get().currentHitMap;
    if (!hitMap) return;
    
    const now = performance.now();
    
    // Find which hit index we should start from based on audio position
    const startOffset = hitMap.challengeConfig.startOffset;
    let startIndex = 0;
    for (let i = 0; i < hitMap.fullHitMap.length; i++) {
      if (hitMap.fullHitMap[i] >= startOffset) {
        startIndex = i;
        break;
      }
    }
    
    set({
      state: 'active',
      challengeStartTime: now,
      audioStartTime: audioCurrentTime,
      nextHitIndex: startIndex,
      hits: [],
      comboCount: 0,
      successfulHits: 0,
    });
  },
  
  registerClick: (x, y, audioCurrentTime) => {
    const state = get();
    if (state.state !== 'active' || !state.currentHitMap) return null;
    
    const hitMap = state.currentHitMap;
    const tolerance = hitMap.challengeConfig.toleranceMs / 1000; // Convert to seconds
    const challengeEnd = hitMap.challengeConfig.startOffset + hitMap.challengeConfig.duration;
    
    // Check if we're still in challenge window
    if (audioCurrentTime > challengeEnd) {
      get().endChallenge();
      return null;
    }
    
    // Find the closest expected beat
    let closestBeat = -1;
    let closestDelta = Infinity;
    let closestIndex = -1;
    
    // Look at nearby beats (within reasonable range)
    for (let i = Math.max(0, state.nextHitIndex - 2); i < Math.min(hitMap.fullHitMap.length, state.nextHitIndex + 5); i++) {
      const beatTime = hitMap.fullHitMap[i];
      const delta = Math.abs(audioCurrentTime - beatTime);
      
      if (delta < closestDelta) {
        closestDelta = delta;
        closestBeat = beatTime;
        closestIndex = i;
      }
    }
    
    const isHit = closestDelta <= tolerance;
    const deltaMs = closestDelta * 1000;
    
    const result: HitResult = {
      timestamp: audioCurrentTime,
      expectedTime: closestBeat,
      delta: deltaMs,
      hit: isHit,
      x,
      y,
    };
    
    // Update state
    const newCombo = isHit ? state.comboCount + 1 : 0;
    const newSuccessful = isHit ? state.successfulHits + 1 : state.successfulHits;
    
    // Calculate intensity based on accuracy and combo
    const intensity = isHit 
      ? Math.min(1, 0.5 + (newCombo * 0.1) + (1 - closestDelta / tolerance) * 0.3)
      : 0.3;
    
    set({
      hits: [...state.hits, result],
      nextHitIndex: Math.max(state.nextHitIndex, closestIndex + 1),
      comboCount: newCombo,
      successfulHits: newSuccessful,
      lastClickIntensity: intensity,
    });
    
    // Add visual ripple
    get().addRipple(x, y, isHit, intensity);
    
    return result;
  },
  
  endChallenge: () => {
    const state = get();
    const totalExpected = state.hits.length > 0 ? state.hits.length : state.totalHits;
    const accuracy = totalExpected > 0 
      ? (state.successfulHits / totalExpected) * 100 
      : 0;
    
    set({
      state: 'results',
      accuracy: Math.round(accuracy * 10) / 10,
    });
  },
  
  reset: () => {
    set({
      state: 'idle',
      hits: [],
      nextHitIndex: 0,
      ripples: [],
      comboCount: 0,
      successfulHits: 0,
      accuracy: 0,
      lastClickIntensity: 0,
      challengeStartTime: 0,
      audioStartTime: 0,
    });
  },
  
  addRipple: (x, y, hit, intensity) => {
    const ripple: Ripple = {
      id: ++rippleIdCounter,
      x,
      y,
      timestamp: performance.now(),
      hit,
      intensity,
    };
    
    set((state) => ({
      ripples: [...state.ripples, ripple],
    }));
    
    // Auto-remove after animation
    setTimeout(() => {
      set((state) => ({
        ripples: state.ripples.filter(r => r.id !== ripple.id),
      }));
    }, 600);
  },
  
  clearOldRipples: () => {
    const now = performance.now();
    set((state) => ({
      ripples: state.ripples.filter(r => now - r.timestamp < 600),
    }));
  },
  
  getCurrentAccuracy: () => {
    const state = get();
    if (state.hits.length === 0) return 100;
    return (state.successfulHits / state.hits.length) * 100;
  },
  
  isInChallengeWindow: (audioCurrentTime) => {
    const hitMap = get().currentHitMap;
    if (!hitMap) return false;
    
    const start = hitMap.challengeConfig.startOffset;
    const end = start + hitMap.challengeConfig.duration;
    
    return audioCurrentTime >= start && audioCurrentTime <= end;
  },
  
  getExpectedHits: (audioCurrentTime) => {
    const state = get();
    if (!state.currentHitMap) return [];
    
    const tolerance = state.currentHitMap.challengeConfig.toleranceMs / 1000;
    
    // Return hits that are coming up in the next 2 seconds
    return state.currentHitMap.fullHitMap.filter(
      t => t >= audioCurrentTime - tolerance && t <= audioCurrentTime + 2
    );
  },
}));

// Hook for subscribing to ripples (for visual effects)
export function useRipples() {
  return useChallengeStore((state) => state.ripples);
}

// Hook for challenge state
export function useChallengeState() {
  return useChallengeStore((state) => {
    // Calculate accuracy inline to avoid calling a function that triggers re-renders
    const accuracy = state.hits.length === 0 
      ? 100 
      : (state.successfulHits / state.hits.length) * 100;
    
    return {
      state: state.state,
      accuracy,
      comboCount: state.comboCount,
      successfulHits: state.successfulHits,
      totalHits: state.totalHits,
      lastClickIntensity: state.lastClickIntensity,
    };
  });
}
