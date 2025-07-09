/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * OPTIMIERT: Memory-Leak-Prävention, reduzierte Energy-Updates, bessere Performance
 */
import { create } from 'zustand';
import { useEffect } from 'react';

// Globale Variablen für Fallback-Animation
let fallbackActive = false;
let beatInterval: NodeJS.Timeout | null = null;
let energyInterval: NodeJS.Timeout | null = null;
let fallbackInitialized = false;

// OPTIMIERT: Konstanten für Fallback-Animation
const MIN_ENERGY = 0.2;
const MAX_ENERGY = 0.7;
const ENERGY_INTERVAL = 2000; // OPTIMIERT: Erhöht von 1000ms auf 2000ms für bessere Performance
const BEAT_INTERVAL = 4000; // OPTIMIERT: Erhöht von 3000ms auf 4000ms
const BEAT_CHANCE = 0.05; // OPTIMIERT: Reduziert von 0.1 auf 0.05

// OPTIMIERT: Throttling für Energy-Updates
let lastEnergyUpdate = 0;
const ENERGY_UPDATE_THROTTLE = 100; // 100ms zwischen Energy-Updates

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
  
  // OPTIMIERT: Throttled Energy-Updates
  updateEnergy: (energy) => {
    const now = Date.now();
    if (now - lastEnergyUpdate < ENERGY_UPDATE_THROTTLE) {
      return; // Skip update if too soon
    }
    lastEnergyUpdate = now;
    
    set((state) => ({ 
      energy,
      isAudioActive: energy > 0.05 ? true : state.isAudioActive
    }));
  },
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now(),
    isAudioActive: true
  }),
  
  resetBeat: () => set({ beatDetected: false }),
  
  setAudioActive: (active) => set({ isAudioActive: active }),
  
  setFallbackEnabled: (enabled) => set({ fallbackEnabled: enabled }),
  
  // OPTIMIERT: Verbesserte Musik-Status-Verwaltung
  setMusicPlaying: (playing) => {
    set({ isMusicPlaying: playing });
    
    // Wenn Musik gestoppt wird und Fallback aktiviert ist
    if (!playing && get().fallbackEnabled) {
      // OPTIMIERT: Längere Verzögerung für bessere Stabilität
      setTimeout(() => {
        const { startFallback } = get();
        startFallback();
        console.log("Music paused, forcing fallback activation");
      }, 500); // OPTIMIERT: Erhöht von 100ms auf 500ms
    }
    // Wenn Musik gestartet wird und Fallback aktiv ist
    else if (playing && fallbackActive) {
      get().stopFallback();
    }
  },
  
  // OPTIMIERT: Verbesserte Fallback-Verwaltung
  startFallback: () => {
    const store = get();
    if (!store.fallbackEnabled) return;
    
    // Wenn der Fallback bereits aktiv ist, nichts tun
    if (fallbackActive) {
      console.log("Fallback is already active");
      return;
    }
    
    // OPTIMIERT: Cleanup bestehender Intervalle
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
    
    // OPTIMIERT: Reduzierte Beat-Generierung
    beatInterval = setInterval(() => {
      if (!fallbackActive) return;
      
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
    
    // OPTIMIERT: Reduzierte Energy-Generierung
    energyInterval = setInterval(() => {
      if (!fallbackActive) return;
      
      const randomEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY);
      console.log(`Fallback: Setting energy to ${randomEnergy.toFixed(2)}`);
      store.updateEnergy(randomEnergy);
    }, ENERGY_INTERVAL);
  },
  
  // OPTIMIERT: Verbesserte Fallback-Beendigung
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
  },
  
  isFallbackActive: () => fallbackActive
}));

// OPTIMIERT: Hook für automatisches Beat-Reset
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

// OPTIMIERT: Hook für Fallback-Animation
export function useFallbackAnimation() {
  const { isMusicPlaying, fallbackEnabled, startFallback } = useAudioReactionStore();
  
  // Initialisiere Fallback bei Komponentenladung und wenn Musik stoppt
  useEffect(() => {
    if (!isMusicPlaying && fallbackEnabled) {
      console.log("No music playing, activating fallback immediately");
      // OPTIMIERT: Längere Verzögerung für bessere Stabilität
      const timer = setTimeout(() => {
        startFallback();
      }, 1000); // OPTIMIERT: Erhöht von 300ms auf 1000ms
      
      return () => clearTimeout(timer);
    }
  }, [isMusicPlaying, fallbackEnabled, startFallback]);
  
  return fallbackActive;
} 