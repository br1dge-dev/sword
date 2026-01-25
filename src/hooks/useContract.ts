'use client';

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

// Contract addresses (to be updated after deployment)
const CONTRACT_ADDRESSES = {
  [base.id]: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  [baseSepolia.id]: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

// Use testnet in development, mainnet in production
const DEFAULT_CHAIN_ID = process.env.NODE_ENV === 'production' ? base.id : baseSepolia.id;

// Contract ABI (subset of functions we need)
const SWORD_EVOLUTION_ABI = [
  // Read functions
  {
    name: 'getActiveChallenge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'trackId', type: 'uint256' },
      { name: 'trackName', type: 'string' },
      { name: 'startOffsetMs', type: 'uint256' },
      { name: 'endOffsetMs', type: 'uint256' },
    ],
  },
  {
    name: 'getUserState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddr', type: 'address' }],
    outputs: [
      { name: 'levelForge', type: 'uint8' },
      { name: 'levelCharge', type: 'uint8' },
      { name: 'levelGlitch', type: 'uint8' },
      { name: 'totalMinted', type: 'uint256' },
      { name: 'canClaimToday', type: 'bool' },
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
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'remainingClaimsToday',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write functions
  {
    name: 'claimChallenge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'merkleProof', type: 'bytes32[]' },
      { name: 'score', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'advanceDay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

// Get contract address for current chain
function getContractAddress(chainId?: number): `0x${string}` {
  const id = chainId || DEFAULT_CHAIN_ID;
  return CONTRACT_ADDRESSES[id as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
}

// ============ Hooks ============

/**
 * Get current active challenge info
 */
export function useActiveChallenge() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: getContractAddress(),
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getActiveChallenge',
  });

  return {
    trackId: data?.[0],
    trackName: data?.[1],
    startOffsetMs: data?.[2] ? Number(data[2]) : undefined,
    endOffsetMs: data?.[3] ? Number(data[3]) : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get user's current state
 */
export function useUserState() {
  const { address } = useAccount();
  
  const { data, isLoading, error, refetch } = useReadContract({
    address: getContractAddress(),
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getUserState',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Convert internal level representation (10-30) to display (1.0-3.0)
  const toDisplayLevel = (internalLevel: number) => internalLevel / 10;

  return {
    levelForge: data?.[0] ? toDisplayLevel(data[0]) : 1.0,
    levelCharge: data?.[1] ? toDisplayLevel(data[1]) : 1.0,
    levelGlitch: data?.[2] ? toDisplayLevel(data[2]) : 1.0,
    totalMinted: data?.[3] ? Number(data[3]) / 1e18 : 0, // Convert from wei
    canClaimToday: data?.[4] ?? false,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get global evolution state
 */
export function useGlobalState() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: getContractAddress(),
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'getGlobalState',
  });

  const aspectNames = ['FORGE', 'CHARGE', 'GLITCH'] as const;

  return {
    evolutionDay: data?.[0] ? Number(data[0]) : 1,
    claimsMadeToday: data?.[1] ?? 0,
    claimsRemaining: data?.[2] ?? 10,
    activeAspect: aspectNames[data?.[3] ?? 0],
    evolutionComplete: data?.[4] ?? false,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get user's $EDGE balance
 */
export function useEdgeBalance(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: getContractAddress(),
    abi: SWORD_EVOLUTION_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  return {
    balance: data ? Number(data) / 1e18 : 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Claim a challenge completion
 */
export function useClaimChallenge() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async (merkleProof: `0x${string}`[], score: number) => {
    writeContract({
      address: getContractAddress(),
      abi: SWORD_EVOLUTION_ABI,
      functionName: 'claimChallenge',
      args: [merkleProof, score],
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Check if wallet is connected and on correct chain
 */
export function useWalletStatus() {
  const { address, isConnected, chain } = useAccount();
  
  const isCorrectChain = chain?.id === base.id || chain?.id === baseSepolia.id;
  
  return {
    address,
    isConnected,
    isCorrectChain,
    chainName: chain?.name,
  };
}
