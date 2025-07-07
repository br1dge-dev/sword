/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * Speichert die Audio-Energie und Beat-Detection-Informationen.
 */
import { create } from 'zustand';
import { useEffect } from 'react';

// Globale Variablen für Fallback-Animation
let fallbackActive = false;
let beatInterval: NodeJS.Timeout | null = null;
let energyInterval: NodeJS.Timeout | null = null;
let fallbackInitialized = false; // Neue Variable, um zu verfolgen, ob der Fallback bereits initialisiert wurde

// Konstanten für Fallback-Animation
const MIN_ENERGY = 0.2;
const MAX_ENERGY = 0.7; // Reduziert von 0.8, um extremere Werte zu vermeiden
const ENERGY_INTERVAL = 1000; // ms - erhöht von 200ms auf 1000ms
const BEAT_INTERVAL = 3000; // ms - erhöht von 500ms auf 3000ms
const BEAT_CHANCE = 0.1; // 10% Chance für einen Beat - reduziert von 25%

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  isAudioActive: boolean;
  fallbackEnabled: boolean;
  isMusicPlaying: boolean;
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
  setAudioActive: (active: boolean) => void;
  setFallbackEnabled: (enabled: boolean) => void;
  setMusicPlaying: (playing: boolean) => void;
  startFallback: () => void;
  stopFallback: () => void;
  isFallbackActive: () => boolean;
}

// Erstelle den Store
export const useAudioReactionStore = create<AudioReactionState>((set, get) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  isAudioActive: false,
  fallbackEnabled: true,
  isMusicPlaying: false,
  
  updateEnergy: (energy) => set((state) => ({ 
    energy,
    isAudioActive: energy > 0.05 ? true : state.isAudioActive
  })),
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now(),
    isAudioActive: true
  }),
  
  resetBeat: () => set({ beatDetected: false }),
  
  setAudioActive: (active) => set({ isAudioActive: active }),
  
  setFallbackEnabled: (enabled) => set({ fallbackEnabled: enabled }),
  
  setMusicPlaying: (playing) => {
    set({ isMusicPlaying: playing });
    
    // Wenn Musik gestoppt wird und Fallback aktiviert ist
    if (!playing && get().fallbackEnabled) {
      // Kurze Verzögerung vor dem Start des Fallbacks
      setTimeout(() => {
        // Fallback immer neu starten, wenn Musik pausiert wird
        const { startFallback } = get();
        startFallback();
        console.log("Music paused, forcing fallback activation");
      }, 100);
    }
    // Wenn Musik gestartet wird und Fallback aktiv ist
    else if (playing && fallbackActive) {
      get().stopFallback();
    }
  },
  
  startFallback: () => {
    const store = get();
    if (!store.fallbackEnabled) return;
    
    // Wenn der Fallback bereits aktiv ist, nichts tun
    if (fallbackActive) {
      console.log("Fallback is already active");
      return;
    }
    
    // Immer die Intervalle neu starten, auch wenn bereits initialisiert
    // Cleanup bestehender Intervalle
    if (beatInterval) {
      clearInterval(beatInterval);
      beatInterval = null;
    }
    
    if (energyInterval) {
      clearInterval(energyInterval);
      energyInterval = null;
    }
    
    if (fallbackInitialized) {
      console.log("Fallback already initialized, restarting animation");
    } else {
      console.log("Starting fallback animation");
      fallbackInitialized = true;
    }
    
    fallbackActive = true;
    
    // Setze einen anfänglichen Energie-Wert, um Flackern zu vermeiden
    const initialEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY);
    store.updateEnergy(initialEnergy);
    
    // Zufällige Beats generieren (alle BEAT_INTERVAL ms, BEAT_CHANCE Chance)
    beatInterval = setInterval(() => {
      if (!fallbackActive) return; // Sicherheitscheck
      
      if (Math.random() < BEAT_CHANCE) {
        console.log("Fallback: Triggering beat");
        store.triggerBeat();
        
        // Automatisches Beat-Reset nach 100ms
        setTimeout(() => {
          if (useAudioReactionStore.getState().beatDetected) {
            const { resetBeat } = useAudioReactionStore.getState();
            resetBeat();
          }
        }, 100);
      }
    }, BEAT_INTERVAL);
    
    // Zufällige Energie-Level generieren (alle ENERGY_INTERVAL ms)
    energyInterval = setInterval(() => {
      if (!fallbackActive) return; // Sicherheitscheck
      
      // Zufälliger Energie-Level zwischen MIN_ENERGY und MAX_ENERGY
      const randomEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY);
      console.log(`Fallback: Setting energy to ${randomEnergy.toFixed(2)}`);
      store.updateEnergy(randomEnergy);
    }, ENERGY_INTERVAL);
  },
  
  stopFallback: () => {
    console.log("Stopping fallback animation");
    
    if (beatInterval) {
      clearInterval(beatInterval);
      beatInterval = null;
    }
    
    if (energyInterval) {
      clearInterval(energyInterval);
      energyInterval = null;
    }
    
    fallbackActive = false;
    // Wir setzen fallbackInitialized nicht zurück, damit wir den Fallback nicht neu initialisieren müssen
  },
  
  isFallbackActive: () => fallbackActive
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

// Hook für Fallback-Animation
export function useFallbackAnimation() {
  const { isMusicPlaying, fallbackEnabled, startFallback } = useAudioReactionStore();
  
  // Initialisiere Fallback bei Komponentenladung und wenn Musik stoppt
  useEffect(() => {
    if (!isMusicPlaying && fallbackEnabled) {
      console.log("No music playing, activating fallback immediately");
      // Kurze Verzögerung, um sicherzustellen, dass die Komponente vollständig geladen ist
      const timer = setTimeout(() => {
        startFallback();
      }, 300); // Längere Verzögerung für bessere Stabilität
      
      return () => clearTimeout(timer);
    }
  }, [isMusicPlaying, fallbackEnabled, startFallback]);
  
  return fallbackActive;
} 