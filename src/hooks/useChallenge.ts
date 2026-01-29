/**
 * useChallenge - Hook for rhythm challenge state and contract interaction
 * 
 * Manages:
 * - Active challenge info from contract
 * - Hit tracking during challenge
 * - Score calculation
 * - Claim submission
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';

// Contract ABI (only the functions we need)
const SWORD_EVOLUTION_ABI = [
  {
    name: 'getActiveChallenge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'trackName', type: 'string' },
      { name: 'startOffsetMs', type: 'uint256' },
      { name: 'endOffsetMs', type: 'uint256' },
    ],
  },
  {
    name: 'getGlobalState',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'evolutionDay', type: 'uint256' },
      { name: 'claimsMadeToday', type: 'uint8' },
      { name: 'claimsRemaining', type: 'uint8' },
      { name: 'activeAspect', type: 'uint8' },
      { name: 'evolutionComplete', type: 'bool' },
    ],
  },
  {
    name: 'canClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddr', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

// Contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;

// Challenge window duration
const CHALLENGE_WINDOW_MS = 45_000;
const HIT_TOLERANCE_MS = 150;

// Demo mode: generate fake beats when no contract/hitmap available
const DEMO_BPM = 120;
const DEMO_BEAT_INTERVAL = 60_000 / DEMO_BPM; // ms between beats

export interface ChallengeHit {
  timestamp: number; // Relative to challenge start
  beatIndex: number;
  delta: number; // ms difference from perfect hit
  hit: boolean;
}

export interface ChallengeState {
  isActive: boolean;
  trackName: string;
  startOffsetMs: number;
  endOffsetMs: number;
  currentTimeMs: number;
  hits: ChallengeHit[];
  score: number;
  evolutionDay: number;
  claimsRemaining: number;
  activeAspect: 'FORGE' | 'CHARGE' | 'GLITCH';
}

// Hitmap type (loaded from JSON)
interface HitMapData {
  track: string;
  displayName: string;
  fullHitMap: number[]; // Beat timestamps in seconds
  totalDuration: number;
}

export function useChallenge() {
  const [isActive, setIsActive] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [hits, setHits] = useState<ChallengeHit[]>([]);
  const [hitMap, setHitMap] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  
  // Read active challenge from contract
  const { data: challengeData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getActiveChallenge',
    chainId: chain.id,
    query: {
      enabled: !!CONTRACT_ADDRESS,
      refetchInterval: 60_000, // Refresh every minute
    },
  });
  
  // Read global state
  const { data: globalState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getGlobalState',
    chainId: chain.id,
    query: {
      enabled: !!CONTRACT_ADDRESS,
      refetchInterval: 60_000,
    },
  });
  
  // Parse contract data
  const trackName = challengeData?.[0] ?? '';
  const startOffsetMs = Number(challengeData?.[1] ?? 0);
  const endOffsetMs = Number(challengeData?.[2] ?? 0);
  const evolutionDay = Number(globalState?.[0] ?? 1);
  const claimsRemaining = Number(globalState?.[2] ?? 10);
  const aspectIndex = Number(globalState?.[3] ?? 0);
  const aspects = ['FORGE', 'CHARGE', 'GLITCH'] as const;
  const activeAspect = aspects[aspectIndex] ?? 'FORGE';
  
  // Generate demo hitmap (when no real hitmap available)
  const generateDemoHitMap = useCallback(() => {
    const beats: number[] = [];
    for (let t = DEMO_BEAT_INTERVAL; t < CHALLENGE_WINDOW_MS; t += DEMO_BEAT_INTERVAL) {
      beats.push(t);
    }
    return beats;
  }, []);
  
  // Load hitmap for track
  const loadHitMap = useCallback(async (track: string) => {
    try {
      // Try to load hitmap from public folder
      const response = await fetch(`/hitmaps/${track}.json`);
      if (response.ok) {
        const data: HitMapData = await response.json();
        // Convert seconds to milliseconds and filter to challenge window
        const startSec = startOffsetMs / 1000;
        const endSec = endOffsetMs / 1000;
        const windowHits = data.fullHitMap
          .filter(t => t >= startSec && t <= endSec)
          .map(t => (t - startSec) * 1000); // Relative to challenge start
        setHitMap(windowHits);
        return windowHits;
      }
    } catch (e) {
      console.warn('[useChallenge] Failed to load hitmap:', e);
    }
    // Fallback to demo hitmap
    const demoHits = generateDemoHitMap();
    setHitMap(demoHits);
    return demoHits;
  }, [startOffsetMs, endOffsetMs, generateDemoHitMap]);
  
  // Start challenge (works with or without contract)
  const startChallenge = useCallback(async () => {
    // Load hitmap (will use demo if no real one available)
    const loadedHitMap = await loadHitMap(trackName || 'demo');
    
    setIsActive(true);
    setHits([]);
    setScore(0);
    setCurrentTimeMs(0);
    startTimeRef.current = performance.now();
    
    // Start time tracking
    const updateTime = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setCurrentTimeMs(elapsed);
      
      if (elapsed < CHALLENGE_WINDOW_MS) {
        rafRef.current = requestAnimationFrame(updateTime);
      } else {
        // Challenge ended
        setIsActive(false);
      }
    };
    rafRef.current = requestAnimationFrame(updateTime);
  }, [trackName, loadHitMap]);
  
  // Stop challenge
  const stopChallenge = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setIsActive(false);
    setCurrentTimeMs(0);
  }, []);
  
  // Register a hit attempt
  const registerHit = useCallback((timestamp?: number) => {
    if (!isActive) return null;
    
    const hitTime = timestamp ?? (performance.now() - startTimeRef.current);
    
    // Find closest beat
    let closestBeat = -1;
    let closestDelta = Infinity;
    let closestIndex = -1;
    
    for (let i = 0; i < hitMap.length; i++) {
      const delta = Math.abs(hitTime - hitMap[i]);
      if (delta < closestDelta) {
        closestDelta = delta;
        closestBeat = hitMap[i];
        closestIndex = i;
      }
    }
    
    const isHit = closestDelta <= HIT_TOLERANCE_MS;
    
    const hit: ChallengeHit = {
      timestamp: hitTime,
      beatIndex: closestIndex,
      delta: closestDelta,
      hit: isHit,
    };
    
    // Update hits and score together
    setHits(prev => {
      const newHits = [...prev, hit];
      const hitCount = newHits.filter(h => h.hit).length;
      const totalBeats = hitMap.length;
      const newScore = totalBeats > 0 ? Math.round((hitCount / totalBeats) * 100) : 0;
      setScore(newScore);
      return newHits;
    });
    
    return hit;
  }, [isActive, hitMap]);
  
  // Get upcoming beats (for visual indicator)
  const getUpcomingBeats = useCallback((lookaheadMs: number = 2000): number[] => {
    if (!isActive) return [];
    
    const now = currentTimeMs;
    return hitMap
      .filter(t => t > now && t <= now + lookaheadMs)
      .map(t => t - now); // Return time until beat
  }, [isActive, currentTimeMs, hitMap]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return {
    // State
    isActive,
    trackName,
    startOffsetMs,
    endOffsetMs,
    currentTimeMs,
    hits,
    hitMap,
    score,
    evolutionDay,
    claimsRemaining,
    activeAspect,
    
    // Actions
    startChallenge,
    stopChallenge,
    registerHit,
    getUpcomingBeats,
    
    // Computed
    progress: isActive ? (currentTimeMs / CHALLENGE_WINDOW_MS) * 100 : 0,
    timeRemaining: isActive ? Math.max(0, Math.ceil((CHALLENGE_WINDOW_MS - currentTimeMs) / 1000)) : 0,
  };
}
