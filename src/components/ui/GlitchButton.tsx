"use client";

/**
 * GlitchButton Component
 * 
 * A cyberpunk-styled button with glitch effects that matches the overall aesthetic
 * of the SWORD application.
 */
import React, { useState, useEffect } from 'react';

interface GlitchButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'free' | 'paid';
  className?: string;
}

// Glitch-Symbole
const glitchSymbols = ['░', '▒', '▓', '|', '/', '\\', '0', '1', '*', '>', '<'];

export default function GlitchButton({ text, onClick, variant = 'free', className = '' }: GlitchButtonProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchText, setGlitchText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);

  // Zufällige Glitch-Effekte
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Zufällige Glitch-Effekte auch ohne Hover (selten)
    const randomGlitchInterval = setInterval(() => {
      if (Math.random() > 0.92) { // 8% Chance für zufälligen Glitch
        triggerGlitch();
      }
    }, 2000);
    
    // Intensivere Glitch-Effekte bei Hover
    if (isHovered) {
      interval = setInterval(() => {
        triggerGlitch();
      }, 300);
    }
    
    return () => {
      clearInterval(interval);
      clearInterval(randomGlitchInterval);
    };
  }, [isHovered, text]);

  const triggerGlitch = () => {
    setIsGlitching(true);
    
    // Zufällig 1-2 Zeichen durch Glitch-Symbole ersetzen
    const textArray = text.split('');
    const positions: number[] = [];
    const numGlitches = Math.random() > 0.5 ? 1 : 2;
    
    for (let i = 0; i < numGlitches; i++) {
      const pos = Math.floor(Math.random() * text.length);
      if (!positions.includes(pos)) {
        positions.push(pos);
        textArray[pos] = glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)];
      }
    }
    
    setGlitchText(textArray.join(''));
    
    // Nach kurzer Zeit zurücksetzen
    setTimeout(() => {
      setGlitchText(text);
      setIsGlitching(false);
    }, 150);
  };

  // Bestimme Farben basierend auf Variante
  const getColors = () => {
    if (variant === 'free') {
      return {
        baseColor: 'var(--grifter-green)',
        glowColor: 'var(--grifter-blue)',
        textColor: 'text-[#00FCA6]',
        borderColor: 'border-[#00FCA6]',
        hoverColor: 'hover:border-[#3EE6FF]',
        shadowColor: 'shadow-[#00FCA6]'
      };
    } else {
      return {
        baseColor: 'var(--grifter-pink)',
        glowColor: 'var(--grifter-yellow)',
        textColor: 'text-[#FF3EC8]',
        borderColor: 'border-[#FF3EC8]',
        hoverColor: 'hover:border-[#F8E16C]',
        shadowColor: 'shadow-[#FF3EC8]'
      };
    }
  };
  
  const colors = getColors();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        px-3 py-1 
        border border-opacity-70 ${colors.borderColor} ${colors.hoverColor}
        bg-black bg-opacity-30
        font-mono text-xs sm:text-sm uppercase tracking-wider
        ${colors.textColor}
        transition-all duration-150
        ${isGlitching ? 'translate-x-[1px] translate-y-[1px]' : ''}
        hover:shadow-[0_0_8px_rgba(0,255,170,0.7)]
        relative overflow-hidden
        ${className}
      `}
      style={{
        textShadow: isGlitching 
          ? `0 0 5px ${colors.glowColor}, 0 0 10px ${colors.glowColor}` 
          : `0 0 3px ${colors.baseColor}`,
        clipPath: isGlitching 
          ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' 
          : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
      }}
    >
      {/* Glitch-Overlay (selten sichtbar) */}
      {isGlitching && (
        <span 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            opacity: 0.8,
            mixBlendMode: 'difference',
            transform: 'translateX(-1px)'
          }}
        >
          {glitchText}
        </span>
      )}
      
      {/* Haupttext */}
      <span className="relative z-10">
        {isGlitching ? glitchText : text}
      </span>
    </button>
  );
} 