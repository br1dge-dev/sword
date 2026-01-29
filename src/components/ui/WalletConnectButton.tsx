/**
 * WalletConnectButton - Minimal wallet button
 *
 * Shows shortened address, hover to disconnect.
 */
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useCallback } from 'react';
import { injected } from 'wagmi/connectors';

export function WalletConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleClick = useCallback(async () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ connector: injected() });
    }
  }, [isConnected, connect, disconnect]);

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-2)}`;

  if (isConnected && address) {
    return (
      <button
        onClick={handleClick}
        className="group relative px-3 py-1.5 text-xs font-mono bg-black/60 border border-grifter-green/40 rounded hover:border-grifter-pink transition-all"
      >
        <span className="text-grifter-green group-hover:text-grifter-pink transition-colors">
          {formatAddress(address)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 text-xs font-mono bg-black/60 border border-grifter-blue/40 rounded hover:border-grifter-blue transition-all"
    >
      <span className="text-grifter-blue">CONNECT</span>
    </button>
  );
}

export default WalletConnectButton;