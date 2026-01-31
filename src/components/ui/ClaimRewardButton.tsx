/**
 * ClaimRewardButton - Direct ethereum provider claim with visual feedback
 * 
 * Features:
 * - Pending animation while transaction is processing
 * - Success animation (green, ASCII-style) on success
 * - Failure animation (red/purple, ASCII-style) on error
 * - Auto-refresh data after successful claim
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData } from 'viem';
import { useChallengeStore } from '@/store/challengeStore';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useSwordEvolutionV2 } from '@/hooks/useSwordEvolutionV2';
import { 
  SWORD_EVOLUTION_V2_ABI as SWORD_EVOLUTION_ABI, 
  getContractAddress, 
  TARGET_CHAIN_ID as TARGET_CHAIN,
  CONTRACT_CONSTANTS,
} from '@/lib/contracts/swordEvolutionV2';

// Base Sepolia chain ID
const TARGET_CHAIN_ID = '0x14a34'; // 84532 in hex
const TARGET_CHAIN_ID_DECIMAL = 84532;

interface ClaimRewardButtonProps {
  onSuccess?: () => void;
}

type ClaimState = 'idle' | 'checking' | 'signing' | 'pending' | 'success' | 'error';

// Poll for transaction receipt with timeout
async function pollForReceipt(txHash: string, maxAttempts = 30, interval = 2000): Promise<any> {
  if (!window.ethereum) {
    throw new Error('No ethereum provider');
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Claim] Polling attempt ${attempt}/${maxAttempts}...`);
    
    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      
      if (receipt && receipt.blockNumber) {
        console.log('[Claim] Receipt found:', receipt);
        return receipt;
      }
    } catch (err) {
      console.warn(`[Claim] Poll attempt ${attempt} failed:`, err);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Transaction confirmation timeout');
}

export function ClaimRewardButton({ onSuccess }: ClaimRewardButtonProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [hasEthereum, setHasEthereum] = useState(false);
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);

  const { accuracy, hitMap, getClaimData } = useChallengeStore();
  const { setClaimPending, clearClaimPending } = usePowerUpStore();
  const { activeAspect } = useSwordEvolutionV2();

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

  const handleClaim = useCallback(async () => {
    if (!window.ethereum) return;
    
    setClaimState('checking');
    setErrorMsg('');
    setTxHash(null);
    setShowSuccessAnimation(false);
    setShowErrorAnimation(false);

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

      // 3. Check score
      const score = Math.round(accuracy);
      if (score < CONTRACT_CONSTANTS.MIN_SCORE) {
        throw new Error(`Need ${CONTRACT_CONSTANTS.MIN_SCORE}% score`);
      }

      // 4. Get claim data
      const claimData = getClaimData();
      if (!claimData || !hitMap) {
        throw new Error('No challenge data');
      }

      // 5. Get signature from server
      setClaimState('signing');
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
        throw new Error(err.error || 'Server error');
      }

      const { v, r, s, deadline } = await res.json();

      // 6. Send transaction
      setClaimState('pending');
      
      // Map pendingAspect index to aspect name (0=FORGE, 1=CHARGE, 2=GLITCH)
      const aspectMap: { [key: number]: 'forge' | 'charge' | 'glitch' } = {
        0: 'forge',
        1: 'charge', 
        2: 'glitch'
      };
      // Use activeAspect from hook or fallback to forge
      const activeAspectIndex = activeAspect ?? 0;
      const activeAspectKey = aspectMap[activeAspectIndex] || 'forge';
      
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
          gas: '0x30d40', // 200,000 gas limit - sufficient for claimWithSignature
        }],
      });

      setTxHash(tx);
      console.log('[Claim] Transaction sent:', tx);
      
      // Set claim pending in store so progress bars can animate
      setClaimPending(activeAspectKey, tx);
      console.log('[Claim] Set pending aspect:', activeAspectKey);
      
      // Poll for transaction receipt until confirmed
      console.log('[Claim] Polling for transaction receipt...');
      const receipt = await pollForReceipt(tx);
      
      if (receipt && receipt.status === '0x1') {
        console.log('[Claim] Transaction confirmed:', receipt);
        clearClaimPending();
        setClaimState('success');
        setShowSuccessAnimation(true);
        
        // Notify parent component
        onSuccess?.();
        
        // Hide success animation after 3 seconds
        setTimeout(() => {
          setShowSuccessAnimation(false);
        }, 3000);
      } else {
        console.error('[Claim] Transaction failed or reverted:', receipt);
        clearClaimPending();
        throw new Error('Transaction failed or reverted');
      }

    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Error';
      setErrorMsg(msg);
      setClaimState('error');
      setShowErrorAnimation(true);
      clearClaimPending(); // Clear pending state on error
      
      // Hide error animation after 3 seconds
      setTimeout(() => {
        setShowErrorAnimation(false);
        setClaimState('idle');
      }, 3000);
    }
  }, [account, accuracy, hitMap, getClaimData, onSuccess, activeAspect, clearClaimPending, setClaimPending]);

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

  // Render button based on state
  const renderButton = () => {
    const baseClasses = "relative px-4 py-2 text-xs font-mono font-bold rounded transition-all cursor-pointer z-[100] overflow-hidden";
    
    switch (claimState) {
      case 'pending':
        return (
          <button
            disabled
            className={`${baseClasses} bg-black border border-yellow-500 text-yellow-500 cursor-wait`}
          >
            {/* Pending Animation - ASCII Style */}
            <span className="relative z-10 flex items-center gap-2">
              <span className="animate-pulse">[</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-pulse">]</span>
              <span className="ml-1">PENDING</span>
            </span>
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent animate-[scan_2s_linear_infinite]" />
          </button>
        );
        
      case 'success':
      case 'signing':
        return (
          <button
            disabled
            className={`${baseClasses} bg-black border border-grifter-green text-grifter-green cursor-default`}
          >
            {showSuccessAnimation ? (
              <span className="relative z-10 flex items-center gap-2">
                <span className="animate-pulse text-lg">✓</span>
                <span className="animate-[glow_1s_ease-in-out_infinite]">CLAIMED!</span>
              </span>
            ) : (
              <span>CLAIMED ✓</span>
            )}
            {/* Success glow effect */}
            {showSuccessAnimation && (
              <>
                <div className="absolute inset-0 bg-grifter-green/30 animate-pulse" />
                <div className="absolute -inset-1 bg-grifter-green/20 blur-sm animate-pulse" />
              </>
            )}
          </button>
        );
        
      case 'error':
        return (
          <button
            onClick={handleClaim}
            className={`${baseClasses} bg-black border border-red-500 text-red-500 hover:bg-red-500/20`}
          >
            {showErrorAnimation ? (
              <span className="relative z-10 flex items-center gap-2">
                <span className="animate-pulse text-lg">✗</span>
                <span className="animate-[shake_0.5s_ease-in-out]">FAILED</span>
              </span>
            ) : (
              <span>RETRY</span>
            )}
            {/* Error glitch effect */}
            {showErrorAnimation && (
              <>
                <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
                <div className="absolute inset-0 bg-purple-500/10 animate-[glitch_0.3s_ease-in-out_infinite]" />
              </>
            )}
          </button>
        );
        
      case 'checking':
      case 'signing':
        return (
          <button
            disabled
            className={`${baseClasses} bg-black border border-grifter-blue/60 text-grifter-blue/60 cursor-wait`}
          >
            <span className="animate-pulse">...</span>
          </button>
        );
        
      default: // idle
        return (
          <button
            onClick={handleClaim}
            className={`${baseClasses} bg-black border border-grifter-green text-grifter-green hover:bg-grifter-green hover:text-black`}
          >
            CLAIM
          </button>
        );
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {renderButton()}
      
      {errorMsg && !showErrorAnimation && (
        <span className="text-[9px] font-mono text-red-500/70 max-w-[120px] text-center leading-tight">
          {errorMsg}
        </span>
      )}
      
      {txHash && (
        <a
          href={`https://sepolia.basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-mono text-grifter-blue/70 hover:text-grifter-green"
        >
          TX
        </a>
      )}
      
      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px #00FCA6, 0 0 10px #00FCA6; }
          50% { text-shadow: 0 0 20px #00FCA6, 0 0 30px #00FCA6; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes glitch {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 2px); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(2px, -2px); }
        }
      `}</style>
    </div>
  );
}

export default ClaimRewardButton;
