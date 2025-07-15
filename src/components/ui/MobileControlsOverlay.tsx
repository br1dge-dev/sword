"use client";

import React from 'react';
import SideButtons from './SideButtons';
import { IoMdSettings } from 'react-icons/io';

interface MobileControlsOverlayProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function MobileControlsOverlay({ isOpen, onToggle }: MobileControlsOverlayProps) {
  return (
    <>
      {/* Overlay-Button (immer sichtbar) */}
      <button
        onClick={() => onToggle(!isOpen)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
        style={{
          boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
        }}
      >
        <IoMdSettings 
          className={`text-grifter-blue text-2xl transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

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