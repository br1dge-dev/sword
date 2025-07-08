import { useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

/**
 * Sichtbare und ruhige Idle-Animation
 * 
 * Sanft, aber sichtbar - Energie über 0.15 für sichtbare Effekte.
 */
export function useCalmIdleAnimation() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const beatTimeRef = useRef(0);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Starte nach 1 Sekunde für ruhigen Start
    const startTimer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      startTimeRef.current = performance.now();
      beatTimeRef.current = performance.now();
      
      const animate = (currentTime: number) => {
        if (isMusicPlaying) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          return;
        }
        
        // Zeit-basierte Animation
        const elapsed = currentTime - startTimeRef.current;
        const beatElapsed = currentTime - beatTimeRef.current;
        
        // Sichtbare Energie-Welle zwischen 0.16 und 0.22 (über Tile-Effekt-Schwelle)
        const energy = 0.19 + Math.sin(elapsed * 0.0003) * 0.03; // 0.16 - 0.22
        
        updateEnergy(energy);
        
        // Beat alle 6 Sekunden mit niedriger Chance
        if (beatElapsed >= 6000) {
          beatTimeRef.current = currentTime;
          
          // 15% Chance für Beat
          if (Math.random() < 0.15) {
            triggerBeat();
            setTimeout(() => resetBeat(), 400);
          }
        }
        
        // Langsamere Update-Rate (25fps)
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, 40); // ~25fps
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
    }, 1000); // 1 Sekunde Verzögerung
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
}

/**
 * Sanfte Idle-Animation mit sichtbaren Effekten
 */
export function useSmoothIdleAnimation() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const beatTimeRef = useRef(0);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const startTimer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      startTimeRef.current = performance.now();
      beatTimeRef.current = performance.now();
      
      const animate = (currentTime: number) => {
        if (isMusicPlaying) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          return;
        }
        
        const elapsed = currentTime - startTimeRef.current;
        const beatElapsed = currentTime - beatTimeRef.current;
        
        // Sanfte Energie-Welle zwischen 0.18 und 0.25
        const energy = 0.215 + Math.sin(elapsed * 0.0004) * 0.035; // 0.18 - 0.25
        
        updateEnergy(energy);
        
        // Beat alle 5 Sekunden
        if (beatElapsed >= 5000) {
          beatTimeRef.current = currentTime;
          
          // 20% Chance für Beat
          if (Math.random() < 0.2) {
            triggerBeat();
            setTimeout(() => resetBeat(), 350);
          }
        }
        
        // 30fps für smooth Animation
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, 33); // ~30fps
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
    }, 1500); // 1.5 Sekunden Verzögerung
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
}

/**
 * Ultra-ruhige Version - nur minimale Bewegung
 */
export function useUltraCalmIdle() {
  const { updateEnergy, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const startTimer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      startTimeRef.current = performance.now();
      
      const animate = (currentTime: number) => {
        if (isMusicPlaying) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          return;
        }
        
        // Ultra-langsame Welle
        const elapsed = currentTime - startTimeRef.current;
        const energy = 0.17 + Math.sin(elapsed * 0.0001) * 0.02; // 0.15 - 0.19
        
        updateEnergy(energy);
        
        // Sehr langsame Update-Rate (20fps)
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, 50); // 20fps
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
    }, 2000); // 2 Sekunden Verzögerung
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy]);
}

/**
 * Minimalistische Version - konstante niedrige Energie
 */
export function useMinimalIdle() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isMusicPlaying) {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
        beatIntervalRef.current = null;
      }
      return;
    }
    
    // Starte nach 1 Sekunde
    const startTimer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      // Konstante niedrige Energie über Schwellenwert
      updateEnergy(0.18);
      
      // Gelegentliche Beats alle 8 Sekunden
      beatIntervalRef.current = setInterval(() => {
        if (isMusicPlaying) {
          if (beatIntervalRef.current) {
            clearInterval(beatIntervalRef.current);
            beatIntervalRef.current = null;
          }
          return;
        }
        
        // 10% Chance für Beat
        if (Math.random() < 0.1) {
          triggerBeat();
          setTimeout(() => resetBeat(), 500);
        }
      }, 8000); // 8 Sekunden
      
    }, 1000);
    
    return () => {
      clearTimeout(startTimer);
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
} 