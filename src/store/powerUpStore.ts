/**
 * PowerUp Store
 * 
 * Manages the state for power-up effects across the application.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PowerUpState {
  // Schwert-Level (1-3)
  currentLevel: number;
  maxLevel: number;
  
  // Schmiede-Fortschritt (0-100%)
  forgeProgress: number;
  isForgeComplete: boolean;
  
  // Charge-Effekt (1-3)
  chargeLevel: number;
  maxChargeLevel: number;
  chargeProgress: number;
  isChargeComplete: boolean;
  
  // Glitch-Effekt (1-3)
  glitchLevel: number;
  maxGlitchLevel: number;
  glitchProgress: number;
  isGlitchComplete: boolean;
  
  // Aktionen
  startPowerUp: () => void;
  increaseChargeLevel: () => void;
  increaseGlitchLevel: () => void;
  
  // Fortschritt-Aktionen
  increaseForgeProgress: () => void;
  increaseChargeProgress: () => void;
  increaseGlitchProgress: () => void;
  resetForgeProgress: () => void;
  
  // Hilfsfunktion zum Zurücksetzen aller Effekte
  resetAllEffects: () => void;
}

// Erstelle den Store mit Persistenz
export const usePowerUpStore = create<PowerUpState>()(
  persist(
    (set) => ({
      currentLevel: 1,
      maxLevel: 3,
      forgeProgress: 0,
      isForgeComplete: false,
      chargeLevel: 1,
      maxChargeLevel: 3,
      chargeProgress: 0,
      isChargeComplete: false,
      glitchLevel: 1,
      maxGlitchLevel: 3,
      glitchProgress: 0,
      isGlitchComplete: false,
      
      startPowerUp: () => {
        set((state) => {
          // Prüfen, ob der Schmiedeprozess abgeschlossen ist
          if (!state.isForgeComplete) {
            return state; // Keine Änderung, wenn der Schmiedeprozess nicht abgeschlossen ist
          }
          
          // Zum nächsten Level wechseln, oder zurück zu Level 1, wenn maxLevel erreicht
          const nextLevel = state.currentLevel >= state.maxLevel ? 1 : state.currentLevel + 1;
          
          // Fortschritt zurücksetzen nach Level-Up
          return { 
            currentLevel: nextLevel,
            forgeProgress: 0,
            isForgeComplete: false
          };
        });
      },
        
      increaseChargeLevel: () => {
        set((state) => {
          // Prüfen, ob der Charge-Prozess abgeschlossen ist
          if (!state.isChargeComplete) {
            return state; // Keine Änderung, wenn der Charge-Prozess nicht abgeschlossen ist
          }
          
          // Zum nächsten Charge-Level wechseln, oder zurück zu Level 1, wenn maxChargeLevel erreicht
          const nextChargeLevel = state.chargeLevel >= state.maxChargeLevel ? 1 : state.chargeLevel + 1;
          
          // Fortschritt zurücksetzen nach Level-Up
          return { 
            chargeLevel: nextChargeLevel,
            chargeProgress: 0,
            isChargeComplete: false
          };
        });
      },

      increaseGlitchLevel: () => {
        set((state) => {
          // Prüfen, ob der Glitch-Prozess abgeschlossen ist
          if (!state.isGlitchComplete) {
            return state; // Keine Änderung, wenn der Glitch-Prozess nicht abgeschlossen ist
          }
          
          // Zum nächsten Glitch-Level wechseln, oder zurück zu Level 1, wenn maxGlitchLevel erreicht
          const nextGlitchLevel = state.glitchLevel >= state.maxGlitchLevel ? 1 : state.glitchLevel + 1;
          
          // Fortschritt zurücksetzen nach Level-Up
          return { 
            glitchLevel: nextGlitchLevel,
            glitchProgress: 0,
            isGlitchComplete: false
          };
        });
      },
      
      increaseForgeProgress: () => {
        set((state) => {
          // Fortschritt um 10% erhöhen, maximal 100%
          const newProgress = Math.min(state.forgeProgress + 10, 100);
          const isComplete = newProgress >= 100;
          
          return { 
            forgeProgress: newProgress,
            isForgeComplete: isComplete
          };
        });
      },
      
      increaseChargeProgress: () => {
        set((state) => {
          // Fortschritt um 10% erhöhen, maximal 100%
          const newProgress = Math.min(state.chargeProgress + 10, 100);
          const isComplete = newProgress >= 100;
          
          return { 
            chargeProgress: newProgress,
            isChargeComplete: isComplete
          };
        });
      },
      
      increaseGlitchProgress: () => {
        set((state) => {
          // Fortschritt um 10% erhöhen, maximal 100%
          const newProgress = Math.min(state.glitchProgress + 10, 100);
          const isComplete = newProgress >= 100;
          
          return { 
            glitchProgress: newProgress,
            isGlitchComplete: isComplete
          };
        });
      },
      
      resetForgeProgress: () => {
        set({ 
          forgeProgress: 0,
          isForgeComplete: false 
        });
      },
      
      // Hilfsfunktion zum Zurücksetzen aller Effekte
      resetAllEffects: () => {
        set({
          currentLevel: 1,
          chargeLevel: 1,
          glitchLevel: 1,
          forgeProgress: 0,
          isForgeComplete: false,
          chargeProgress: 0,
          isChargeComplete: false,
          glitchProgress: 0,
          isGlitchComplete: false
        });
      }
    }),
    {
      name: 'sword-power-up-storage', // Name für localStorage
      partialize: (state) => ({
        // Speichere nur diese Werte im localStorage
        currentLevel: state.currentLevel,
        chargeLevel: state.chargeLevel,
        glitchLevel: state.glitchLevel,
        forgeProgress: state.forgeProgress,
        isForgeComplete: state.isForgeComplete,
        chargeProgress: state.chargeProgress,
        isChargeComplete: state.isChargeComplete,
        glitchProgress: state.glitchProgress,
        isGlitchComplete: state.isGlitchComplete
      })
    }
  )
); 