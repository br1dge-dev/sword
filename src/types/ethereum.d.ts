/**
 * Ethereum TypeScript Definitions
 * 
 * This file extends the Window interface to include Ethereum provider types
 * for better TypeScript support when working with MetaMask and other wallets.
 */

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
  selectedAddress: string | undefined;
  networkVersion: string | undefined;
  chainId: string | undefined;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {}; 