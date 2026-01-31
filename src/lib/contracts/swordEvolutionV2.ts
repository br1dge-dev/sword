/**
 * Contract configuration for SwordEvolution V2 (Corrected)
 * 
 * 60 days, 60 steps, all aspects level up together
 */

export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  84532: '0x3F7d8503ee9A8E781248605822f67A4Eeec30081', // Base Sepolia V2
  8453: '0x0000000000000000000000000000000000000000',  // Base Mainnet V2 (future)
};

export const TARGET_CHAIN_ID = 84532;

export const SWORD_EVOLUTION_V2_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'getActiveAspect',
    outputs: [{ name: '', type: 'uint8' }],      // 0=FORGE, 1=CHARGE, 2=GLITCH
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentRound',
    outputs: [{ name: '', type: 'uint8' }],      // 0-19
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'forgeLevel',
    outputs: [{ name: '', type: 'uint8' }],      // 10-30
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'chargeLevel',
    outputs: [{ name: '', type: 'uint8' }],      // 10-30
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'glitchLevel',
    outputs: [{ name: '', type: 'uint8' }],      // 10-30
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAspectLevels',
    outputs: [
      { name: 'forgeLevel', type: 'uint8' },      // 10-30
      { name: 'chargeLevel', type: 'uint8' },     // 10-30
      { name: 'glitchLevel', type: 'uint8' },     // 10-30
      { name: 'forgeProgress', type: 'uint8' },   // 0-9
      { name: 'chargeProgress', type: 'uint8' },  // 0-9
      { name: 'glitchProgress', type: 'uint8' },  // 0-9
      { name: 'activeAspect', type: 'uint8' },    // 0=FORGE, 1=CHARGE, 2=GLITCH
      { name: 'daysRemainingInAspect', type: 'uint8' }, // 0-20
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGlobalState',
    outputs: [
      { name: 'day', type: 'uint256' },
      { name: 'claimsToday', type: 'uint8' },
      { name: 'claimsRemaining', type: 'uint8' },
      { name: 'activeAspect', type: 'uint8' },    // 0=FORGE, 1=CHARGE, 2=GLITCH
      { name: 'currentRound', type: 'uint8' },    // 0, 1, or 2
      { name: 'evolutionComplete', type: 'bool' },
      { name: 'canAdvanceDay', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserState',
    outputs: [
      { name: 'totalClaims', type: 'uint256' },
      { name: 'totalMinted', type: 'uint256' },
      { name: 'canClaimToday', type: 'bool' },
      { name: 'lastClaimDay', type: 'uint256' },
    ],
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
    name: 'stepClaimedToday',
    outputs: [{ name: '', type: 'bool' }],
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
  {
    inputs: [],
    name: 'advanceDay',
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
      { indexed: false, name: 'newGlobalProgress', type: 'uint8' },
    ],
    name: 'ChallengeClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'newProgress', type: 'uint8' },
      { indexed: false, name: 'currentLevel', type: 'uint8' },
    ],
    name: 'GlobalProgressIncreased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'newDay', type: 'uint256' },
      { indexed: false, name: 'claimsYesterday', type: 'uint8' },
      { indexed: false, name: 'globalProgress', type: 'uint8' },
    ],
    name: 'DayAdvanced',
    type: 'event',
  },
  // Errors
  { inputs: [], name: 'EvolutionComplete', type: 'error' },
  { inputs: [], name: 'MaxClaimsReached', type: 'error' },
  { inputs: [], name: 'AlreadyClaimedToday', type: 'error' },
  { inputs: [{ name: 'score', type: 'uint8' }, { name: 'required', type: 'uint8' }], name: 'ScoreTooLow', type: 'error' },
  { inputs: [], name: 'InvalidSignature', type: 'error' },
  { inputs: [], name: 'SignatureExpired', type: 'error' },
  { inputs: [], name: 'TooEarly', type: 'error' },
] as const;

export const CONTRACT_CONSTANTS = {
  MAX_SUPPLY: BigInt('60000000000000000000000'),
  EDGE_PER_CLAIM: BigInt('100000000000000000000'),
  MAX_CLAIMS_PER_DAY: 10,
  TOTAL_STEPS: 60, // 3 aspects × 20 steps
  TOTAL_DAYS: 60,
  MIN_SCORE: 70,
} as const;

export function getContractAddress(chainId: number): `0x${string}` | undefined {
  return CONTRACT_ADDRESSES[chainId];
}
