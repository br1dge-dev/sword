/**
 * ClaimRewardButton - Direct ethereum provider claim
 * 
 * No wagmi, no hydration issues. Just raw window.ethereum.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData } from 'viem';
import { useChallengeStore } from '@/store/challengeStore';
import { 
  SWORD_EVOLUTION_ABI, 
  getContractAddress, 
  TARGET_CHAIN,
  CONTRACT_CONSTANTS,
} from '@/lib/contracts/swordEvolution';

// Base Sepolia chain ID
const TARGET_CHAIN_ID = '0x14a34'; // 84532 in hex
const TARGET_CHAIN_ID_DECIMAL = 84532;

interface ClaimRewardButtonProps {
  onSuccess?: () => void;
}

export function ClaimRewardButton({ onSuccess }: ClaimRewardButtonProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [hasEthereum, setHasEthereum] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const { accuracy, hitMap, getClaimData } = useChallengeStore();
  const [canClaimToday, setCanClaimToday] = useState<boolean | null>(null);
  const [isCheckingClaimStatus, setIsCheckingClaimStatus] = useState(false);

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

      // Listen for changes
      const handleAccountsChanged = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      };
      
      const handleChainChanged = (chain: string) => {
        setChainId(parseInt(chain, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Check if user can claim today (pre-flight check)
  const checkCanClaim = useCallback(async (userAddress: string) => {
    if (!userAddress) return;
    
    setIsCheckingClaimStatus(true);
    try {
      const contractAddress = getContractAddress(TARGET_CHAIN_ID_DECIMAL);
      if (!contractAddress) return;

      // Encode canClaim call
      const paddedAddr = userAddress.slice(2).padStart(64, '0');
      const canClaimSelector = '0x7d2ec202'; // keccak256("canClaim(address)")
      
      const data = await window.ethereum?.request({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: canClaimSelector + paddedAddr,
        }, 'latest'],
      });

      // Parse result: 0x000...000 = false, 0x000...001 = true
      const canClaim = data && data !== '0x' && parseInt(data, 16) === 1;
      setCanClaimToday(canClaim);
    } catch (err) {
      setCanClaimToday(null);
    }
    setIsCheckingClaimStatus(false);
  }, []);

  // Check claim status when account changes
  useEffect(() => {
    if (account) {
      checkCanClaim(account);
    }
  }, [account, checkCanClaim]);

  const handleClaim = useCallback(async () => {
    if (!window.ethereum) return;
    
    setStatus('working');
    setErrorMsg('');
    setTxHash(null);

    try {
      // 1. Connect if needed
      let currentAccount = account;
      if (!currentAccount) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length === 0) {
          throw new Error('No account selected');
        }
        currentAccount = accounts[0];
        setAccount(currentAccount);
      }

      // 2. Check/switch chain
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
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: TARGET_CHAIN_ID,
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      // 3. Pre-flight check: Can user claim today?
      if (currentAccount) {
        await checkCanClaim(currentAccount);
        if (canClaimToday === false) {
          throw new Error('Already claimed today! Come back tomorrow.');
        }
      }

      // 4. Check score
      const score = Math.round(accuracy);
      if (score < CONTRACT_CONSTANTS.MIN_SCORE) {
        throw new Error(`Need ${CONTRACT_CONSTANTS.MIN_SCORE}% score`);
      }

      // 5. Get claim data
      const claimData = getClaimData();
      if (!claimData || !hitMap) {
        throw new Error('No challenge data');
      }

      // 6. Get signature from server
      const startOffsetMs = Math.round(hitMap.challengeConfig.startOffset * 1000);
      
      const res = await fetch('/api/sign-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentAccount,
          score,
          startOffsetMs,
          hitmap: claimData.hitmap,
          userClicks: claimData.userClicks,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.includes('Server configuration error')) {
          throw new Error('Server not configured. Please contact support.');
        }
        throw new Error(err.error || 'Server error');
      }

      const { v, r, s, deadline } = await res.json();

      // 7. Send transaction
      const contractAddress = getContractAddress(TARGET_CHAIN_ID_DECIMAL);
      if (!contractAddress) throw new Error('Contract not configured');

      // Encode function call with viem
      const data = encodeFunctionData({
        abi: SWORD_EVOLUTION_ABI,
        functionName: 'claimWithSignature',
        args: [
          score,
          BigInt(startOffsetMs),
          BigInt(deadline),
          v,
          r,
          s,
        ],
      });

      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: currentAccount,
          to: contractAddress,
          data,
        }],
      });

      setTxHash(tx);
      setStatus('done');
      onSuccess?.(); // Notify parent component

    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Error';
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [account, accuracy, hitMap, getClaimData, canClaimToday, checkCanClaim]);

  // No ethereum provider
  if (!hasEthereum) {
    return (
      <button 
        className="px-3 py-1 text-xs font-mono bg-black border border-red-500/30 text-red-500/50 rounded opacity-50 cursor-not-allowed"
        disabled
      >
        NO WALLET
      </button>
    );
  }

  let text = 'CLAIM';
  if (canClaimToday === false) text = 'CLAIMED TODAY';
  else if (status === 'working') text = '...';
  else if (status === 'done') text = 'DONE';
  else if (status === 'error') text = 'RETRY';

  const isDisabled = status === 'working' || status === 'done' || canClaimToday === false;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className={`px-3 py-1 text-xs font-mono bg-black border rounded transition-colors ${
          canClaimToday === false
            ? 'border-grifter-blue/30 text-grifter-blue/50 cursor-not-allowed'
            : isDisabled 
              ? 'border-grifter-green/30 text-grifter-green/50 cursor-not-allowed' 
              : 'border-grifter-green text-grifter-green hover:bg-grifter-green hover:text-black'
        }`}
      >
        {text}
      </button>
      
      {errorMsg && (
        <span className="text-[10px] font-mono text-red-500 max-w-[150px] text-right leading-tight">
          {errorMsg}
        </span>
      )}
      
      {txHash && (
        <a
          href={`${TARGET_CHAIN.blockExplorers?.default.url}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-grifter-blue hover:text-grifter-green"
        >
          TX
        </a>
      )}
    </div>
  );
}

export default ClaimRewardButton;
