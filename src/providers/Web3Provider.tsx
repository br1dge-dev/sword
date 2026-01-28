/**
 * Web3Provider - Minimal wagmi/viem setup for contract interaction
 * 
 * Provides wallet connection and contract read capabilities.
 * Uses Base Sepolia for testnet, Base for production.
 */
'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

// Create wagmi config with both chains available
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // Create query client once per component instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };
