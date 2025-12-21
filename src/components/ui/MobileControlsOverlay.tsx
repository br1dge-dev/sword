"use client";

import React from 'react';
import SideButtons from './SideButtons';
import { IoMdSettings } from 'react-icons/io';
import { IoMdEye, IoMdEyeOff, IoMdHelpCircle, IoMdTrophy } from 'react-icons/io';
import AudioControlPanel from './AudioControlPanel';

interface MobileControlsOverlayProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onBeat: () => void;
  onEnergyChange: (energy: number) => void;
  onToggleUI: () => void;
  onOpenWtf: () => void;
  onToggleLeaderboard: () => void;
  isUIVisible: boolean;
  isFpsEnabled: boolean;
  onToggleFps: () => void;
}

export default function MobileControlsOverlay({
  isOpen,
  onToggle,
  onBeat,
  onEnergyChange,
  onToggleUI,
  onOpenWtf,
  onToggleLeaderboard,
  isUIVisible,
  isFpsEnabled,
  onToggleFps,
}: MobileControlsOverlayProps) {
  return (
    <>
      {/* Overlay-Button (immer sichtbar) */}
      <button
        onClick={() => onToggle(!isOpen)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
        style={{
          boxShadow: '0 0 10px rgba(62, 230, 255, 0.6)',
        }}
      >
        <IoMdSettings 
          className={`text-grifter-blue text-2xl transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {/* Overlay (nur sichtbar wenn isOpen true ist) */}
      <div 
        className={`fixed inset-0 z-20 bg-black bg-opacity-90 transition-opacity duration-300 flex flex-col items-center justify-center ui-caps ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-sm p-5 flex flex-col items-center gap-5">
          <div className="text-lg font-press-start-2p text-grifter-blue">CONTROLS</div>

          {/* Put the player in the overlay so the sword stays the hero */}
          <div className="w-full flex justify-center">
            <div className="scale-[0.95] origin-top ui-caps">
              <AudioControlPanel onBeat={onBeat} onEnergyChange={onEnergyChange} />
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-6">
            <div className="scale-[0.95] origin-top ui-caps">
              <SideButtons className="items-center" />
            </div>
          </div>

          {/* Actions behind the gear button */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={onToggleFps}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
              style={{ boxShadow: isFpsEnabled ? '0 0 16px rgba(62,230,255,0.95)' : '0 0 10px rgba(62, 230, 255, 0.45)' }}
              aria-label="Toggle FPS counter"
              title="FPS"
            >
              <span className="text-grifter-blue text-[10px] font-press-start-2p">FPS</span>
            </button>

            <button
              onClick={onToggleUI}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
              style={{ boxShadow: '0 0 10px rgba(62, 230, 255, 0.45)' }}
              aria-label="Toggle UI"
            >
              {isUIVisible ? (
                <IoMdEyeOff className="text-grifter-blue text-2xl" />
              ) : (
                <IoMdEye className="text-grifter-blue text-2xl" />
              )}
            </button>

            <button
              onClick={onOpenWtf}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
              style={{ boxShadow: '0 0 10px rgba(62, 230, 255, 0.45)' }}
              aria-label="WTF is this?"
            >
              <IoMdHelpCircle className="text-grifter-blue text-2xl" />
            </button>

            <button
              onClick={onToggleLeaderboard}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
              style={{ boxShadow: '0 0 10px rgba(62, 230, 255, 0.45)' }}
              aria-label="Leaderboard"
            >
              <IoMdTrophy className="text-grifter-blue text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 