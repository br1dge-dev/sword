import { type NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';

// Use Node.js runtime for full env access
export const runtime = 'nodejs';

// EIP-712 Domain - muss exakt zum Contract passen
const DOMAIN = {
  name: 'GR1FTSWORD',
  version: '1',
} as const;

const CLAIM_TYPES = {
  Claim: [
    { name: 'user', type: 'address' },
    { name: 'score', type: 'uint256' },  // FIXED: Contract expects uint256, not uint8
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
    // duration is 45 seconds (hardcoded in hitmap)
    const calculatedScore = calculateServerScore(userClicks, hitmap, startOffsetMs, 45);
    
    if (calculatedScore < 70) {
      return NextResponse.json(
        { error: 'Score too low', calculatedScore, required: 70 },
        { status: 403 }
      );
    }

    // 4. Check score matches (prevent manipulation) - allow 10% tolerance for timing differences
    console.log('[SignChallenge] Score validation:', { calculatedScore, providedScore: score, diff: Math.abs(calculatedScore - score) });
    if (Math.abs(calculatedScore - score) > 10) {
      return NextResponse.json(
        { error: 'Score mismatch', calculatedScore, providedScore: score },
        { status: 403 }
      );
    }

    // 5. Create signature
    const privateKey = process.env.SIGNER_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      console.error('[SignChallenge] Missing SIGNER_PRIVATE_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing SIGNER_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(privateKey);
    
    // Determine chain and contract address
    // For now, always use Base Sepolia (testnet)
    const chain = baseSepolia;
    const contractAddress = process.env.CONTRACT_ADDRESS_BASE_SEPOLIA 
      || process.env.CONTRACT_ADDRESS
      || '0x3F7d8503ee9A8E781248605822f67A4Eeec30081'; // V2 Contract on Base Sepolia
    
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      console.error('[SignChallenge] Contract address not configured');
      return NextResponse.json(
        { error: 'Contract address not configured. Please set CONTRACT_ADDRESS_BASE_SEPOLIA in Vercel.' },
        { status: 500 }
      );
    }
    
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
        verifyingContract: contractAddress as `0x${string}`,
      },
      types: CLAIM_TYPES,
      primaryType: 'Claim',
      message: {
        user: user as `0x${string}`,
        score: BigInt(score),  // FIXED: Must be bigint for uint256
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
  startOffsetMs: number,
  durationSec: number = 45
): number {
  // hitmap and userClicks are already relative to startOffset (0 to duration)
  // No need to add startOffsetMs
  const toleranceSec = 0.15; // 150ms

  // Filter beats within challenge window (already relative, so just check against duration)
  const beatsInWindow = hitmap.filter(
    beat => beat >= 0 && beat <= durationSec
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
