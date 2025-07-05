/**
 * swordConstants.ts
 * 
 * Konstanten und Konfigurationswerte für die ASCII-Schwert-Komponente
 */

// ASCII art für verschiedene Schwert-Level
export const swordLevels = {
  1: `
      /\\
      /█\\
      |█|
      |█|
      |█|
      |█|
      |█|
      |█|
    __▓█▓__
   /███████\\
      |█|
      |█|
      |█|
      V
`,
  2: `
     /\\
    /██\\
    |██|
    |██|
    |██|
    |██|
    |██|
    |██|
    |██|
   _▓██▓_
  /████████\\
    |██|
    |██|
    |██|
    VV
`,
  3: `
      /\\
     /█\\
    /███\\
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
    |███|
   _▓███▓_
  /███████\\
     |█|
     |█|
     |█|
     |█|
    /_V_\\
`
};

// Dünne Linien-Zeichen für verschiedene Level
export const edgeChars = {
  1: ['/', '\\', '|', 'V', '_'],
  2: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_'],
  3: ['/', '\\', '|', 'V', '_', '/', '\\', '|', 'V', '_', '╱', '╲', '┃', '┏', '┓', '┗', '┛']
};

// Glitch-Varianten für dünne Linien
export const edgeGlitchChars = {
  1: ['/', '\\', '|', 'V', '_', '╱', '╲', '│'],
  2: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰'],
  3: ['/', '\\', '|', 'V', '_', '╱', '╲', '│', '┃', '┏', '┓', '┗', '┛', '╭', '╮', '╯', '╰', '⌜', '⌝', '⌞', '⌟', '◢', '◣', '◤', '◥']
};

// Vibrations-Intensität für verschiedene Level
export const vibrationIntensity = {
  1: 0.2,  // Leichte Vibration
  2: 0.6,  // Mittlere Vibration (erhöht von 0.5)
  3: 0.8   // Starke Vibration
};

// Glitch-Intensität für verschiedene Level
export const glitchIntensity = {
  0: 0,    // Kein Glitch
  1: 0.3,  // Leichte Glitches
  2: 0.6,  // Mittlere Glitches
  3: 1.0   // Starke Glitches
};

// Glitch-Häufigkeit für verschiedene Level
export const glitchFrequency = {
  0: 0,    // Kein Glitch
  1: 0.1,  // 10% Chance für Glitch
  2: 0.25, // 25% Chance für Glitch
  3: 0.4   // 40% Chance für Glitch
};

// Farbeffekt-Häufigkeit für verschiedene Level
export const colorEffectFrequency = {
  0: 0.05,  // Minimale Farbeffekte
  1: 0.15,  // 15% Chance für Farbeffekte
  2: 0.25,  // 25% Chance für Farbeffekte
  3: 0.4    // 40% Chance für Farbeffekte
};

// Farbeffekt-Intensität (Anzahl der farbigen Tiles)
export const colorEffectIntensity = {
  0: 2,     // Minimale Farbeffekte (erhöht von 1)
  1: 4,     // 4 Cluster (erhöht von 3)
  2: 7,     // 7 Cluster (erhöht von 5)
  3: 10     // 10 Cluster (erhöht von 8)
};

// Höhlen/Fels Hintergrund-Muster
export const caveBgPatterns = [
  '░░▒▒░░▒▓▓▒░░▒▒░░',
  '▒░░▒▒▓▒▒░░▓▒▒▒░',
  '░▒▒░▒▒▓▒░▒▒░▒▓░',
  '▒▒▓▒░▒░░▒▓▓▒░▒▒',
  '░▒▓▓▒░░▒▒░░▓▒░░',
  '▒░░▒▓▒▒░▒▓▒░░▒▒',
  '░▒▒░░▓▓▒░░▒▒▓▒░',
  '▒▓▒░▒▒░░▒▓▒░░▒▒',
  '░░▒▓▓▒░░▒▒▓▓▒░░',
  '▒▒░░▒▓▒▒░░▒▓▒▒░',
  '░▓▒▒░░▒▓▓▒░░▒▓░',
  '▒░▒▓▒░░▒▒▓▓▒░▒▒',
  '░░▒▓▓▒░░▒▒▓▓▒░░',
  '▒░░▒▓▓▒░░▒▓▓▒░▒',
  '░▒▒░░▒▓▒▒░░▒▒░░',
];

// Unorthodoxe Farbpalette
export const baseColors = [
  '#00FCA6', // Cyber-Grün (Basis)
  '#FF3EC8', // Neon-Pink
  '#3EE6FF', // Elektrisches Blau
  '#F8E16C', // Acid-Gelb
  '#9D00FF', // Lila
  '#FF5722', // Brennendes Orange
  '#00FF66', // Radioaktives Grün
  '#FF00A0', // Hot Pink
  '#7DF9FF', // Elektrisches Cyan
  '#CCFF00', // Giftig Grün-Gelb
  '#FF5F1F', // Neon-Orange
  '#19FFBF', // Türkis
  '#B3FF00', // Lime
  '#FF00FF', // Magenta
  '#00FFCC'  // Mint
];

// Noch ungewöhnlichere Akzentfarben
export const accentColors = [
  '#FC2F9E', // Magenta-Pink
  '#09FBD3', // Türkis
  '#FE53BB', // Hot Pink
  '#F5D300', // Leuchtendes Gelb
  '#7122FA', // Elektrisches Lila
  '#08F7FE', // Cyan
  '#00FFFF', // Aqua
  '#FF2281', // Neon-Rosa
  '#FF8B8B', // Koralle
  '#93FFD8', // Mintgrün
  '#CEFF00', // Limette
  '#A6A6FF', // Lavendel
  '#FF9E7A', // Pfirsich
  '#08F7FE', // Elektrisches Blau
  '#09FBD3', // Türkis
  '#FE53BB', // Magenta
  '#F5D300'  // Gelb
];

// Glitch-Symbole für DOS-Style Glitches
export const glitchSymbols = ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼'];

// Unicode-Glitch-Symbole für verschiedene Level
export const unicodeGlitchChars = {
  1: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►'],
  2: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥'],
  3: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▲', '▼', '◄', '►', '◊', '○', '●', '◘', '◙', '☼', '♦', '♣', '♠', '♥', '╬', '╫', '╪', '╩', '╦', '╣', '╠', '╚', '╔', '╗', '╝', '║', '╢', '╟', '╧', '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']
};

// Hintergrund-Äderchen-Intensität für verschiedene Level
export const veinIntensity = {
  0: 2.0,    // Normal (stark erhöht)
  1: 3.0,    // Etwas mehr (stark erhöht)
  2: 5.0,    // Deutlich mehr (stark erhöht)
  3: 7.0     // Viele Äderchen (stark erhöht)
}; 