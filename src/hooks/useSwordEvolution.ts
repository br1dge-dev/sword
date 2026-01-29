/**
 * useSwordEvolution - Hook for reading SwordEvolution contract data
 *
 * Provides global state (evolution day, claims, active aspect)
 * and calculates levels from the contract data.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

// Contract address - should be in environment variables
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA || process.env.CONTRACT_ADDRESS_BASE_SEPOLIA) as `0x${string}` || '0x';

// Minimal ABI for getGlobalState
const SWORD_EVOLUTION_ABI = [
  {
    inputs: [],
    name: 'getGlobalState',
    outputs: [
      { name: 'evolutionDay', type: 'uint256' },
      { name: 'claimsMadeToday', type: 'uint8' },
      { name: 'claimsRemaining', type: 'uint8' },
      { name: 'activeAspect', type: 'uint8' },
      { name: 'evolutionComplete', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'userAddr', type: 'address' }],
    name: 'getUserState',
    outputs: [
      { name: 'levelForge', type: 'uint8' },
      { name: 'levelCharge', type: 'uint8' },
      { name: 'levelGlitch', type: 'uint8' },
      { name: 'totalMinted', type: 'uint256' },
      { name: 'canClaimToday', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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
  forge: { level: number; progress: number }; // level 1-3, progress 0-100
  charge: { level: number; progress: number };
  glitch: { level: number; progress: number };
}

export function useSwordEvolution() {
  const { address } = useAccount();

  // Read global state from contract
  const {
    data: globalStateData,
    isLoading: isGlobalLoading,
    error: globalError,
    refetch: refetchGlobal,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getGlobalState',
    chainId: baseSepolia.id,
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Read user state from contract
  const {
    data: userStateData,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getUserState',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  });

  // Parse global state
  const globalState: GlobalState | null = globalStateData ? {
    evolutionDay: Number(globalStateData[0]),
    claimsMadeToday: Number(globalStateData[1]),
    claimsRemaining: Number(globalStateData[2]),
    activeAspect: globalStateData[3] === 0 ? 'FORGE' : globalStateData[3] === 1 ? 'CHARGE' : 'GLITCH',
    evolutionComplete: globalStateData[4],
  } : null;

  // Parse user state
  const userState: UserState | null = userStateData ? {
    levelForge: Number(userStateData[0]),
    levelCharge: Number(userStateData[1]),
    levelGlitch: Number(userStateData[2]),
    totalMinted: userStateData[3],
    canClaimToday: userStateData[4],
  } : null;

  // Calculate levels from evolution day (global system)
  // Level range: 1-3 (internally 10-30, divided by 10)
  const calculatedLevels: CalculatedLevels | null = globalState ? {
    forge: {
      level: Math.min(Math.floor(globalState.evolutionDay / 20) + 1, 3),
      progress: ((globalState.evolutionDay % 20) / 20) * 100,
    },
    charge: {
      level: Math.min(Math.floor((globalState.evolutionDay - 20) / 20) + 1, 3),
      progress: globalState.evolutionDay > 20 ? (((globalState.evolutionDay - 20) % 20) / 20) * 100 : 0,
    },
    glitch: {
      level: Math.min(Math.floor((globalState.evolutionDay - 40) / 20) + 1, 3),
      progress: globalState.evolutionDay > 40 ? (((globalState.evolutionDay - 40) % 20) / 20) * 100 : 0,
    },
  } : null;

  return {
    globalState,
    userState,
    calculatedLevels,
    isLoading: isGlobalLoading || isUserLoading,
    error: globalError || userError,
    refetch: () => {
      refetchGlobal();
      refetchUser();
    },
  };
}

export default useSwordEvolution;