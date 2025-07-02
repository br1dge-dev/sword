/**
 * PowerUp Store
 * 
 * Manages the state for power-up effects across the application.
 */
import { create } from 'zustand';

interface PowerUpState {
  currentLevel: number;
  maxLevel: number;
  startPowerUp: () => void;
}

export const usePowerUpStore = create<PowerUpState>((set) => ({
  currentLevel: 1,
  maxLevel: 3,
  startPowerUp: () => {
    set((state) => {
      // Zum nächsten Level wechseln, oder zurück zu Level 1, wenn maxLevel erreicht
      const nextLevel = state.currentLevel >= state.maxLevel ? 1 : state.currentLevel + 1;
      return { currentLevel: nextLevel };
    });
    
    // Wenn wir auf Level 1 zurückkehren, setzen wir einen Timer, um automatisch zurückzukehren
    setTimeout(() => {
      set((state) => {
        // Nur zurücksetzen, wenn wir nicht auf Level 1 sind (falls der Benutzer mehrfach geklickt hat)
        if (state.currentLevel !== 1) {
          return { currentLevel: 1 };
        }
        return state;
      });
    }, 3000); // 3 Sekunden Power-Up-Effekt
  }
})); 