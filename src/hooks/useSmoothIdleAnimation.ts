import { useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

/**
 * Wirklich smooth Idle-Animation
 * 
 * Verwendet requestAnimationFrame für konstante 60fps
 * und smooth Energie-Übergänge ohne Sprünge.
 */
export function useSmoothIdleAnimation() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const energyRef = useRef(0.18);
  const beatCounterRef = useRef(0);
  
  useEffect(() => {
    // Stoppe Animation wenn Musik läuft
    if (isMusicPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Starte nach 1 Sekunde
    const startTimer = setTimeout(() => {
      if (isMusicPlaying) return;
      
      // Smooth Animation mit requestAnimationFrame
      const animate = (currentTime: number) => {
        if (isMusicPlaying) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          return;
        }
        
        // Konstante 60fps (16.67ms pro Frame)
        if (currentTime - lastTimeRef.current >= 16.67) {
          lastTimeRef.current = currentTime;
          
          // Smooth Sinus-Welle für Energie
          const time = currentTime * 0.0005; // Sehr langsame Welle
          const targetEnergy = 0.18 + Math.sin(time) * 0.04; // 0.14 - 0.22
          
          // Smooth Übergang zur Ziel-Energie
          const smoothing = 0.02; // Sanfter Übergang
          energyRef.current += (targetEnergy - energyRef.current) * smoothing;
          
          updateEnergy(energyRef.current);
          
          // Beat-Counter für gelegentliche Beats
          beatCounterRef.current++;
          
          // Beat alle ~6 Sekunden (360 Frames bei 60fps)
          if (beatCounterRef.current >= 360) {
            beatCounterRef.current = 0;
            
            // Nur 20% Chance für Beat
            if (Math.random() < 0.2) {
              triggerBeat();
              setTimeout(() => resetBeat(), 150);
            }
          }
        }
        
        // Nächste Frame anfordern
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Animation starten
      animationRef.current = requestAnimationFrame(animate);
      
    }, 1000);
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
}

/**
 * Ultra-smooth Version mit konstanter Geschwindigkeit
 */
export function useUltraSmoothIdle() {
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
        
        // Konstante Zeit-basierte Animation
        const elapsed = currentTime - startTimeRef.current;
        const beatElapsed = currentTime - beatTimeRef.current;
        
        // Sehr langsame, konstante Sinus-Welle
        const energy = 0.18 + Math.sin(elapsed * 0.0003) * 0.03; // 0.15 - 0.21
        updateEnergy(energy);
        
        // Beat alle 5 Sekunden
        if (beatElapsed >= 5000) {
          beatTimeRef.current = currentTime;
          
          // Nur 15% Chance für Beat
          if (Math.random() < 0.15) {
            triggerBeat();
            setTimeout(() => resetBeat(), 200);
          }
        }
        
        // Konstante 60fps
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
    }, 1200);
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
}

/**
 * Minimalistische Version - nur sanfte Welle
 */
export function useMinimalSmoothIdle() {
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
        
        // Nur sanfte Energie-Welle, keine Beats
        const elapsed = currentTime - startTimeRef.current;
        const energy = 0.19 + Math.sin(elapsed * 0.0002) * 0.02; // 0.17 - 0.21
        
        updateEnergy(energy);
        
        // Konstante 60fps
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
    }, 1500);
    
    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMusicPlaying, updateEnergy]);
} 