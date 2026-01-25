"use client";

/**
 * WalletIndicator Component
 * 
 * Minimalistischer Indikator für den Wallet-Status.
 * Zeigt verkürzte Adresse wenn verbunden, klickbar zum Disconnecten.
 */
import React from 'react';
import { useWalletStatus } from '@/hooks/useContract';
import { useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface WalletIndicatorProps {
  className?: string;
}

export default function WalletIndicator({ className = '' }: WalletIndicatorProps) {
  const { isConnected, address } = useWalletStatus();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}..${addr.slice(-3)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={() => openConnectModal?.()}
        className={`font-press-start-2p text-xs px-3 py-1.5 border border-grifter-blue/40 rounded 
                   text-grifter-blue/60 hover:text-grifter-blue hover:border-grifter-blue 
                   transition-all bg-black/50 backdrop-blur-sm ${className}`}
      >
        CONNECT
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className={`font-press-start-2p text-xs px-3 py-1.5 border border-grifter-green/40 rounded 
                 text-grifter-green/80 hover:text-grifter-pink hover:border-grifter-pink 
                 transition-all bg-black/50 backdrop-blur-sm group ${className}`}
      title="Click to disconnect"
    >
      <span className="group-hover:hidden">{formatAddress(address!)}</span>
      <span className="hidden group-hover:inline">EXIT</span>
    </button>
  );
}
