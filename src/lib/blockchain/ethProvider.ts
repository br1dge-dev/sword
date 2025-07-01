/**
 * Ethereum Provider Utility
 * 
 * This module provides utilities for connecting to the Ethereum blockchain,
 * listening for events, and interacting with smart contracts.
 */
import { ethers } from 'ethers';

/**
 * Creates an Ethereum provider using WebSocket connection
 * 
 * @returns {ethers.WebSocketProvider} WebSocket provider for Ethereum
 */
export function createWebSocketProvider(): ethers.WebSocketProvider {
  // For production, use environment variables for API keys
  const providerUrl = process.env.NEXT_PUBLIC_ETHEREUM_WS_URL || 
    'wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY';
  
  return new ethers.WebSocketProvider(providerUrl);
}

/**
 * Listens for new blocks on the Ethereum blockchain
 * 
 * @param {Function} callback - Function to call when a new block is finalized
 * @returns {Function} Cleanup function to remove listeners
 */
export function listenForBlocks(
  callback: (blockNumber: number) => void
): () => void {
  const provider = createWebSocketProvider();
  
  const blockListener = (blockNumber: number) => {
    callback(blockNumber);
  };
  
  provider.on('block', blockListener);
  
  // Return cleanup function
  return () => {
    provider.off('block', blockListener);
    // Close the WebSocket connection
    provider.websocket?.close();
  };
}

/**
 * Signs a message using the user's wallet
 * 
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Signed message
 */
export async function signMessage(message: string): Promise<string> {
  // Check if window.ethereum is available
  if (!window.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask.');
  }
  
  // Request account access
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Sign the message
  return await signer.signMessage(message);
} 