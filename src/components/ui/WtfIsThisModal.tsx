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
          <div className="text-grifter-blue font-press-start-2p text-lg tracking-wider">
            Welcome to{" "}
            <span className="text-[#F8E16C]">G</span>
            <span className="text-[#FF3EC8]">R</span>
            <span className="text-[#3EE6FF]">1</span>
            FTSWORD
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
              Your daily challenge performance shapes the sword&apos;s growth.
              Complete challenges successfully and the sword evolves by 1/10 of its level.
              10 days of consistency = first evolution.
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