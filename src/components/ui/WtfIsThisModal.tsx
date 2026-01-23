"use client";

import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const HIGHLIGHT_COLORS = ['#F8E16C', '#FF3EC8', '#3EE6FF'] as const;

export default function WtfIsThisModal({ open, onClose }: Props) {
  const [highlightIdx, setHighlightIdx] = useState(() => Math.floor(Math.random() * 9));
  const [highlightColor, setHighlightColor] = useState(
    () => HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)],
  );

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setHighlightIdx(Math.floor(Math.random() * 9));
      setHighlightColor(HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)]);
    }, 1800);
    return () => clearInterval(interval);
  }, [open]);

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
      aria-label="About"
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

        <div className="mb-6">
          <div className="text-grifter-blue font-press-start-2p text-lg tracking-wider select-none">
            {'Welcome to GR1FTSWORD'.split('').map((char, i) => (
              <span key={i} style={i === 13 + highlightIdx ? { color: highlightColor } : {}}>{char}</span>
            ))}
          </div>
        </div>

        <div className="space-y-5 text-grifter-blue/90 text-sm leading-relaxed">
          <div>
            An ASCII art + music experience built around rhythm.
            The sword pulses, evolves, and reacts to every beat.
          </div>

          <div className="border-t border-grifter-blue/30 pt-4">
            <div className="font-press-start-2p text-xs text-[#F8E16C] mb-2">
              SWORD EVOLUTION
            </div>
            <div>
              Daily challenges drive the sword&apos;s growth. Complete them and the sword evolves by 1/10 of its level. 10 days = first evolution.
            </div>
          </div>

          <div className="border-t border-grifter-blue/30 pt-4">
            <div className="font-press-start-2p text-xs text-[#F8E16C] mb-2">
              EARN $EDGE
            </div>
            <div>
              Through music enjoyment. Every day.
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-grifter-blue text-black font-press-start-2p text-xs rounded border border-grifter-blue hover:bg-transparent hover:text-grifter-blue transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}