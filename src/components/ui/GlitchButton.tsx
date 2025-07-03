"use client";

/**
 * GlitchButton Component
 * 
 * Ein Button im Stil alter steinerner Glyphen mit Glitch-Effekten,
 * der zum Gesamtbild der SWORD-Anwendung passt.
 */
import React, { useState, useEffect } from 'react';

interface GlitchButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'free' | 'paid';
  className?: string;
}

// Glitch-Symbole im Stil alter Runen
const glitchSymbols = ['᛭', '᛫', '᛬', 'ᛰ', 'ᛱ', 'ᛲ', 'ᛳ', 'ᛴ', 'ᛵ', 'ᛶ', 'ᛷ', 'ᛸ', '᛹', '᛺', '᛻', '᛼', '᛽', '᛾', '᛿'];

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
        baseColor: '#7A7267', // Steingrau mit grünlichem Ton
        glowColor: '#A9E5BB', // Grünliches Leuchten
        textColor: 'text-[#A9E5BB]',
        borderColor: 'border-[#7A7267]',
        hoverColor: 'hover:border-[#A9E5BB]',
        shadowColor: 'shadow-[#A9E5BB]'
      };
    } else {
      return {
        baseColor: '#7A6757', // Steingrau mit rötlichem Ton
        glowColor: '#E5A9BB', // Rötliches Leuchten
        textColor: 'text-[#E5A9BB]',
        borderColor: 'border-[#7A6757]',
        hoverColor: 'hover:border-[#E5A9BB]',
        shadowColor: 'shadow-[#E5A9BB]'
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
        border-2 border-opacity-90 ${colors.borderColor} ${colors.hoverColor}
        bg-[#2A2520] bg-opacity-90
        font-['Courier_New'] text-xs sm:text-sm uppercase tracking-wider
        ${colors.textColor}
        transition-all duration-150
        ${isGlitching ? 'translate-x-[1px] translate-y-[1px]' : ''}
        hover:shadow-[0_0_8px_rgba(169,229,187,0.7)]
        relative overflow-hidden
        rounded-none
        pixelated
        ${className}
      `}
      style={{
        textShadow: isGlitching 
          ? `0 0 5px ${colors.glowColor}, 0 0 10px ${colors.glowColor}` 
          : `0 0 3px ${colors.baseColor}`,
        clipPath: isGlitching 
          ? 'polygon(0 2px, 2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px))' 
          : 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        imageRendering: 'pixelated',
        boxShadow: `inset 0 0 3px ${colors.baseColor}, 0 0 2px ${colors.baseColor}`,
        letterSpacing: '0.15em'
      }}
    >
      {/* Steinmuster-Hintergrund */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 5v1H0V0h5z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '4px 4px'
        }}
      />
      
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
      <span className="relative z-10 block py-[2px] leading-none">
        {isGlitching ? glitchText : text}
      </span>
    </button>
  );
} 