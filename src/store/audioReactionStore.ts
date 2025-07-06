/**
 * Audio-Reaction-Store
 * 
 * Zentraler Store für Audio-Reaktionsdaten, der von allen Komponenten verwendet werden kann.
 * Speichert die Audio-Energie und Beat-Detection-Informationen.
 */
import { create } from 'zustand';
import { useEffect } from 'react';

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  isAudioActive: boolean;
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
  setAudioActive: (active: boolean) => void;
}

export const useAudioReactionStore = create<AudioReactionState>((set) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  isAudioActive: false,
  
  updateEnergy: (energy) => set({ 
    energy,
    isAudioActive: true // Wenn Energie aktualisiert wird, ist Audio aktiv
  }),
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now(),
    isAudioActive: true // Wenn Beat erkannt wird, ist Audio aktiv
  }),
  
  resetBeat: () => set({ beatDetected: false }),
  
  setAudioActive: (active) => set({ isAudioActive: active })
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
  const { isAudioActive, triggerBeat, updateEnergy } = useAudioReactionStore();
  
  useEffect(() => {
    // Nur Fallback-Animation starten, wenn keine Audio-Aktivität erkannt wurde
    if (!isAudioActive) {
      console.log("Starting fallback animation due to no audio activity");
      
      // Zufällige Beats generieren
      const beatInterval = setInterval(() => {
        // 25% Chance für einen Beat
        if (Math.random() < 0.25) {
          triggerBeat();
        }
      }, 500);
      
      // Zufällige Energie-Level generieren
      const energyInterval = setInterval(() => {
        // Zufälliger Energie-Level zwischen 0.2 und 0.8
        const randomEnergy = 0.2 + Math.random() * 0.6;
        updateEnergy(randomEnergy);
      }, 200);
      
      return () => {
        clearInterval(beatInterval);
        clearInterval(energyInterval);
      };
    }
  }, [isAudioActive, triggerBeat, updateEnergy]);
} 