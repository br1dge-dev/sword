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
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
  resetBeat: () => void;
}

export const useAudioReactionStore = create<AudioReactionState>((set) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  
  updateEnergy: (energy) => set({ energy }),
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now()
  }),
  
  resetBeat: () => set({ beatDetected: false })
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