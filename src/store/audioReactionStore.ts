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
let lastFallbackEnergyLog = 0;

// OPTIMIERT: Stabilere Fallback-Animation um Einfrieren zu verhindern
const MIN_ENERGY = 0.08; // Erhöht für stabilere Animation und bessere Sichtbarkeit
const MAX_ENERGY = 0.35; // Erhöht für bessere Sichtbarkeit der Effekte
const ENERGY_INTERVAL = 5000; // Reduziert auf 5s für häufigere Effekte
const BEAT_INTERVAL = 8000; // Reduziert auf 8s für häufigere Beats
const BEAT_CHANCE = 0.02; // Erhöht auf 2% für bessere Sichtbarkeit der Effekte

// OPTIMIERT: Reduziertes Throttling für bessere Reaktivität
let lastEnergyUpdate = 0;
const ENERGY_UPDATE_THROTTLE = 200; // Reduziert auf 200ms für bessere Reaktivität

interface UpdateEnergyOptions {
  forceFallback?: boolean;
}

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  isAudioActive: boolean;
  fallbackEnabled: boolean;
  isMusicPlaying: boolean;
  
  // Aktionen
  updateEnergy: (energy: number, opts?: UpdateEnergyOptions) => void;
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
  updateEnergy: (energy, opts = {}) => {
    // Blockiere externe Updates, wenn Fallback aktiv ist und das Update nicht explizit vom Fallback kommt
    if (fallbackActive && !opts.forceFallback) {
      // Debug-Log für Analyse
      // console.log('updateEnergy blockiert: Fallback aktiv, Quelle nicht Fallback');
      return;
    }
    const now = Date.now();
    if (now - lastEnergyUpdate < ENERGY_UPDATE_THROTTLE) {
      return; // Skip update if too soon
    }
    lastEnergyUpdate = now;
    set((state) => ({ 
      energy,
      isAudioActive: energy > 0.02 ? true : state.isAudioActive // Reduziert von 0.05 auf 0.02 für empfindlichere Reaktionen
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
      // OPTIMIERT: Längere Verzögerung für stabilere Animation und um Track-Wechsel zu berücksichtigen
      setTimeout(() => {
        // Prüfe nochmal, ob Musik wirklich gestoppt ist (nicht nur Track-Wechsel)
        const currentState = get();
        if (!currentState.isMusicPlaying && currentState.fallbackEnabled) {
          const { startFallback } = get();
          startFallback();
          console.log("Music paused, forcing fallback activation");
        }
      }, 5000); // Erhöht auf 5000ms um Track-Wechsel zu berücksichtigen
    }
    // Wenn Musik gestartet wird und Fallback aktiv ist
    else if (playing && fallbackActive) {
      get().stopFallback();
    }
  },
  
  // OPTIMIERT: Stabilere Fallback-Verwaltung
  startFallback: () => {
    const store = get();
    if (!store.fallbackEnabled) return;
    
    // Wenn der Fallback bereits aktiv ist, nichts tun
    if (fallbackActive) {
      console.log("Fallback is already active");
      return;
    }
    
    // OPTIMIERT: Sauberes Cleanup bestehender Intervalle
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
    
    // OPTIMIERT: Sanftere Start-Animation für Stabilität
    const initialEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY) * 0.3; // Reduziert auf 0.3 für stabilere Animation
    store.updateEnergy(initialEnergy, { forceFallback: true });
    
    // OPTIMIERT: Sanftere Beat-Generierung für Stabilität
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
    
    // OPTIMIERT: Sanftere Energy-Generierung für Stabilität
    let currentEnergy = initialEnergy;
    let targetEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY);
    let energyStep = 0;
    
    energyInterval = setInterval(() => {
      if (!fallbackActive) return;
      
      // OPTIMIERT: Sanftere Energy-Änderungen für stabilere Animation
      if (Math.abs(currentEnergy - targetEnergy) < 0.01) {
        // Neues Ziel setzen
        targetEnergy = MIN_ENERGY + Math.random() * (MAX_ENERGY - MIN_ENERGY);
        energyStep = (targetEnergy - currentEnergy) / 20; // Erhöht auf 20 für sanftere Übergänge
      }
      
      // Sanfterer Übergang zum Ziel
      currentEnergy = Math.max(MIN_ENERGY, Math.min(MAX_ENERGY, currentEnergy + energyStep));
      
      const now = Date.now();
      if (now - lastFallbackEnergyLog > 10000) {
        console.log(`Fallback: Setting energy to ${currentEnergy.toFixed(3)}`);
        lastFallbackEnergyLog = now;
      }
      store.updateEnergy(currentEnergy, { forceFallback: true });
    }, ENERGY_INTERVAL / 20); // Reduziert auf 20 für häufigere Updates
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
export function useBeatReset(delay: number = 500) {
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
      // OPTIMIERT: Längere Verzögerung für stabilere Animation und um Track-Wechsel zu berücksichtigen
      const timer = setTimeout(() => {
        // Prüfe nochmal, ob Musik wirklich gestoppt ist (nicht nur Track-Wechsel)
        const currentState = useAudioReactionStore.getState();
        if (!currentState.isMusicPlaying && currentState.fallbackEnabled) {
          startFallback();
        }
      }, 5000); // Erhöht auf 5000ms um Track-Wechsel zu berücksichtigen
      
      return () => clearTimeout(timer);
    }
  }, [isMusicPlaying, fallbackEnabled, startFallback]);
  
  return fallbackActive;
}

// OPTIMIERT: Cleanup-Funktion für globale Intervalle
export function cleanupAudioIntervals(): void {
  if (beatInterval) {
    clearInterval(beatInterval);
    beatInterval = null;
  }
  
  if (energyInterval) {
    clearInterval(energyInterval);
    energyInterval = null;
  }
  
  fallbackActive = false;
  console.log('🧹 Audio intervals cleaned up');
} 