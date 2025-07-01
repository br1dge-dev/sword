/**
 * useBlockchainEvents - Custom hook for blockchain events
 * 
 * This hook provides real-time blockchain event monitoring and interaction,
 * specifically for block finalization and transaction events.
 */
import { useState, useEffect, useCallback } from 'react';
import { listenForBlocks, signMessage } from '@/lib/blockchain/ethProvider';

interface BlockchainEvents {
  latestBlock: number | null;
  isBlockFinalized: boolean;
  signSwordEnhancement: () => Promise<void>;
  enhancementCount: number;
  isEnhancing: boolean;
  error: string | null;
}

/**
 * Custom hook for monitoring blockchain events and interacting with the blockchain
 * 
 * @returns {BlockchainEvents} Blockchain event state and interaction methods
 */
export function useBlockchainEvents(): BlockchainEvents {
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [isBlockFinalized, setIsBlockFinalized] = useState(false);
  const [enhancementCount, setEnhancementCount] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle new block events
  useEffect(() => {
    const cleanup = listenForBlocks((blockNumber) => {
      setLatestBlock(blockNumber);
      setIsBlockFinalized(true);
      
      // Reset finalization state after animation
      setTimeout(() => {
        setIsBlockFinalized(false);
      }, 2000);
    });
    
    return cleanup;
  }, []);
  
  // Function to sign a message for sword enhancement
  const signSwordEnhancement = useCallback(async () => {
    try {
      setIsEnhancing(true);
      setError(null);
      
      const message = `Enhance SWORD - ${Date.now()}`;
      await signMessage(message);
      
      // Increment enhancement count on successful signature
      setEnhancementCount((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance sword');
    } finally {
      setIsEnhancing(false);
    }
  }, []);
  
  return {
    latestBlock,
    isBlockFinalized,
    signSwordEnhancement,
    enhancementCount,
    isEnhancing,
    error
  };
} 