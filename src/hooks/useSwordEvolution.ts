/**
 * useSwordEvolution - Hook for reading SwordEvolution contract data
 * 
 * Uses direct RPC calls with CORRECT function selectors.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

// Contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA || '0x573b1236601083f0389d6826f35dcc7762e40ee5';

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';

// CORRECT function selectors (calculated from Solidity signatures)
const SELECTORS = {
  getGlobalState: '0x743faee2',      // keccak256("getGlobalState()")
  getUserState: '0x416ae768',         // keccak256("getUserState(address)")
  currentDay: '0x5c9302c9',           // keccak256("currentDay()")
  claimsToday: '0xeb3d4346',          // keccak256("claimsToday()")
};

// Parse hex to number
function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

export interface GlobalState {
  evolutionDay: number;
  claimsMadeToday: number;
  claimsRemaining: number;
  activeAspect: 'FORGE' | 'CHARGE' | 'GLITCH';
  evolutionComplete: boolean;
}

export interface UserState {
  levelForge: number;
  levelCharge: number;
  levelGlitch: number;
  totalMinted: bigint;
  canClaimToday: boolean;
}

export interface CalculatedLevels {
  forge: { level: number; progress: number };
  charge: { level: number; progress: number };
  glitch: { level: number; progress: number };
}

async function callRpc(method: string, params: any[] = []): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method,
      params,
    }),
  });
  const data = await res.json();
  if (data.error) return null;
  return data.result;
}

export function useSwordEvolution() {
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contractExists, setContractExists] = useState(true);

  // Get account from window.ethereum
  useEffect(() => {
    const getAccount = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        }
      }
    };
    getAccount();
  }, []);

  // Check if contract exists
  const checkContractExists = useCallback(async () => {
    const code = await callRpc('eth_getCode', [CONTRACT_ADDRESS, 'latest']);
    return code && code !== '0x';
  }, []);

  // Fetch global state
  const fetchGlobalState = useCallback(async () => {
    const data = await callRpc('eth_call', [{
      to: CONTRACT_ADDRESS,
      data: SELECTORS.getGlobalState,
    }, 'latest']);

    if (!data) {
      setContractExists(false);
      setGlobalState(null);
      return;
    }

    // Parse returned data (32-byte chunks)
    const hex = data.slice(2);
    const evolutionDay = hexToNumber('0x' + hex.slice(0, 64));
    const claimsMadeToday = hexToNumber('0x' + hex.slice(64, 128));
    const claimsRemaining = hexToNumber('0x' + hex.slice(128, 192));
    const activeAspect = hexToNumber('0x' + hex.slice(192, 256));
    const evolutionComplete = hexToNumber('0x' + hex.slice(256, 320)) === 1;

    setGlobalState({
      evolutionDay,
      claimsMadeToday,
      claimsRemaining,
      activeAspect: activeAspect === 0 ? 'FORGE' : activeAspect === 1 ? 'CHARGE' : 'GLITCH',
      evolutionComplete,
    });
    setContractExists(true);
  }, []);

  // Fetch user state
  const fetchUserState = useCallback(async () => {
    if (!address) {
      setUserState(null);
      return;
    }

    const paddedAddr = address.slice(2).padStart(64, '0');
    
    const data = await callRpc('eth_call', [{
      to: CONTRACT_ADDRESS,
      data: SELECTORS.getUserState + paddedAddr,
    }, 'latest']);

    if (!data) {
      setUserState(null);
      return;
    }

    const hex = data.slice(2);
    const levelForge = hexToNumber('0x' + hex.slice(0, 64));
    const levelCharge = hexToNumber('0x' + hex.slice(64, 128));
    const levelGlitch = hexToNumber('0x' + hex.slice(128, 192));
    const totalMinted = BigInt('0x' + hex.slice(192, 256));
    const canClaimToday = hexToNumber('0x' + hex.slice(256, 320)) === 1;

    setUserState({
      levelForge,
      levelCharge,
      levelGlitch,
      totalMinted,
      canClaimToday,
    });
  }, [address]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    
    const fetchAll = async () => {
      const exists = await checkContractExists();
      if (exists) {
        await fetchGlobalState();
        await fetchUserState();
      } else {
        setContractExists(false);
      }
      setIsLoading(false);
    };

    fetchAll();
  }, [fetchGlobalState, fetchUserState, checkContractExists]);

  // Calculate levels from user state (not global state!)
  // Contract stores levels as 10-30 (where 10 = Level 1.0, 20 = Level 2.0, 30 = Level 3.0)
  const calculatedLevels: CalculatedLevels | null = userState ? {
    forge: {
      level: Math.max(Math.floor(userState.levelForge / 10), 1), // Ensure minimum Level 1
      progress: ((userState.levelForge % 10) / 10) * 100, // Progress within current level
    },
    charge: {
      level: Math.max(Math.floor(userState.levelCharge / 10), 1),
      progress: ((userState.levelCharge % 10) / 10) * 100,
    },
    glitch: {
      level: Math.max(Math.floor(userState.levelGlitch / 10), 1),
      progress: ((userState.levelGlitch % 10) / 10) * 100,
    },
  } : null;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const exists = await checkContractExists();
    if (exists) {
      await fetchGlobalState();
      await fetchUserState();
    }
    setIsLoading(false);
  }, [fetchGlobalState, fetchUserState, checkContractExists]);

  return {
    globalState,
    userState,
    calculatedLevels,
    isLoading,
    refetch,
    contractExists,
  };
}

export default useSwordEvolution;