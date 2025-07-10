/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * OPTIMIERT: Einfache Idle-Animation mit vordefinierten Vein-Sequenzen
 */
import { create } from 'zustand';
import { useEffect } from 'react';

// Globale Variablen für Idle-Animation
let idleActive = false;
let idleInterval: NodeJS.Timeout | null = null;
let idleStep = 0;
let idleInitialized = false;

// OPTIMIERT: Einfache Idle-Animation mit vordefinierten Sequenzen
const IDLE_STEPS = 10; // 10 Schritte pro Loop
const IDLE_INTERVAL = 2000; // 2 Sekunden pro Schritt
const IDLE_ENERGY = 0.15; // Konstante, niedrige Energy für subtile Animation

// OPTIMIERT: Reduziertes Throttling für bessere Reaktivität
let lastEnergyUpdate = 0;
const ENERGY_UPDATE_THROTTLE = 200; // Reduziert auf 200ms für bessere Reaktivität

interface UpdateEnergyOptions {
  forceIdle?: boolean;
}

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  isAudioActive: boolean;
  idleEnabled: boolean;
  isMusicPlaying: boolean;
  
  // Aktionen
  updateEnergy: (energy: number, opts?: UpdateEnergyOptions) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
  setAudioActive: (active: boolean) => void;
  setIdleEnabled: (enabled: boolean) => void;
  setMusicPlaying: (playing: boolean) => void;
  startIdle: () => void;
  stopIdle: () => void;
  isIdleActive: () => boolean;
}

export const useAudioReactionStore = create<AudioReactionState>((set, get) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  isAudioActive: false,
  idleEnabled: true,
  isMusicPlaying: false,
  
  updateEnergy: (energy, opts = {}) => {
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
  
  setIdleEnabled: (enabled) => set({ idleEnabled: enabled }),
  
  // OPTIMIERT: Verbesserte Musik-Status-Verwaltung
  setMusicPlaying: (playing) => {
    set({ isMusicPlaying: playing });
    
    // Wenn Musik gestoppt wird und Idle aktiviert ist
    if (!playing && get().idleEnabled) {
      // OPTIMIERT: Längere Verzögerung für stabilere Animation und um Track-Wechsel zu berücksichtigen
      setTimeout(() => {
        // Prüfe nochmal, ob Musik wirklich gestoppt ist (nicht nur Track-Wechsel)
        const currentState = get();
        if (!currentState.isMusicPlaying && currentState.idleEnabled) {
          const { startIdle } = get();
          startIdle();
          console.log("Music paused, starting idle animation");
        }
      }, 5000); // Erhöht auf 5000ms um Track-Wechsel zu berücksichtigen
    }
    // Wenn Musik gestartet wird und Idle aktiv ist
    else if (playing && idleActive) {
      get().stopIdle();
    }
  },
  
  // OPTIMIERT: Einfache Idle-Animation mit vordefinierten Sequenzen
  startIdle: () => {
    const store = get();
    if (!store.idleEnabled) return;
    
    // Wenn die Idle-Animation bereits aktiv ist, nichts tun
    if (idleActive) {
      console.log("Idle animation is already active");
      return;
    }
    
    // OPTIMIERT: Sauberes Cleanup bestehender Intervalle
    if (idleInterval) {
      clearInterval(idleInterval);
      idleInterval = null;
    }
    
    if (idleInitialized) {
      console.log("Idle animation already initialized, restarting");
    } else {
      console.log("Starting idle animation");
      idleInitialized = true;
    }
    
    idleActive = true;
    idleStep = 0;
    
    // Setze konstante, niedrige Energy für subtile Animation
    store.updateEnergy(IDLE_ENERGY, { forceIdle: true });
    
    // OPTIMIERT: Einfache Schritt-für-Schritt Animation
    idleInterval = setInterval(() => {
      if (!idleActive) return;
      
      // Erhöhe den Schritt
      idleStep = (idleStep + 1) % IDLE_STEPS;
      
      // Trigger einen subtilen Beat alle 3 Schritte für minimale Bewegung
      if (idleStep % 3 === 0) {
        console.log(`Idle: Step ${idleStep + 1}/${IDLE_STEPS} - triggering subtle beat`);
        store.triggerBeat();
        
        // Automatisches Beat-Reset nach 200ms
        setTimeout(() => {
          if (useAudioReactionStore.getState().beatDetected) {
            const { resetBeat } = useAudioReactionStore.getState();
            resetBeat();
          }
        }, 200);
      }
      
      // Log alle 10 Schritte (ein kompletter Loop)
      if (idleStep === 0) {
        console.log("Idle: Completed one animation loop");
      }
    }, IDLE_INTERVAL);
  },
  
  // OPTIMIERT: Verbesserte Idle-Beendigung
  stopIdle: () => {
    console.log("Stopping idle animation");
    
    if (idleInterval) {
      clearInterval(idleInterval);
      idleInterval = null;
    }
    
    idleActive = false;
    idleStep = 0;
  },
  
  isIdleActive: () => idleActive
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

// OPTIMIERT: Hook für Idle-Animation
export function useIdleAnimation() {
  const { isMusicPlaying, idleEnabled, startIdle } = useAudioReactionStore();
  
  // Initialisiere Idle bei Komponentenladung und wenn Musik stoppt
  useEffect(() => {
    if (!isMusicPlaying && idleEnabled) {
      console.log("No music playing, activating idle animation");
      // OPTIMIERT: Längere Verzögerung für stabilere Animation und um Track-Wechsel zu berücksichtigen
      const timer = setTimeout(() => {
        // Prüfe nochmal, ob Musik wirklich gestoppt ist (nicht nur Track-Wechsel)
        const currentState = useAudioReactionStore.getState();
        if (!currentState.isMusicPlaying && currentState.idleEnabled) {
          startIdle();
        }
      }, 5000); // Erhöht auf 5000ms um Track-Wechsel zu berücksichtigen
      
      return () => clearTimeout(timer);
    }
  }, [isMusicPlaying, idleEnabled, startIdle]);
  
  return idleActive;
}

// OPTIMIERT: Cleanup-Funktion für globale Intervalle
export function cleanupAudioIntervals(): void {
  if (idleInterval) {
    clearInterval(idleInterval);
    idleInterval = null;
  }
  
  idleActive = false;
  idleStep = 0;
  console.log('🧹 Audio intervals cleaned up');
} 