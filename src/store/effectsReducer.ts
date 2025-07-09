/**
 * effectsReducer.ts
 * 
 * Zustandsverwaltung für die Effekt-Konfigurationen des ASCII-Schwerts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  TileEffectConfig, 
  defaultTileConfig 
} from '@/components/ascii/sword-modules/effects/tileEffects';
import { 
  GlitchEffectConfig, 
  defaultGlitchConfig 
} from '@/components/ascii/sword-modules/effects/glitchEffects';
import { 
  ColorEffectConfig, 
  defaultColorConfig 
} from '@/components/ascii/sword-modules/effects/colorEffects';

// Zustand für die Effekt-Konfigurationen
interface EffectsState {
  // Konfigurationen
  tileConfig: TileEffectConfig;
  glitchConfig: GlitchEffectConfig;
  colorConfig: ColorEffectConfig;
  
  // Aktionen
  updateTileConfig: (config: Partial<TileEffectConfig>) => void;
  updateGlitchConfig: (config: Partial<GlitchEffectConfig>) => void;
  updateColorConfig: (config: Partial<ColorEffectConfig>) => void;
  updateAllConfigs: (configs: {
    tile?: Partial<TileEffectConfig>;
    glitch?: Partial<GlitchEffectConfig>;
    color?: Partial<ColorEffectConfig>;
  }) => void;
  resetConfigs: () => void;
}

// Store mit Persistenz
export const useEffectsStore = create<EffectsState>()(
  persist(
    (set) => ({
      // Anfangszustand mit Standard-Konfigurationen
      tileConfig: { ...defaultTileConfig },
      glitchConfig: { ...defaultGlitchConfig },
      colorConfig: { ...defaultColorConfig },
      
      // Aktionen
      updateTileConfig: (config) => set((state) => ({
        tileConfig: { ...state.tileConfig, ...config }
      })),
      
      updateGlitchConfig: (config) => set((state) => ({
        glitchConfig: { ...state.glitchConfig, ...config }
      })),
      
      updateColorConfig: (config) => set((state) => ({
        colorConfig: { ...state.colorConfig, ...config }
      })),
      
      updateAllConfigs: (configs) => set((state) => ({
        tileConfig: { ...state.tileConfig, ...(configs.tile || {}) },
        glitchConfig: { ...state.glitchConfig, ...(configs.glitch || {}) },
        colorConfig: { ...state.colorConfig, ...(configs.color || {}) }
      })),
      
      resetConfigs: () => set({
        tileConfig: { ...defaultTileConfig },
        glitchConfig: { ...defaultGlitchConfig },
        colorConfig: { ...defaultColorConfig }
      })
    }),
    {
      name: 'effects-storage', // Name für localStorage
      partialize: (state) => ({
        tileConfig: state.tileConfig,
        glitchConfig: state.glitchConfig,
        colorConfig: state.colorConfig
      })
    }
  )
); 