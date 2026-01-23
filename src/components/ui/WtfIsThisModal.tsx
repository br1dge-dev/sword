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
            Welcome to GR1FTSWORD.
          </div>
        </div>

        <div className="space-y-4 text-grifter-blue text-base leading-snug">
          <div>
            This is an ASCII-based crypto AI application with onchain mechanics.
            But honestly? The real deal is way simpler:
          </div>

          <div>
            <span className="font-press-start-2p text-xs text-[#F8E16C]">JUST PLAY MUSIC</span>{" "}
            and vibe with rhythmically jumping ASCII symbols. That&apos;s it.
            The sword reacts to every beat. Every bass drop. Every peak.
          </div>

          <hr className="border-grifter-blue/30" />

          <div>
            <span className="font-press-start-2p text-xs text-[#00FCA6] block mb-1">SWORD EVOLUTION</span>
            Your participation shapes the sword&apos;s future. Complete daily challenges
            successfully, and the sword evolves by 1/10 of its current level.
            After 10 days = first evolution. Keep pushing.
          </div>

          <div>
            <span className="font-press-start-2p text-xs text-[#FF3EC8] block mb-1">EARN $EDGE</span>
            Through music enjoyment. Every day. The rhythm is your profit.
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