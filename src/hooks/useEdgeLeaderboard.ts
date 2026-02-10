/**
 * useEdgeLeaderboard - Fetches $EDGE token holders and balances
 * 
 * Parses Transfer events to find all holders, then fetches their balances.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V2 || '0x5FAE341367647F8Db2448792e793e9f46F67acb4';

// Multiple RPC endpoints for fallback
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
];

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// Zero address (for mints)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Maximum block range per query (RPC providers typically limit to 50000)
const MAX_BLOCK_RANGE = 45000;
// Contract deployment block
const DEPLOYMENT_BLOCK = 37179766; // 0x2375206

export interface LeaderboardEntry {
  address: string;
  balance: bigint;
  rank: number;
}

async function callRpc(method: string, params: unknown[] = []): Promise<unknown> {
  let lastError: Error | null = null;
  
  for (const rpcUrl of RPC_URLS) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Math.random(), method, params }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try next RPC
    }
  }
  
  // Silently fail - leaderboard is not critical for the app
  // console.error('[Leaderboard RPC] All RPCs failed:', lastError);
  // throw lastError;
  return null; // Return null instead of throwing
}

/**
 * Fetches logs in chunks to avoid exceeding RPC block range limits
 */
async function fetchLogsInChunks(
  fromBlock: number,
  toBlock: number | 'latest',
  maxChunkSize: number = MAX_BLOCK_RANGE
): Promise<Array<{ topics: string[]; data: string }>> {
  const allLogs: Array<{ topics: string[]; data: string }> = [];
  
  // Get current block number if 'latest' is specified
  let endBlock: number;
  if (toBlock === 'latest') {
    const blockNumberHex = await callRpc('eth_blockNumber') as string | null;
    if (!blockNumberHex) return []; // Silently return empty if RPC fails
    endBlock = parseInt(blockNumberHex, 16);
  } else {
    endBlock = toBlock;
  }
  
  // Calculate chunks
  let currentFrom = fromBlock;
  
  while (currentFrom <= endBlock) {
    const currentTo = Math.min(currentFrom + maxChunkSize - 1, endBlock);
    
    try {
      const logs = await callRpc('eth_getLogs', [{
        address: CONTRACT_ADDRESS,
        fromBlock: `0x${currentFrom.toString(16)}`,
        toBlock: `0x${currentTo.toString(16)}`,
        topics: [TRANSFER_TOPIC]
      }]) as Array<{ topics: string[]; data: string }> | null;
      
      if (logs && Array.isArray(logs)) {
        allLogs.push(...logs);
      }
    } catch (err) {
      // Silently skip failed chunks - not critical
      // console.error(`[Leaderboard] Error fetching chunk ${currentFrom}-${currentTo}:`, err);
      // Continue with next chunk even if one fails
    }
    
    currentFrom = currentTo + 1;
  }
  
  return allLogs;
}

export function useEdgeLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Don't auto-load
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all Transfer events (mints are from zero address)
      // Fetch in chunks to avoid exceeding RPC block range limits
      const logs = await fetchLogsInChunks(DEPLOYMENT_BLOCK, 'latest');

      // Extract unique recipient addresses (topic[2] is 'to' address)
      const holders = new Set<string>();
      if (logs && Array.isArray(logs)) {
        for (const log of logs) {
          const toAddress = log.topics[2];
          // Skip zero address
          if (toAddress !== ZERO_ADDRESS) {
            // Convert padded address to checksum format
            const address = '0x' + toAddress.slice(26);
            holders.add(address.toLowerCase());
          }
        }
      }

      if (holders.size === 0) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      // Fetch balance for each holder
      const balancePromises = Array.from(holders).map(async (address) => {
        const paddedAddr = address.slice(2).padStart(64, '0');
        const balanceHex = await callRpc('eth_call', [{
          to: CONTRACT_ADDRESS,
          data: '0x70a08231' + paddedAddr // balanceOf(address)
        }, 'latest']) as string;
        
        return {
          address,
          balance: BigInt(balanceHex || '0x0')
        };
      });

      const balances = await Promise.all(balancePromises);

      // Filter out zero balances and sort by balance descending
      const sorted = balances
        .filter(b => b.balance > BigInt(0))
        .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));

      setLeaderboard(sorted);
    } catch (err) {
      // Silently fail - leaderboard is not critical
      // console.error('[Leaderboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      setLeaderboard([]); // Show empty leaderboard on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // DISABLED: Auto-fetch causes too many 503 errors on public RPC
  // Only fetch manually when needed (e.g., button click)
  // useEffect(() => {
  //   fetchLeaderboard();
  //   const interval = setInterval(fetchLeaderboard, 30000);
  //   return () => clearInterval(interval);
  // }, [fetchLeaderboard]);

  return { leaderboard, isLoading, error, refetch: fetchLeaderboard };
}

// Helper to format balance (100 EDGE = 100000000000000000000 wei)
export function formatEdgeBalance(balance: bigint): string {
  const edge = Number(balance / BigInt(1e18));
  return edge.toLocaleString();
}

// Helper to format address
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
