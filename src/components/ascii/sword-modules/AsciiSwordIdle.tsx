"use client";

import { useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface AsciiSwordIdleProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export default function AsciiSwordIdle({ children, enabled = true }: AsciiSwordIdleProps) {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Super einfache Idle-Animation
  useEffect(() => {
    if (!enabled || isMusicPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Verzögerung beim ersten Start
    const startDelay = isInitializedRef.current ? 0 : 1000;
    isInitializedRef.current = true;
    
    const timer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      // Sehr sanfte Energie-Welle
      let energy = 0.18;
      let direction = 1;
      
      animationRef.current = setInterval(() => {
        if (isMusicPlaying) {
          clearInterval(animationRef.current!);
          return;
        }
        
        // Sanfte Welle zwischen 0.15 und 0.22
        energy += direction * 0.005;
        
        if (energy >= 0.22) {
          direction = -1;
          energy = 0.22;
        } else if (energy <= 0.15) {
          direction = 1;
          energy = 0.15;
          
          // Gelegentlich ein sanfter "Beat" (nur 20% Chance)
          if (Math.random() < 0.2) {
            triggerBeat();
            setTimeout(() => resetBeat(), 80);
          }
        }
        
        updateEnergy(energy);
      }, 150); // 150ms = sehr smooth
      
    }, startDelay);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [enabled, isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
  
  return <>{children}</>;
}

// Noch einfachere Version als Hook
export function useSuperSimpleIdle() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Starte nach 500ms
    const timer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      let energy = 0.2;
      
      animationRef.current = setInterval(() => {
        if (isMusicPlaying) {
          clearInterval(animationRef.current!);
          return;
        }
        
        // Einfache Sinus-Welle
        const time = Date.now() * 0.001; // Zeit in Sekunden
        energy = 0.18 + Math.sin(time * 0.5) * 0.04; // 0.14 - 0.22
        
        updateEnergy(energy);
        
        // Gelegentlich ein Beat (nur 15% Chance alle 3 Sekunden)
        if (Math.random() < 0.15) {
          triggerBeat();
          setTimeout(() => resetBeat(), 100);
        }
      }, 200);
      
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
} 