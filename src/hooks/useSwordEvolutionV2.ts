/**
 * useSwordEvolutionV2 - Hook for SwordEvolution V2 (Corrected)
 * 
 * 60 days, 60 steps, all aspects level up together
 * Max 1 step per day (if ≥1 claim)
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

// Contract address - V2 (to be deployed)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V2 || '0x0000000000000000000000000000000000000000';
const RPC_URL = 'https://sepolia.base.org';

// Function selectors for V2
const SELECTORS = {
  getAspectLevels: '0x9e23c6f1',
  getGlobalState: '0x4e0e8f4e',
  getUserState: '0x416ae768',
  globalProgress: '0x6b5cc770',
  currentDay: '0x5c9302c9',
  claimsToday: '0xeb3d4346',
  stepClaimedToday: '0x7d2ec202', // New in V2
};

function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

export interface AspectLevels {
  forge: { level: number; progress: number };
  charge: { level: number; progress: number };
  glitch: { level: number; progress: number };
}

export interface GlobalState {
  day: number;
  claimsToday: number;
  claimsRemaining: number;
  progress: number;
  progressMax: number;
  evolutionComplete: boolean;
  canAdvanceDay: boolean;
}

export interface UserState {
  totalClaims: number;
  totalMinted: bigint;
  canClaimToday: boolean;
  lastClaimDay: number;
}

async function callRpc(method: string, params: any[] = []): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Math.random(), method, params }),
  });
  const data = await res.json();
  if (data.error) return null;
  return data.result;
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
  }, []);

  const fetchAspectLevels = useCallback(async () => {
    try {
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getAspectLevels }, 'latest']);
      if (!data) { setAspectLevels(null); return; }

      const hex = data.slice(2);
      const forgeLevel = hexToNumber('0x' + hex.slice(0, 64));
      const chargeLevel = hexToNumber('0x' + hex.slice(64, 128));
      const glitchLevel = hexToNumber('0x' + hex.slice(128, 192));
      const forgeProgress = hexToNumber('0x' + hex.slice(192, 256));
      const chargeProgress = hexToNumber('0x' + hex.slice(256, 320));
      const glitchProgress = hexToNumber('0x' + hex.slice(320, 384));

      // Convert internal level (10-30) to display level (1.0-3.0)
      setAspectLevels({
        forge: { level: forgeLevel / 10, progress: forgeProgress },
        charge: { level: chargeLevel / 10, progress: chargeProgress },
        glitch: { level: glitchLevel / 10, progress: glitchProgress },
      });
    } catch (err) {
      console.error('Error fetching aspect levels:', err);
    }
  }, []);

  const fetchGlobalState = useCallback(async () => {
    try {
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getGlobalState }, 'latest']);
      if (!data) { setGlobalState(null); return; }

      const hex = data.slice(2);
      const day = hexToNumber('0x' + hex.slice(0, 64));
      const claimsToday = hexToNumber('0x' + hex.slice(64, 128));
      const claimsRemaining = hexToNumber('0x' + hex.slice(128, 192));
      const progress = hexToNumber('0x' + hex.slice(192, 256));
      const progressMax = hexToNumber('0x' + hex.slice(256, 320));
      const evolutionComplete = hexToNumber('0x' + hex.slice(320, 384)) === 1;
      const canAdvanceDay = hexToNumber('0x' + hex.slice(384, 448)) === 1;

      setGlobalState({ day, claimsToday, claimsRemaining, progress, progressMax, evolutionComplete, canAdvanceDay });
    } catch (err) {
      console.error('Error fetching global state:', err);
    }
  }, []);

  const fetchUserState = useCallback(async () => {
    if (!address) { setUserState(null); return; }

    try {
      const paddedAddr = address.slice(2).padStart(64, '0');
      const data = await callRpc('eth_call', [{ to: CONTRACT_ADDRESS, data: SELECTORS.getUserState + paddedAddr }, 'latest']);
      if (!data) { setUserState(null); return; }

      const hex = data.slice(2);
      const totalClaims = hexToNumber('0x' + hex.slice(0, 64));
      const totalMinted = BigInt('0x' + hex.slice(64, 128));
      const canClaimToday = hexToNumber('0x' + hex.slice(128, 192)) === 1;
      const lastClaimDay = hexToNumber('0x' + hex.slice(192, 256));

      setUserState({ totalClaims, totalMinted, canClaimToday, lastClaimDay });
    } catch (err) {
      console.error('Error fetching user state:', err);
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

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAspectLevels(), fetchGlobalState(), fetchUserState()]);
    setIsLoading(false);
  }, [fetchAspectLevels, fetchGlobalState, fetchUserState]);

  return { aspectLevels, globalState, userState, isLoading, refetch };
}

export default useSwordEvolutionV2;
