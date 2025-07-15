/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * OPTIMIERT: Einfache Idle-Animation mit vordefinierten Vein-Sequenzen
 */
import { create } from 'zustand';
import { useEffect } from 'react';
import { useRef } from 'react';

// Globale Variablen für Idle-Animation
let idleActive = false;
let idleInterval: NodeJS.Timeout | null = null;
let idleStep = 0;
let idleInitialized = false;

// OPTIMIERT: Stark reduzierte Idle-Animation für bessere Performance
const IDLE_STEPS = 3; // 3 Schritte pro Loop (reduziert von 5)
const IDLE_INTERVAL = 6000; // 6 Sekunden pro Schritt (erhöht von 4s)
const IDLE_ENERGY = 0.05; // Sehr niedrige Energy für minimale CPU-Last

// OPTIMIERT: Reduziertes Throttling für bessere Reaktivität
let lastEnergyUpdate = 0;
const ENERGY_UPDATE_THROTTLE = 200; // Reduziert auf 200ms für bessere Reaktivität

// ENTFERNT: Logging-Variablen (lastLogTimeRef, logThrottleInterval)

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
  swordColor: string; // HEX
  setSwordColor: (color: string) => void;
  frequencyData: Uint8Array | null;
  setFrequencyData: (data: Uint8Array) => void;
  
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
  swordColor: '#00FCA6',
  frequencyData: null,
  setSwordColor: (color) => set({ swordColor: color }),
  setFrequencyData: (data) => set({ frequencyData: data }),
  
  updateEnergy: (energy, opts = {}) => {
    const now = Date.now();
    if (now - lastEnergyUpdate < ENERGY_UPDATE_THROTTLE) {
      return; // Skip update if too soon
    }
    lastEnergyUpdate = now;
    const currentState = get();
    
    // NEU: Empfindlichere Idle-Animation-Deaktivierung
    if (currentState.isMusicPlaying && energy > 0.01 && idleActive) { // Reduziert von 0.02 für empfindlichere Reaktion
      get().stopIdle();
    }
    
    // Nur forceIdle-Updates blockieren, wenn Musik läuft
    if (opts.forceIdle && currentState.isMusicPlaying) {
      // Idle-Energy darf Musik-Energy nicht überschreiben
      return;
    }
    
    set((state) => ({ 
      energy,
      isAudioActive: energy > 0.01 ? true : state.isAudioActive // Reduziert von 0.02 für empfindlichere Reaktionen
    }));
  },
  
  triggerBeat: () => {
    const currentState = get();
    // OPTIMIERT: Setze isAudioActive nur wenn keine Idle-Animation läuft oder Musik spielt
    set({ 
      beatDetected: true,
      lastBeatTime: Date.now(),
      isAudioActive: !idleActive || currentState.isMusicPlaying
    });
    
    // WICHTIG: Stoppe Idle-Animation sofort wenn Musik spielt
    if (currentState.isMusicPlaying && idleActive) {
      get().stopIdle();
    }
  },
  
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
          // Setze explizit Audio auf inaktiv und Energie auf 0, damit Idle sicher starten kann
          const { setAudioActive, updateEnergy, startIdle } = get();
          setAudioActive(false);
          updateEnergy(0);
          startIdle();
          // throttledLog("Music paused, starting idle animation", true);
        }
      }, 5000); // Erhöht auf 5000ms um Track-Wechsel zu berücksichtigen
    }
    // OPTIMIERT: Stoppe Idle IMMER wenn Musik spielt (nicht nur wenn idleActive bereits true ist)
    else if (playing) {
      get().stopIdle();
    }
  },
  
  // OPTIMIERT: Einfache Idle-Animation mit vordefinierten Sequenzen
  startIdle: () => {
    const store = get();
    if (!store.idleEnabled) return;
    
    // WICHTIG: Starte Idle NICHT wenn Musik spielt
    if (store.isMusicPlaying) {
      // throttledLog("Cannot start idle animation while music is playing", true);
      return;
    }
    
    // WICHTIG: Starte Idle NICHT wenn bereits Audio-Aktivität vorhanden ist
    if (store.isAudioActive && store.energy > 0.02) {
      // throttledLog("Cannot start idle animation while audio is active", true);
      return;
    }
    
    // Wenn die Idle-Animation bereits aktiv ist, nichts tun
    if (idleActive) {
      return;
    }
    
    // OPTIMIERT: Sauberes Cleanup bestehender Intervalle
    if (idleInterval) {
      clearInterval(idleInterval);
      idleInterval = null;
    }
    
    idleActive = true;
    idleStep = 0;
    
    // Setze konstante, niedrige Energy für subtile Animation
    store.updateEnergy(IDLE_ENERGY, { forceIdle: true });
    
    // OPTIMIERT: Einfache Schritt-für-Schritt Animation
    idleInterval = setInterval(() => {
      if (!idleActive) return;
      
      // WICHTIG: Stoppe Idle-Animation sofort wenn Musik spielt
      const currentState = useAudioReactionStore.getState();
      if (currentState.isMusicPlaying) {
        get().stopIdle();
        return;
      }
      
      // Erhöhe den Schritt
      idleStep = (idleStep + 1) % IDLE_STEPS;
      
      // Trigger einen subtilen Beat nur alle 6 Schritte für minimale Bewegung
      if (idleStep % 6 === 0) {
        store.triggerBeat();
        
        // Automatisches Beat-Reset nach 100ms (kürzer für weniger CPU-Last)
        setTimeout(() => {
          if (useAudioReactionStore.getState().beatDetected) {
            const { resetBeat } = useAudioReactionStore.getState();
            resetBeat();
          }
        }, 100);
      }
      
      // Log nur beim Start und alle 10 Schritte (ein kompletter Loop)
      if (idleStep === 0) {
        // throttledLog("Idle animation loop completed");
      }
    }, IDLE_INTERVAL);
    
    // throttledLog("Idle animation started", true);
  },
  
  // OPTIMIERT: Verbesserte Idle-Beendigung
  stopIdle: () => {
    if (idleInterval) {
      clearInterval(idleInterval);
      idleInterval = null;
    }
    
    idleActive = false;
    idleStep = 0;
    
    // OPTIMIERT: Reset Energy auf 0 wenn Idle gestoppt wird
    set({ energy: 0 });
    
    // throttledLog("Idle animation stopped", true);
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
    // OPTIMIERT: Starte Idle nur wenn Musik NICHT spielt und Idle aktiviert ist
    if (!isMusicPlaying && idleEnabled) {
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
    // OPTIMIERT: Stoppe Idle sofort wenn Musik spielt
    else if (isMusicPlaying) {
      const { stopIdle } = useAudioReactionStore.getState();
      stopIdle();
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
  
  // throttledLog('Audio intervals cleaned up', true);
} 