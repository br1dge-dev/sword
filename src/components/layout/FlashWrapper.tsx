"use client";

/**
 * FlashWrapper Component
 * 
 * A wrapper component that applies a flash effect (inversion) to its children
 * based on the global flash state.
 */
import React, { ReactNode } from 'react';
import { useFlashStore } from '@/store/flashStore';

interface FlashWrapperProps {
  children: ReactNode;
}

export default function FlashWrapper({ children }: FlashWrapperProps) {
  const { isFlashing } = useFlashStore();
  
  return (
    <div 
      className="transition-all duration-150"
      style={{ 
        filter: isFlashing ? 'invert(1)' : 'none',
      }}
    >
      {children}
    </div>
  );
} 