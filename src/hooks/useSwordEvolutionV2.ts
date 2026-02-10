/**
 * useSwordEvolutionV2 - Hook for SwordEvolution V2 (Corrected)
 * 
 * 60 days, 60 steps, all aspects level up together
 * Max 1 step per day (if ≥1 claim)
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';

// Contract address - V2 (Base Sepolia)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V2 || '0x5FAE341367647F8Db2448792e793e9f46F67acb4';

// Multiple RPC endpoints for fallback
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
];

// Function selectors for V2 - calculated from keccak256(functionSignature)[:4]
const SELECTORS = {
  getAspectLevels: '0x7e0211e7',   // getAspectLevels()
  getGlobalState: '0x743faee2',    // getGlobalState()
  getUserState: '0x416ae768',      // getUserState(address)
  getActiveAspect: '0x4c2e0246',   // getActiveAspect()
  getCurrentRound: '0xa32bf597',   // getCurrentRound()
  forgeLevel: '0xf2096da8',        // forgeLevel()
  chargeLevel: '0xd0d7e306',       // chargeLevel()
  glitchLevel: '0xfd80bca4',       // glitchLevel()
  currentDay: '0x5c9302c9',        // currentDay()
  claimsToday: '0x061d8a73',       // claimsToday()
  stepClaimedToday: '0x7d2ec202',  // stepClaimedToday()
};

function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

export interface AspectLevels {
  forge: { level: number; progress: number };
  charge: { level: number; progress: number };
  glitch: { level: number; progress: number };
  activeAspect: number;  // 0=FORGE, 1=CHARGE, 2=GLITCH
  daysRemainingInAspect: number; // 0-20
}

export interface GlobalState {
  day: number;
  claimsToday: number;
  claimsRemaining: number;
  evolutionComplete: boolean;
  canAdvanceDay: boolean;
  currentRound: number;  // 0, 1, or 2
}

export interface UserState {
  totalClaims: number;
  totalMinted: bigint;
  canClaimToday: boolean;
  lastClaimDay: number;
}

async function callRpc(method: string, params: unknown[] = []): Promise<unknown> {
  const body = JSON.stringify({ jsonrpc: '2.0', id: Math.random(), method, params });
  let lastError: Error | null = null;
  
  for (const rpcUrl of RPC_URLS) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.error) {
        throw new Error(`RPC Error ${data.error.code}: ${data.error.message}`);
      }
      
      return data.result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try next RPC
    }
  }
  
  console.error('[V2 RPC] All RPCs failed:', lastError);
  throw lastError;
}

export function useSwordEvolutionV2() {
  const [aspectLevels, setAspectLevels] = useState<AspectLevels | null>(null);
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getAccount = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) setAddress(accounts[0]);
      }
    };
    getAccount();

    // Listen for wallet changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setAddress(accounts.length > 0 ? accounts[0] : null);
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const fetchAspectLevels = useCallback(async () => {
    try {
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getAspectLevels }, 'latest']) as string | null;
      
      if (!data || data === '0x') { 
        console.error('[V2] getAspectLevels: no data');
        setAspectLevels(null); 
        return; 
      }

      const hex = data.slice(2);
      
      // Expected 8 uint256 values = 256 bytes
      if (hex.length < 512) {
        console.error('[V2] getAspectLevels: bad response length', hex.length);
        setAspectLevels(null);
        return;
      }
      
      // First 3 values: forgeLevel, chargeLevel, glitchLevel (10-30)
      const forgeLevelRaw = hexToNumber('0x' + hex.slice(0, 64));
      const chargeLevelRaw = hexToNumber('0x' + hex.slice(64, 128));
      const glitchLevelRaw = hexToNumber('0x' + hex.slice(128, 192));
      // Next 3 values: forgeProgress, chargeProgress, glitchProgress (0-9)
      const forgeProgress = hexToNumber('0x' + hex.slice(192, 256));
      const chargeProgress = hexToNumber('0x' + hex.slice(256, 320));
      const glitchProgress = hexToNumber('0x' + hex.slice(320, 384));
      // New values: activeAspect, daysRemainingInAspect
      const activeAspect = hexToNumber('0x' + hex.slice(384, 448));
      const daysRemainingInAspect = hexToNumber('0x' + hex.slice(448, 512));

      // Convert internal level (10-30) to display level (1.0-3.0)
      // NOTE: Contract progress is inverted, calculate correct progress from level
      const forgeLevel = forgeLevelRaw / 10;
      const chargeLevel = chargeLevelRaw / 10;
      const glitchLevel = glitchLevelRaw / 10;
      
      // Correct progress: Level 1.0 = 0%, Level 1.1 = 10%, Level 1.9 = 90%
      const correctForgeProgress = Math.round((forgeLevel % 1) * 10);
      const correctChargeProgress = Math.round((chargeLevel % 1) * 10);
      const correctGlitchProgress = Math.round((glitchLevel % 1) * 10);
      
      const parsed = {
        forge: { level: forgeLevel, progress: correctForgeProgress },
        charge: { level: chargeLevel, progress: correctChargeProgress },
        glitch: { level: glitchLevel, progress: correctGlitchProgress },
        activeAspect,
        daysRemainingInAspect,
      };
      setAspectLevels(parsed);
    } catch (err: any) {
      console.error('[V2] getAspectLevels error:', err.message);
      setAspectLevels(null);
    }
  }, []);

  const fetchGlobalState = useCallback(async () => {
    try {
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getGlobalState }, 'latest']) as string | null;
      if (!data) { setGlobalState(null); return; }

      const hex = data.slice(2);
      // getGlobalState() returns 7 values: (day, claimsToday_, claimsRemaining, activeAspect, currentRound, evolutionComplete, canAdvanceDay)
      const day = hexToNumber('0x' + hex.slice(0, 64));
      const claimsToday = hexToNumber('0x' + hex.slice(64, 128));
      const claimsRemaining = hexToNumber('0x' + hex.slice(128, 192));
      const activeAspect = hexToNumber('0x' + hex.slice(192, 256));
      const currentRound = hexToNumber('0x' + hex.slice(256, 320));
      const evolutionComplete = hexToNumber('0x' + hex.slice(320, 384)) === 1;
      const canAdvanceDay = hexToNumber('0x' + hex.slice(384, 448)) === 1;

      setGlobalState({ day, claimsToday, claimsRemaining, evolutionComplete, canAdvanceDay, currentRound });
    } catch (err) {
      console.error('[V2] getGlobalState error:', err);
    }
  }, []);

  const fetchUserState = useCallback(async () => {
    if (!address) { setUserState(null); return; }

    try {
      const paddedAddr = address.slice(2).padStart(64, '0');
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getUserState + paddedAddr }, 'latest']) as string | null;
      if (!data) { setUserState(null); return; }

      const hex = data.slice(2);
      const totalClaims = hexToNumber('0x' + hex.slice(0, 64));
      const totalMinted = BigInt('0x' + hex.slice(64, 128));
      const canClaimToday = hexToNumber('0x' + hex.slice(128, 192)) === 1;
      const lastClaimDay = hexToNumber('0x' + hex.slice(192, 256));

      setUserState({ totalClaims, totalMinted, canClaimToday, lastClaimDay });
    } catch (err) {
      console.error('[V2] getUserState error:', err);
    }
  }, [address]);

  useEffect(() => {
    setIsLoading(true);
    const fetchAll = async () => {
      await Promise.all([fetchAspectLevels(), fetchGlobalState(), fetchUserState()]);
      setIsLoading(false);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAspectLevels, fetchGlobalState, fetchUserState]);

  // Sync contract data to powerUpStore
  useEffect(() => {
    if (aspectLevels) {
      const state = usePowerUpStore.getState();
      const forgeLvl = Math.floor(aspectLevels.forge.level);
      const chargeLvl = Math.floor(aspectLevels.charge.level);
      const glitchLvl = Math.floor(aspectLevels.glitch.level);
      const forgeProgressNew = aspectLevels.forge.progress * 10;
      const chargeProgressNew = aspectLevels.charge.progress * 10;
      const glitchProgressNew = aspectLevels.glitch.progress * 10;
      
      // Update if level OR progress changed
      if (state.currentLevel !== forgeLvl || 
          state.chargeLevel !== chargeLvl || 
          state.glitchLevel !== glitchLvl ||
          state.forgeProgress !== forgeProgressNew ||
          state.chargeProgress !== chargeProgressNew ||
          state.glitchProgress !== glitchProgressNew) {
        usePowerUpStore.setState({
          currentLevel: forgeLvl,
          chargeLevel: chargeLvl,
          glitchLevel: glitchLvl,
          forgeProgress: forgeProgressNew,
          chargeProgress: chargeProgressNew,
          glitchProgress: glitchProgressNew,
        });
      }
    }
  }, [aspectLevels]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAspectLevels(), fetchGlobalState(), fetchUserState()]);
    setIsLoading(false);
  }, [fetchAspectLevels, fetchGlobalState, fetchUserState]);

  return { 
    aspectLevels, 
    globalState, 
    userState, 
    isLoading, 
    refetch,
    // Convenience accessors for new V2 fields
    activeAspect: aspectLevels?.activeAspect ?? null,
    currentRound: globalState?.currentRound ?? null,
  };
}

export default useSwordEvolutionV2;
