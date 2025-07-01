/**
 * PowerUp Store
 * 
 * Manages the state for power-up effects across the application.
 */
import { create } from 'zustand';

interface PowerUpState {
  isPoweredUp: boolean;
  startPowerUp: () => void;
}

export const usePowerUpStore = create<PowerUpState>((set) => ({
  isPoweredUp: false,
  startPowerUp: () => {
    set({ isPoweredUp: true });
    setTimeout(() => {
      set({ isPoweredUp: false });
    }, 3000); // 3 Sekunden Power-Up-Effekt
  }
})); 