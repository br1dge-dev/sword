/**
 * swordTypes.ts
 * 
 * Typen-Definitionen für die ASCII-Schwert-Komponente
 */

/**
 * Props für die AsciiSword-Komponente
 */
export interface AsciiSwordProps {
  level?: number;
}

/**
 * Position eines Punktes im 2D-Raum
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Position eines Schwert-Elements
 */
export interface SwordPosition extends Point {}

/**
 * Position einer Kante mit zugehörigem Zeichen
 */
export interface EdgePosition extends Point {
  char: string;
}

/**
 * Glitch-Effekt für eine Kante
 */
export interface EdgeEffect extends Point {
  char?: string;
  color?: string;
  offset?: Point;
}

/**
 * Unicode-Glitch an einer Position
 */
export interface UnicodeGlitch extends Point {
  char: string;
}

/**
 * Farbiges Tile an einer Position
 */
export interface ColoredTile extends Point {
  color: string;
}

/**
 * Glitch-Zeichen an einer Position
 */
export interface GlitchChar extends Point {
  char: string;
}

/**
 * Farbige Ader an einer Position
 */
export interface ColoredVein extends Point {
  color: string;
}

/**
 * Verzerrtes Zeichen an einer Position
 */
export interface SkewedChar extends Point {
  angle: number;
}

/**
 * Verblasstes Zeichen an einer Position
 */
export interface FadedChar extends Point {
  opacity: number;
}

/**
 * Intervalle für die Animation
 */
export interface IntervalRefs {
  [key: string]: NodeJS.Timeout | null;
} 