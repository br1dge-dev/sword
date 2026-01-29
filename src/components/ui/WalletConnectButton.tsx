/**
 * WalletConnectButton - Simple Connect/Disconnect wallet button
 *
 * Uses wagmi's useAccount and useConnect hooks.
 */
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useCallback, useState } from 'react';
import { injected } from 'wagmi/connectors';

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className = '' }: WalletConnectButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = useCallback(async () => {
    // Try injected connector first (MetaMask, Coinbase Wallet, etc.)
    connect({ connector: injected() });
  }, [connect]);

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get chain name
  const getChainName = (id: number) => {
    if (id === 84532) return 'Base Sepolia';
    if (id === 8453) return 'Base';
    return `Chain ${id}`;
  };

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="px-3 py-2 bg-black/80 border border-grifter-green rounded-lg">
          <div className="text-xs font-mono text-grifter-green/60">CONNECTED</div>
          <div className="text-sm font-mono text-grifter-green">{formatAddress(address)}</div>
          <div className="text-[10px] font-mono text-grifter-green/40">{getChainName(chainId || 0)}</div>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 text-xs font-press-start-2p bg-black border border-grifter-pink text-grifter-pink rounded hover:bg-grifter-pink hover:text-black transition-colors"
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className={`px-4 py-2 text-xs font-press-start-2p bg-black border border-grifter-blue text-grifter-blue rounded hover:bg-grifter-blue hover:text-black transition-colors ${className}`}
    >
      CONNECT WALLET
    </button>
  );
}

export default WalletConnectButton;