"use client";

import React from 'react';
import SideButtons from './SideButtons';

interface MobileControlsOverlayProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function MobileControlsOverlay({ isOpen, onToggle }: MobileControlsOverlayProps) {
  return (
    <>
      {/* Overlay (nur sichtbar wenn isOpen true ist) - nur noch für SideButtons */}
      <div 
        className={`fixed inset-0 z-20 bg-black bg-opacity-90 transition-opacity duration-300 flex flex-col items-center justify-center ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-controls-title"
        aria-describedby="mobile-controls-description"
      >
        <div className="w-full max-w-sm p-6 flex flex-col items-center gap-8">
          <div id="mobile-controls-title" className="text-xl font-press-start-2p text-grifter-blue mb-4">CONTROLS</div>
          <div id="mobile-controls-description" className="sr-only">
            Mobile controls for the GR1FTSWORD application
          </div>
          <div className="w-full flex flex-col items-center gap-8">
            <SideButtons className="items-center" />
          </div>
        </div>
      </div>
    </>
  );
} 