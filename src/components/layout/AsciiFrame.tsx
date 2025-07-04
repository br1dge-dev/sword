"use client";

import React, { ReactNode } from 'react';

interface AsciiFrameProps {
  children: ReactNode;
}

export default function AsciiFrame({ children }: AsciiFrameProps) {
  return (
    <div className="relative w-full h-full">
      {/* ASCII-Rahmen */}
      <div className="absolute inset-0 pointer-events-none text-[#00ffaa] opacity-60 flex flex-col justify-between z-20">
        {/* Oberer Rahmen */}
        <div className="w-full text-center font-mono text-xs sm:text-sm">
          ╔══════════════════════════════════════════════════════════════════════════════╗
        </div>
        
        {/* Mittlerer Bereich mit seitlichen Rahmen */}
        <div className="flex-grow flex">
          <div className="w-2 text-center font-mono text-xs sm:text-sm flex flex-col justify-between">
            <span>║</span>
            <span>║</span>
            <span>║</span>
            <span>║</span>
            <span>║</span>
          </div>
          <div className="flex-grow"></div>
          <div className="w-2 text-center font-mono text-xs sm:text-sm flex flex-col justify-between">
            <span>║</span>
            <span>║</span>
            <span>║</span>
            <span>║</span>
            <span>║</span>
          </div>
        </div>
        
        {/* Unterer Rahmen */}
        <div className="w-full text-center font-mono text-xs sm:text-sm">
          ╚══════════════════════════════════════════════════════════════════════════════╝
        </div>
      </div>
      
      {/* Inhalt */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
} 