/**
 * Flash Store
 * 
 * Manages the state for flash effects across the application.
 */
import { create } from 'zustand';

interface FlashState {
  isFlashing: boolean;
  toggleFlash: () => void;
  startFlash: () => void;
}

export const useFlashStore = create<FlashState>((set) => ({
  isFlashing: false,
  toggleFlash: () => set((state) => ({ isFlashing: !state.isFlashing })),
  startFlash: () => {
    set({ isFlashing: true });
    setTimeout(() => {
      set({ isFlashing: false });
    }, 3000); // 3 Sekunden Flash-Effekt
  }
})); 