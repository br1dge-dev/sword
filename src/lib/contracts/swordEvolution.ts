/**
 * Contract configuration for SwordEvolution
 * 
 * Contains ABI, addresses, and chain configuration
 */

import { baseSepolia, base } from 'wagmi/chains';

// Contract addresses - loaded from environment or fallback to env vars
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA || '0x573b1236601083f0389d6826f35dcc7762e40ee5') as `0x${string}`,
  [base.id]: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE || '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

// Target chain for the app
export const TARGET_CHAIN = process.env.NODE_ENV === 'production' ? base : baseSepolia;

// SwordEvolution Contract ABI
export const SWORD_EVOLUTION_ABI = [
  // Read functions
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
    name: 'canClaim',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'remainingClaimsToday',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentDay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimsToday',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'score', type: 'uint8' },
      { name: 'startOffsetMs', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'claimWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'startOffsetMs', type: 'uint256' },
      { indexed: false, name: 'score', type: 'uint8' },
      { indexed: false, name: 'edgeMinted', type: 'uint256' },
    ],
    name: 'ChallengeClaimed',
    type: 'event',
  },
  // Errors
  {
    inputs: [],
    name: 'MaxClaimsReached',
    type: 'error',
  },
  {
    inputs: [],
    name: 'AlreadyClaimedToday',
    type: 'error',
  },
  {
    inputs: [
      { name: 'score', type: 'uint8' },
      { name: 'required', type: 'uint8' },
    ],
    name: 'ScoreTooLow',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SignatureExpired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EvolutionComplete',
    type: 'error',
  },
] as const;

// Contract constants from the Solidity contract
export const CONTRACT_CONSTANTS = {
  MAX_SUPPLY: BigInt('60000000000000000000000'), // 60,000 EDGE (60,000 * 10^18)
  EDGE_PER_CLAIM: BigInt('100000000000000000000'), // 100 EDGE (100 * 10^18)
  MAX_CLAIMS_PER_DAY: 10,
  CHALLENGE_WINDOW_MS: 45000,
  MIN_SCORE: 70,
  STEPS_PER_LEVEL: 10,
  MAX_LEVEL: 30,
  START_LEVEL: 10,
  TOTAL_DAYS: 60,
} as const;

// Helper to get contract address for current chain
export function getContractAddress(chainId: number): `0x${string}` | undefined {
  return CONTRACT_ADDRESSES[chainId];
}
