"use client";

import React, { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WtfIsThisModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="WTF is this?"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-black border border-grifter-blue rounded-lg p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-grifter-blue text-2xl font-bold hover:text-pink-400 transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-4">
          <div className="text-grifter-blue font-press-start-2p text-sm tracking-wide">
            WTF IS THIS?
          </div>
          <div className="text-grifter-blue/70 text-sm mt-1">
            A tiny ASCII + music-reactive “blade” playground.
          </div>
        </div>

        <div className="space-y-3 text-grifter-blue text-base leading-snug">
          <div>
            <span className="font-press-start-2p text-xs text-[#F8E16C]">PLAY</span>{" "}
            starts the track. The sword becomes a 16‑bar equalizer and reacts to intensity + hits.
          </div>
          <div>
            <span className="font-press-start-2p text-xs text-[#3EE6FF]">POWER‑UPS</span>{" "}
            let you add charge/glitch/forge effects (desktop left controls; mobile via the settings button).
          </div>
          <div>
            <span className="font-press-start-2p text-xs text-[#FF3EC8]">TIP</span>{" "}
            If it feels too calm, push glitch/charge and pick a louder section of the track.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-grifter-blue text-black font-press-start-2p text-xs rounded border border-grifter-blue hover:bg-transparent hover:text-grifter-blue transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}


