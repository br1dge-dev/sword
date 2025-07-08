import { useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

/**
 * Ultra-minimale Idle-Animation
 * 
 * Macht nur eine sanfte Sinus-Welle für die Energie
 * und gelegentlich einen Beat. Super einfach und smooth.
 */
export function useUltraSimpleIdle() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Stoppe Animation wenn Musik läuft
    if (isMusicPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Starte nach 800ms (kurze Pause nach Page Load)
    const timer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      let beatCounter = 0;
      
      animationRef.current = setInterval(() => {
        if (isMusicPlaying) {
          clearInterval(animationRef.current!);
          return;
        }
        
        // Einfache Sinus-Welle für Energie
        const time = Date.now() * 0.0008; // Langsame Welle
        const energy = 0.16 + Math.sin(time) * 0.06; // 0.10 - 0.22
        
        updateEnergy(energy);
        
        // Gelegentlich ein Beat (alle ~4 Sekunden)
        beatCounter++;
        if (beatCounter >= 20) { // 20 * 200ms = 4 Sekunden
          beatCounter = 0;
          
          // Nur 25% Chance für Beat
          if (Math.random() < 0.25) {
            triggerBeat();
            setTimeout(() => resetBeat(), 120);
          }
        }
      }, 200); // 200ms = smooth
      
    }, 800);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
}

/**
 * Noch einfachere Version - nur eine Welle, keine Beats
 */
export function useMinimalWaveIdle() {
  const { updateEnergy, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const timer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      animationRef.current = setInterval(() => {
        if (isMusicPlaying) {
          clearInterval(animationRef.current!);
          return;
        }
        
        // Nur eine sanfte Welle, keine Beats
        const time = Date.now() * 0.001;
        const energy = 0.18 + Math.sin(time * 0.3) * 0.04; // 0.14 - 0.22
        
        updateEnergy(energy);
      }, 250);
      
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy]);
} 