/**
 * WalletConnectButton - Direct ethereum provider connection
 * 
 * No wagmi, no hydration issues. Just raw window.ethereum.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

// Extend window type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: any) => void;
      removeListener: (event: string, handler: any) => void;
      isMetaMask?: boolean;
    };
  }
}

// Base Sepolia chain ID
const TARGET_CHAIN_ID = '0x14a34'; // 84532 in hex
const TARGET_CHAIN_ID_DECIMAL = 84532;

export function WalletConnectButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasEthereum, setHasEthereum] = useState(false);

  // Check for ethereum provider
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasEthereum(true);
      
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      });
      
      // Get current chain
      window.ethereum.request({ method: 'eth_chainId' }).then((chain: string) => {
        setChainId(parseInt(chain, 16));
      });

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      };
      
      const handleChainChanged = (chain: string) => {
        setChainId(parseInt(chain, 16));
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleClick = useCallback(async () => {
    if (!window.ethereum) return;

    if (account) {
      // Disconnect (just clear local state, wallet stays connected)
      setAccount(null);
    } else {
      setIsConnecting(true);
      try {
        // Request accounts
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          
          // Check/switch chain
          const currentChain = await window.ethereum.request({
            method: 'eth_chainId',
          });
          
          if (currentChain !== TARGET_CHAIN_ID) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: TARGET_CHAIN_ID }],
              });
            } catch (switchError: any) {
              // Chain not added, try to add it
              if (switchError.code === 4902) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: TARGET_CHAIN_ID,
                    chainName: 'Base Sepolia',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://sepolia.base.org'],
                    blockExplorerUrls: ['https://sepolia.basescan.org'],
                  }],
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Connection error:', err);
      }
      setIsConnecting(false);
    }
  }, [account]);

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-2)}`;

  // No ethereum provider
  if (!hasEthereum) {
    return (
      <button 
        className="relative px-3 py-1.5 text-xs font-mono bg-black/80 border border-red-500/60 rounded opacity-50 cursor-not-allowed"
        disabled
        title="No wallet detected"
      >
        <span className="text-red-500">NO WALLET</span>
      </button>
    );
  }

  // Connected
  if (account) {
    const isWrongChain = chainId !== TARGET_CHAIN_ID_DECIMAL;
    return (
      <button
        onClick={handleClick}
        className="relative px-3 py-1.5 text-xs font-mono bg-black/80 border border-grifter-green/60 rounded hover:border-grifter-pink transition-all cursor-pointer z-[100]"
        title="Click to disconnect"
      >
        <span className={isWrongChain ? 'text-red-500' : 'text-grifter-green hover:text-grifter-pink'}>
          {isWrongChain ? 'WRONG CHAIN' : formatAddress(account)}
        </span>
      </button>
    );
  }

  // Disconnected
  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className="relative px-3 py-1.5 text-xs font-mono bg-black/80 border border-grifter-blue/60 rounded hover:border-grifter-blue transition-all cursor-pointer z-[100] disabled:opacity-50"
    >
      <span className="text-grifter-blue">
        {isConnecting ? '...' : 'CONNECT'}
      </span>
    </button>
  );
}

export default WalletConnectButton;
