import { generateHarmonicColorPair } from '@/components/ascii/sword-modules/effects/colorEffects';

// Effekt-Typen
export interface VisualEffects {
  glowIntensity: number;
  baseColor: string;
  bgColor: string;
  lastColorChangeTime: number;
  colorStability: number;
  coloredTiles: Array<{x: number, y: number, color: string}>;
  glitchChars: Array<{x: number, y: number, char: string}>;
  edgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>;
  unicodeGlitches: Array<{x: number, y: number, char: string}>;
  blurredChars: Array<{x: number, y: number}>;
  skewedChars: Array<{x: number, y: number, angle: number}>;
  fadedChars: Array<{x: number, y: number, opacity: number}>;
}

// Action-Typen
export type EffectsAction =
  | { type: 'SET_GLOW_INTENSITY'; payload: number }
  | { type: 'UPDATE_COLORS'; payload: { swordColor: string; bgColor: string } }
  | { type: 'SET_COLOR_STABILITY'; payload: number }
  | { type: 'SET_COLORED_TILES'; payload: Array<{x: number, y: number, color: string}> }
  | { type: 'SET_GLITCH_CHARS'; payload: Array<{x: number, y: number, char: string}> }
  | { type: 'SET_EDGE_EFFECTS'; payload: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> }
  | { type: 'SET_UNICODE_GLITCHES'; payload: Array<{x: number, y: number, char: string}> }
  | { type: 'SET_BLURRED_CHARS'; payload: Array<{x: number, y: number}> }
  | { type: 'SET_SKEWED_CHARS'; payload: Array<{x: number, y: number, angle: number}> }
  | { type: 'SET_FADED_CHARS'; payload: Array<{x: number, y: number, opacity: number}> }
  | { type: 'CLEAR_ALL_EFFECTS' }
  | { type: 'AUDIO_REACTIVE_UPDATE'; payload: { energy: number; beatDetected: boolean; glitchLevel: number; chargeLevel: number } };

// Initialer State
export const initialEffectsState: VisualEffects = {
  glowIntensity: 0,
  baseColor: '#00FCA6',
  bgColor: '#FF03F9',
  lastColorChangeTime: Date.now(),
  colorStability: 2000,
  coloredTiles: [],
  glitchChars: [],
  edgeEffects: [],
  unicodeGlitches: [],
  blurredChars: [],
  skewedChars: [],
  fadedChars: []
};

// Reducer-Funktion
export function effectsReducer(state: VisualEffects, action: EffectsAction): VisualEffects {
  switch (action.type) {
    case 'SET_GLOW_INTENSITY':
      return {
        ...state,
        glowIntensity: action.payload
      };
      
    case 'UPDATE_COLORS':
      return {
        ...state,
        baseColor: action.payload.swordColor,
        bgColor: action.payload.bgColor,
        lastColorChangeTime: Date.now()
      };
      
    case 'SET_COLOR_STABILITY':
      return {
        ...state,
        colorStability: action.payload
      };
      
    case 'SET_COLORED_TILES':
      return {
        ...state,
        coloredTiles: action.payload
      };
      
    case 'SET_GLITCH_CHARS':
      return {
        ...state,
        glitchChars: action.payload
      };
      
    case 'SET_EDGE_EFFECTS':
      return {
        ...state,
        edgeEffects: action.payload
      };
      
    case 'SET_UNICODE_GLITCHES':
      return {
        ...state,
        unicodeGlitches: action.payload
      };
      
    case 'SET_BLURRED_CHARS':
      return {
        ...state,
        blurredChars: action.payload
      };
      
    case 'SET_SKEWED_CHARS':
      return {
        ...state,
        skewedChars: action.payload
      };
      
    case 'SET_FADED_CHARS':
      return {
        ...state,
        fadedChars: action.payload
      };
      
    case 'CLEAR_ALL_EFFECTS':
      return {
        ...state,
        coloredTiles: [],
        glitchChars: [],
        edgeEffects: [],
        unicodeGlitches: [],
        blurredChars: [],
        skewedChars: [],
        fadedChars: []
      };
      
    case 'AUDIO_REACTIVE_UPDATE':
      const { energy, beatDetected, glitchLevel, chargeLevel } = action.payload;
      const now = Date.now();
      
      // Glow-Intensität basierend auf Audio
      let newGlowIntensity = state.glowIntensity;
      if (beatDetected || energy > 0.2) {
        newGlowIntensity = Math.random() * 0.7 + 0.3;
      }
      
      // Farbwechsel basierend auf Audio
      let newColors = { swordColor: state.baseColor, bgColor: state.bgColor };
      let newColorStability = state.colorStability;
      
      if ((energy > 0.30 || beatDetected) && now - state.lastColorChangeTime > state.colorStability) {
        const harmonicColors = generateHarmonicColorPair();
        newColors = harmonicColors;
        
        newColorStability = energy > 0.7 
          ? Math.max(300, Math.floor(1000 - (energy * 800)))
          : Math.floor(1000 + Math.random() * 1500);
      }
      
      return {
        ...state,
        glowIntensity: newGlowIntensity,
        baseColor: newColors.swordColor,
        bgColor: newColors.bgColor,
        colorStability: newColorStability,
        lastColorChangeTime: now
      };
      
    default:
      return state;
  }
}

// Action-Creators für bessere Typsicherheit
export const effectsActions = {
  setGlowIntensity: (intensity: number): EffectsAction => ({
    type: 'SET_GLOW_INTENSITY',
    payload: intensity
  }),
  
  updateColors: (swordColor: string, bgColor: string): EffectsAction => ({
    type: 'UPDATE_COLORS',
    payload: { swordColor, bgColor }
  }),
  
  setColorStability: (stability: number): EffectsAction => ({
    type: 'SET_COLOR_STABILITY',
    payload: stability
  }),
  
  setColoredTiles: (tiles: Array<{x: number, y: number, color: string}>): EffectsAction => ({
    type: 'SET_COLORED_TILES',
    payload: tiles
  }),
  
  setGlitchChars: (chars: Array<{x: number, y: number, char: string}>): EffectsAction => ({
    type: 'SET_GLITCH_CHARS',
    payload: chars
  }),
  
  setEdgeEffects: (effects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}>): EffectsAction => ({
    type: 'SET_EDGE_EFFECTS',
    payload: effects
  }),
  
  setUnicodeGlitches: (glitches: Array<{x: number, y: number, char: string}>): EffectsAction => ({
    type: 'SET_UNICODE_GLITCHES',
    payload: glitches
  }),
  
  setBlurredChars: (chars: Array<{x: number, y: number}>): EffectsAction => ({
    type: 'SET_BLURRED_CHARS',
    payload: chars
  }),
  
  setSkewedChars: (chars: Array<{x: number, y: number, angle: number}>): EffectsAction => ({
    type: 'SET_SKEWED_CHARS',
    payload: chars
  }),
  
  setFadedChars: (chars: Array<{x: number, y: number, opacity: number}>): EffectsAction => ({
    type: 'SET_FADED_CHARS',
    payload: chars
  }),
  
  clearAllEffects: (): EffectsAction => ({
    type: 'CLEAR_ALL_EFFECTS'
  }),
  
  audioReactiveUpdate: (energy: number, beatDetected: boolean, glitchLevel: number, chargeLevel: number): EffectsAction => ({
    type: 'AUDIO_REACTIVE_UPDATE',
    payload: { energy, beatDetected, glitchLevel, chargeLevel }
  })
}; 