import { type NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';

export const runtime = 'edge';

// EIP-712 Domain - muss exakt zum Contract passen
const DOMAIN = {
  name: 'GR1FTSWORD',
  version: '1',
} as const;

const CLAIM_TYPES = {
  Claim: [
    { name: 'user', type: 'address' },
    { name: 'score', type: 'uint8' },
    { name: 'startOffsetMs', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/**
 * POST /api/sign-challenge
 * 
 * Validates challenge completion and returns EIP-712 signature
 * 
 * Body: {
 *   user: string (address)
 *   score: number (0-100)
 *   startOffsetMs: number
 *   hitmap: number[] (beat timestamps)
 *   userClicks: number[] (user click timestamps)
 * }
 * 
 * Response: {
 *   signature: string,
 *   deadline: number,
 *   v: number,
 *   r: string,
 *   s: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const body = await request.json();
    const { user, score, startOffsetMs, hitmap, userClicks } = body;

    // 2. Validate inputs
    if (!user || !score || !startOffsetMs || !hitmap || !userClicks) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Validate score (recalculate on server to prevent cheating)
    const calculatedScore = calculateServerScore(userClicks, hitmap, startOffsetMs);
    
    if (calculatedScore < 70) {
      return NextResponse.json(
        { error: 'Score too low', calculatedScore, required: 70 },
        { status: 403 }
      );
    }

    // 4. Check score matches (prevent manipulation)
    if (Math.abs(calculatedScore - score) > 5) {
      return NextResponse.json(
        { error: 'Score mismatch', calculatedScore, providedScore: score },
        { status: 403 }
      );
    }

    // 5. Create signature
    const privateKey = process.env.SIGNER_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(privateKey);
    
    // Determine chain from environment
    const isProduction = process.env.NODE_ENV === 'production';
    const chain = isProduction ? base : baseSepolia;
    
    const client = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    // Deadline: 5 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // Create EIP-712 signature
    const signature = await client.signTypedData({
      domain: {
        ...DOMAIN,
        chainId: chain.id,
        verifyingContract: process.env.CONTRACT_ADDRESS as `0x${string}`,
      },
      types: CLAIM_TYPES,
      primaryType: 'Claim',
      message: {
        user: user as `0x${string}`,
        score: Number(score),
        startOffsetMs: BigInt(startOffsetMs),
        deadline: BigInt(deadline),
      },
    });

    // Parse signature into v, r, s
    const sig = signature.slice(2);
    const v = parseInt(sig.slice(128, 130), 16);
    const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
    const s = `0x${sig.slice(64, 128)}` as `0x${string}`;

    return NextResponse.json({
      signature,
      deadline,
      v,
      r,
      s,
      calculatedScore,
    });

  } catch (error) {
    console.error('[Sign Challenge Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate score server-side to prevent client-side manipulation
 */
function calculateServerScore(
  userClicks: number[],
  hitmap: number[],
  startOffsetMs: number
): number {
  const startSec = startOffsetMs / 1000;
  const endSec = startSec + 45; // 45s window
  const toleranceSec = 0.15; // 150ms

  // Filter beats within challenge window
  const beatsInWindow = hitmap.filter(
    beat => beat >= startSec && beat <= endSec
  );

  // Track which beats were hit
  const hitBeats = new Set<number>();

  for (const click of userClicks) {
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
  
  return totalBeats > 0 ? Math.round((hits / totalBeats) * 100) : 0;
}
