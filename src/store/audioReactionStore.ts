/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * Speichert die Audio-Energie und Beat-Detection-Informationen.
 */
import { create } from 'zustand';
import { useEffect, useState, useRef } from 'react';

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  isAudioActive: boolean;
  fallbackEnabled: boolean;
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
  setAudioActive: (active: boolean) => void;
  setFallbackEnabled: (enabled: boolean) => void;
}

export const useAudioReactionStore = create<AudioReactionState>((set) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  isAudioActive: true, // Standardmäßig aktiv, um Fallback zu vermeiden
  fallbackEnabled: true, // Standardmäßig aktiviert
  
  updateEnergy: (energy) => set((state) => ({ 
    energy,
    isAudioActive: energy > 0.05 ? true : state.isAudioActive // Nur als aktiv markieren, wenn Energie über Schwellenwert
  })),
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now(),
    isAudioActive: true // Wenn Beat erkannt wird, ist Audio aktiv
  }),
  
  resetBeat: () => set({ beatDetected: false }),
  
  setAudioActive: (active) => set({ isAudioActive: active }),
  
  setFallbackEnabled: (enabled) => set({ fallbackEnabled: enabled })
}));

// Hook für automatisches Beat-Reset
export function useBeatReset(delay: number = 100) {
  const { beatDetected, resetBeat } = useAudioReactionStore();
  
  useEffect(() => {
    if (beatDetected) {
      const timeout = setTimeout(() => {
        resetBeat();
      }, delay);
      
      return () => clearTimeout(timeout);
    }
  }, [beatDetected, resetBeat, delay]);
}

// Hook für Fallback-Animation, wenn keine Audio-Reaktivität vorhanden ist
export function useFallbackAnimation() {
  const { isAudioActive, triggerBeat, updateEnergy, fallbackEnabled } = useAudioReactionStore();
  const [fallbackActive, setFallbackActive] = useState(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const energyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<number>(0);
  const lastActivityCheckRef = useRef<number>(Date.now());
  
  // Cleanup-Funktion
  const cleanupIntervals = () => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    if (energyIntervalRef.current) {
      clearInterval(energyIntervalRef.current);
      energyIntervalRef.current = null;
    }
  };
  
  // Starte die Fallback-Animation
  const startFallback = () => {
    if (!fallbackEnabled) return;
    
    // Doppelte Prüfung, um sicherzustellen, dass Audio wirklich inaktiv ist
    if (isAudioActive) {
      console.log("Audio is active, not starting fallback animation");
      return;
    }
    
    console.log("Starting fallback animation due to no audio activity");
    setFallbackActive(true);
    
    // Zufällige Beats generieren
    beatIntervalRef.current = setInterval(() => {
      // 25% Chance für einen Beat
      if (Math.random() < 0.25) {
        triggerBeat();
      }
    }, 500);
    
    // Zufällige Energie-Level generieren
    energyIntervalRef.current = setInterval(() => {
      // Zufälliger Energie-Level zwischen 0.2 und 0.8
      const randomEnergy = 0.2 + Math.random() * 0.6;
      updateEnergy(randomEnergy);
    }, 200);
  };
  
  useEffect(() => {
    // Prüfe regelmäßig auf Audio-Inaktivität
    const checkActivityInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastActivityCheckRef.current;
      lastActivityCheckRef.current = now;
      
      if (isAudioActive) {
        // Zurücksetzen des Inaktivitäts-Timers bei Audio-Aktivität
        inactivityTimerRef.current = 0;
        
        // Wenn Fallback aktiv ist, deaktivieren
        if (fallbackActive) {
          console.log("Audio activity detected, stopping fallback animation");
          setFallbackActive(false);
          cleanupIntervals();
        }
      } else {
        // Erhöhe den Inaktivitäts-Timer
        inactivityTimerRef.current += timeSinceLastCheck;
        
        // Starte Fallback nach 15 Sekunden Inaktivität (erhöht von 10 auf 15 Sekunden)
        if (inactivityTimerRef.current >= 15000 && !fallbackActive && fallbackEnabled) {
          startFallback();
        }
      }
    }, 1000); // Prüfe jede Sekunde
    
    return () => {
      clearInterval(checkActivityInterval);
      cleanupIntervals();
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [isAudioActive, fallbackActive, triggerBeat, updateEnergy, fallbackEnabled]);
  
  // Reagiere auf Änderungen des Audio-Status
  useEffect(() => {
    // Wenn Audio aktiv wird, Fallback deaktivieren
    if (isAudioActive && fallbackActive) {
      console.log("Audio activity detected, stopping fallback animation");
      setFallbackActive(false);
      cleanupIntervals();
    }
  }, [isAudioActive, fallbackActive]);
  
  // Gibt zurück, ob die Fallback-Animation aktiv ist
  return fallbackActive;
} 