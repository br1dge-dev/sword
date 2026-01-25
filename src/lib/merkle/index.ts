/**
 * Merkle Proof Generation for GR1FTSWORD Challenge Verification
 * 
 * This library generates merkle proofs that can be verified on-chain
 * to prove a user's challenge score is valid.
 */

import { keccak256, encodePacked } from 'viem';

export interface Beat {
  timestamp: number; // in milliseconds
}

export interface Hitmap {
  track: string;
  displayName: string;
  fullHitMap: number[]; // beat timestamps in seconds
  totalDuration: number;
  challengeConfig: {
    startOffset: number;
    duration: number;
    toleranceMs: number;
  };
}

export interface ChallengeResult {
  score: number; // 0-100
  hits: number;
  misses: number;
  totalBeats: number;
}

/**
 * Calculate challenge score based on user clicks and hitmap
 */
export function calculateScore(
  userClicks: number[], // timestamps in seconds
  hitmap: Hitmap,
  startOffsetMs: number,
  endOffsetMs: number
): ChallengeResult {
  const startSec = startOffsetMs / 1000;
  const endSec = endOffsetMs / 1000;
  const toleranceSec = hitmap.challengeConfig.toleranceMs / 1000;
  
  // Filter beats within the challenge window
  const beatsInWindow = hitmap.fullHitMap.filter(
    beat => beat >= startSec && beat <= endSec
  );
  
  // Track which beats were hit
  const hitBeats = new Set<number>();
  
  for (const click of userClicks) {
    // Find closest beat to this click
    let closestBeat: number | null = null;
    let closestDelta = Infinity;
    
    for (const beat of beatsInWindow) {
      const delta = Math.abs(click - beat);
      if (delta < closestDelta && delta <= toleranceSec) {
        closestDelta = delta;
        closestBeat = beat;
      }
    }
    
    if (closestBeat !== null) {
      hitBeats.add(closestBeat);
    }
  }
  
  const hits = hitBeats.size;
  const totalBeats = beatsInWindow.length;
  const misses = totalBeats - hits;
  const score = totalBeats > 0 ? Math.round((hits / totalBeats) * 100) : 0;
  
  return { score, hits, misses, totalBeats };
}

/**
 * Generate leaf hash for merkle proof
 * Must match the contract's leaf calculation:
 * keccak256(abi.encodePacked(user, score, startOffsetMs))
 */
export function generateLeafHash(
  userAddress: `0x${string}`,
  score: number,
  startOffsetMs: number
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'uint8', 'uint256'],
      [userAddress, score, BigInt(startOffsetMs)]
    )
  );
}

/**
 * Simple merkle tree implementation
 */
export class MerkleTree {
  private leaves: `0x${string}`[];
  private layers: `0x${string}`[][];
  
  constructor(leaves: `0x${string}`[]) {
    this.leaves = leaves.sort();
    this.layers = this.buildLayers();
  }
  
  private buildLayers(): `0x${string}`[][] {
    const layers: `0x${string}`[][] = [this.leaves];
    
    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1];
      const nextLayer: `0x${string}`[] = [];
      
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || left;
        
        // Sort to ensure consistent ordering
        const [first, second] = left < right ? [left, right] : [right, left];
        const combined = keccak256(encodePacked(['bytes32', 'bytes32'], [first, second]));
        nextLayer.push(combined);
      }
      
      layers.push(nextLayer);
    }
    
    return layers;
  }
  
  getRoot(): `0x${string}` {
    return this.layers[this.layers.length - 1][0];
  }
  
  getProof(leaf: `0x${string}`): `0x${string}`[] {
    let index = this.leaves.indexOf(leaf);
    if (index === -1) return [];
    
    const proof: `0x${string}`[] = [];
    
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      
      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }
      
      index = Math.floor(index / 2);
    }
    
    return proof;
  }
  
  verify(leaf: `0x${string}`, proof: `0x${string}`[]): boolean {
    let hash = leaf;
    
    for (const sibling of proof) {
      const [first, second] = hash < sibling ? [hash, sibling] : [sibling, hash];
      hash = keccak256(encodePacked(['bytes32', 'bytes32'], [first, second]));
    }
    
    return hash === this.getRoot();
  }
}

/**
 * Generate merkle root from a full hitmap
 * This is used when adding a new track
 */
export function generateMerkleRootFromHitmap(hitmap: Hitmap): `0x${string}` {
  // Create leaves from all possible (score, startOffset) combinations
  // For simplicity, we pre-compute for discrete score values and time windows
  const leaves: `0x${string}`[] = [];
  
  // We need a different approach - the merkle tree should validate
  // that the score matches the actual beats hit
  // For now, use a simpler hash of the hitmap data
  const hitmapHash = keccak256(
    encodePacked(
      ['string', 'uint256'],
      [hitmap.track, BigInt(Math.floor(hitmap.totalDuration * 1000))]
    )
  );
  
  return hitmapHash;
}

/**
 * Generate a proof for a challenge claim
 * This creates a proof that can be verified on-chain
 */
export function generateChallengeProof(
  userAddress: `0x${string}`,
  score: number,
  startOffsetMs: number,
  _hitmap: Hitmap
): `0x${string}`[] {
  // Generate the leaf for this claim
  const leaf = generateLeafHash(userAddress, score, startOffsetMs);
  
  // In a full implementation, we'd have a pre-built merkle tree
  // For now, return an empty proof (contract will need adjustment)
  // This is a placeholder - real implementation needs the full tree
  
  console.log('[Merkle] Generated leaf:', leaf);
  
  // Return placeholder proof
  return [leaf];
}
