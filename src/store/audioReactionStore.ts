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
  isMusicPlaying: boolean; // Neuer Status für aktive Musikwiedergabe
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
  setAudioActive: (active: boolean) => void;
  setFallbackEnabled: (enabled: boolean) => void;
  setMusicPlaying: (playing: boolean) => void; // Neue Aktion
}

// Erstelle den Store
export const useAudioReactionStore = create<AudioReactionState>((set) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  isAudioActive: false, // Standardmäßig inaktiv, um Fallback zu ermöglichen
  fallbackEnabled: true, // Standardmäßig aktiviert
  isMusicPlaying: false, // Standardmäßig keine Musik
  
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
  
  setFallbackEnabled: (enabled) => set({ fallbackEnabled: enabled }),
  
  setMusicPlaying: (playing) => set({ isMusicPlaying: playing }) // Neue Aktion
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

// Globale Referenzen für die Fallback-Intervalle, um sicherzustellen, dass sie nur einmal existieren
let globalBeatInterval: NodeJS.Timeout | null = null;
let globalEnergyInterval: NodeJS.Timeout | null = null;

// Hook für Fallback-Animation, wenn keine Audio-Reaktivität vorhanden ist
export function useFallbackAnimation() {
  const { isAudioActive, triggerBeat, updateEnergy, fallbackEnabled, isMusicPlaying } = useAudioReactionStore();
  const [fallbackActive, setFallbackActive] = useState(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<number>(0);
  const lastActivityCheckRef = useRef<number>(Date.now());
  
  // Cleanup-Funktion
  const cleanupIntervals = () => {
    if (globalBeatInterval) {
      clearInterval(globalBeatInterval);
      globalBeatInterval = null;
    }
    if (globalEnergyInterval) {
      clearInterval(globalEnergyInterval);
      globalEnergyInterval = null;
    }
  };
  
  // Starte die Fallback-Animation
  const startFallback = () => {
    if (!fallbackEnabled) return;
    
    console.log("Starting fallback animation");
    setFallbackActive(true);
    
    // Cleanup vor dem Erstellen neuer Intervalle
    cleanupIntervals();
    
    // Zufällige Beats generieren (alle 500ms, 25% Chance)
    globalBeatInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        console.log("Fallback: Triggering beat");
        triggerBeat();
      }
    }, 500);
    
    // Zufällige Energie-Level generieren (alle 200ms)
    globalEnergyInterval = setInterval(() => {
      // Zufälliger Energie-Level zwischen 0.2 und 0.8
      const randomEnergy = 0.2 + Math.random() * 0.6;
      console.log(`Fallback: Setting energy to ${randomEnergy.toFixed(2)}`);
      updateEnergy(randomEnergy);
    }, 200);
  };
  
  // Sofort Fallback starten, wenn keine Musik abgespielt wird
  useEffect(() => {
    // Wenn keine Musik abgespielt wird und Fallback aktiviert ist
    if (!isMusicPlaying && fallbackEnabled && !fallbackActive) {
      console.log("No music playing, activating fallback immediately");
      startFallback();
    }
    // Wenn Musik gestartet wird, Fallback deaktivieren
    else if (isMusicPlaying && fallbackActive) {
      console.log("Music started playing, deactivating fallback");
      setFallbackActive(false);
      cleanupIntervals();
    }
    
    // Cleanup beim Unmount
    return () => {
      if (fallbackActive) {
        cleanupIntervals();
      }
    };
  }, [isMusicPlaying, fallbackEnabled, fallbackActive]);
  
  useEffect(() => {
    // Prüfe regelmäßig auf Audio-Inaktivität, aber nur wenn Musik abgespielt wird
    const checkActivityInterval = setInterval(() => {
      // Wenn keine Musik abgespielt wird, ignorieren wir die Audio-Aktivität
      if (!isMusicPlaying) {
        if (!fallbackActive && fallbackEnabled) {
          startFallback();
        }
        return;
      }
      
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
        
        // Starte Fallback nach 5 Sekunden Inaktivität (reduziert von 15 auf 5 Sekunden)
        if (inactivityTimerRef.current >= 5000 && !fallbackActive && fallbackEnabled) {
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
  }, [isAudioActive, fallbackActive, triggerBeat, updateEnergy, fallbackEnabled, isMusicPlaying]);
  
  // Gibt zurück, ob die Fallback-Animation aktiv ist
  return fallbackActive;
} 