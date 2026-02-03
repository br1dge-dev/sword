/**
 * useEdgeLeaderboard - Fetches $EDGE token holders and balances
 * 
 * Parses Transfer events to find all holders, then fetches their balances.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_V2 || '0x755f48d8130bab70dd7Fd69bba037Ea9400b6365';

// Multiple RPC endpoints for fallback
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
];

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// Zero address (for mints)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

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
  
  console.error('[Leaderboard RPC] All RPCs failed:', lastError);
  throw lastError;
}

export function useEdgeLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all Transfer events (mints are from zero address)
      const logs = await callRpc('eth_getLogs', [{
        address: CONTRACT_ADDRESS,
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: [TRANSFER_TOPIC]
      }]) as Array<{ topics: string[]; data: string }>;

      // Extract unique recipient addresses (topic[2] is 'to' address)
      const holders = new Set<string>();
      for (const log of logs) {
        const toAddress = log.topics[2];
        // Skip zero address
        if (toAddress !== ZERO_ADDRESS) {
          // Convert padded address to checksum format
          const address = '0x' + toAddress.slice(26);
          holders.add(address.toLowerCase());
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
      console.error('[Leaderboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

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
