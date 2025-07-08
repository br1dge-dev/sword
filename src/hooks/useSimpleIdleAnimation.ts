import { useEffect, useRef, useCallback } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface IdleAnimationConfig {
  enabled?: boolean;
  energyRange?: [number, number];
  energySpeed?: number; // ms zwischen Energie-Updates
  beatChance?: number; // 0-1, Wahrscheinlichkeit für Beat
  beatInterval?: number; // ms zwischen Beat-Checks
}

export function useSimpleIdleAnimation(config: IdleAnimationConfig = {}) {
  const {
    enabled = true,
    energyRange = [0.15, 0.35], // Sanftere Werte
    energySpeed = 2000, // 2 Sekunden zwischen Updates
    beatChance = 0.08, // 8% Chance
    beatInterval = 4000 // 4 Sekunden zwischen Checks
  } = config;
  
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<{energy: NodeJS.Timeout | null, beat: NodeJS.Timeout | null}>({
    energy: null,
    beat: null
  });
  
  // Smooth Energie-Übergang
  const updateEnergySmooth = useCallback((targetEnergy: number) => {
    const currentEnergy = useAudioReactionStore.getState().energy;
    const steps = 10;
    const stepSize = (targetEnergy - currentEnergy) / steps;
    let currentStep = 0;
    
    const smoothInterval = setInterval(() => {
      currentStep++;
      const newEnergy = currentEnergy + (stepSize * currentStep);
      updateEnergy(newEnergy);
      
      if (currentStep >= steps) {
        clearInterval(smoothInterval);
      }
    }, 100); // 100ms zwischen Schritten = 1 Sekunde Gesamtdauer
  }, [updateEnergy]);
  
  // Starte Idle-Animation
  const startIdleAnimation = useCallback(() => {
    if (!enabled || isMusicPlaying) return;
    
    // Cleanup bestehende Animationen
    if (animationRef.current.energy) {
      clearInterval(animationRef.current.energy);
    }
    if (animationRef.current.beat) {
      clearInterval(animationRef.current.beat);
    }
    
    // Sanfte Energie-Animation
    animationRef.current.energy = setInterval(() => {
      if (isMusicPlaying) return; // Stoppe wenn Musik läuft
      
      const [min, max] = energyRange;
      const targetEnergy = min + Math.random() * (max - min);
      updateEnergySmooth(targetEnergy);
    }, energySpeed);
    
    // Gelegentliche Beats
    animationRef.current.beat = setInterval(() => {
      if (isMusicPlaying) return; // Stoppe wenn Musik läuft
      
      if (Math.random() < beatChance) {
        triggerBeat();
        
        // Beat nach kurzer Zeit zurücksetzen
        setTimeout(() => {
          resetBeat();
        }, 150);
      }
    }, beatInterval);
    
    console.log('Simple idle animation started');
  }, [enabled, isMusicPlaying, energyRange, energySpeed, beatChance, beatInterval, updateEnergySmooth, triggerBeat, resetBeat]);
  
  // Stoppe Idle-Animation
  const stopIdleAnimation = useCallback(() => {
    if (animationRef.current.energy) {
      clearInterval(animationRef.current.energy);
      animationRef.current.energy = null;
    }
    if (animationRef.current.beat) {
      clearInterval(animationRef.current.beat);
      animationRef.current.beat = null;
    }
    console.log('Simple idle animation stopped');
  }, []);
  
  // Automatische Steuerung basierend auf Musik-Status
  useEffect(() => {
    if (!enabled) return;
    
    if (!isMusicPlaying) {
      // Kurze Verzögerung vor Start
      const timer = setTimeout(() => {
        startIdleAnimation();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        stopIdleAnimation();
      };
    } else {
      stopIdleAnimation();
    }
  }, [enabled, isMusicPlaying, startIdleAnimation, stopIdleAnimation]);
  
  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      stopIdleAnimation();
    };
  }, [stopIdleAnimation]);
  
  return {
    startIdleAnimation,
    stopIdleAnimation,
    isIdleActive: !isMusicPlaying && enabled
  };
}

// Noch einfachere Version für minimale Animation
export function useMinimalIdleAnimation() {
  const { updateEnergy, triggerBeat, resetBeat, isMusicPlaying } = useAudioReactionStore();
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  const startMinimalAnimation = useCallback(() => {
    if (isMusicPlaying) return;
    
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    // Sehr einfache Animation: Sanfte Energie-Welle
    let direction = 1; // 1 = steigend, -1 = fallend
    let currentEnergy = 0.2;
    
    animationRef.current = setInterval(() => {
      if (isMusicPlaying) return;
      
      // Sanfte Energie-Welle zwischen 0.15 und 0.25
      currentEnergy += direction * 0.01;
      
      if (currentEnergy >= 0.25) {
        direction = -1;
        currentEnergy = 0.25;
      } else if (currentEnergy <= 0.15) {
        direction = 1;
        currentEnergy = 0.15;
        
        // Gelegentlich einen Beat bei Tiefpunkt
        if (Math.random() < 0.3) {
          triggerBeat();
          setTimeout(() => resetBeat(), 100);
        }
      }
      
      updateEnergy(currentEnergy);
    }, 100); // 100ms = sehr smooth
    
    console.log('Minimal idle animation started');
  }, [isMusicPlaying, updateEnergy, triggerBeat, resetBeat]);
  
  const stopMinimalAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    console.log('Minimal idle animation stopped');
  }, []);
  
  useEffect(() => {
    if (!isMusicPlaying) {
      const timer = setTimeout(() => {
        startMinimalAnimation();
      }, 300);
      
      return () => {
        clearTimeout(timer);
        stopMinimalAnimation();
      };
    } else {
      stopMinimalAnimation();
    }
  }, [isMusicPlaying, startMinimalAnimation, stopMinimalAnimation]);
  
  useEffect(() => {
    return () => {
      stopMinimalAnimation();
    };
  }, [stopMinimalAnimation]);
  
  return {
    startMinimalAnimation,
    stopMinimalAnimation,
    isMinimalActive: !isMusicPlaying
  };
} 