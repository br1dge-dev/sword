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

// Glitch-Intensität für verschiedene Level - erhöht
export const glitchIntensity = {
  0: 0,    // Kein Glitch
  1: 0.5,  // Leichte Glitches (erhöht von 0.3)
  2: 0.8,  // Mittlere Glitches (erhöht von 0.6)
  3: 1.2   // Starke Glitches (erhöht von 1.0)
};

// Glitch-Häufigkeit für verschiedene Level - sehr stark erhöht
export const glitchFrequency = {
  0: 0,    // Kein Glitch
  1: 0.4,  // 40% Chance für Glitch (erhöht von 25%)
  2: 0.7,  // 70% Chance für Glitch (erhöht von 50%)
  3: 0.9   // 90% Chance für Glitch (erhöht von 75%)
};

// Farbeffekt-Häufigkeit für verschiedene Level
export const colorEffectFrequency = {
  0: 0.05,  // Minimale Farbeffekte
  1: 0.15,  // 15% Chance für Farbeffekte
  2: 0.25,  // 25% Chance für Farbeffekte
  3: 0.4    // 40% Chance für Farbeffekte
};

// Farbeffekt-Intensität (Anzahl der farbigen Tiles) - um 20% erhöht
export const colorEffectIntensity = {
  0: 2,     // Minimale Farbeffekte (unverändert)
  1: 5,     // 5 Cluster (erhöht von 4 um 25%)
  2: 8,     // 8 Cluster (erhöht von 7 um ~14%)
  3: 12     // 12 Cluster (erhöht von 10 um 20%)
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
  '#00FFCC', // Mint
  // NEU: 5 zusätzliche harmonische Fehlfarben
  '#FF6B35', // Feuer-Orange (warm, energetisch)
  '#8A2BE2', // Deep Purple (mystisch, intensiv)
  '#00D4AA', // Aqua-Mint (frisch, beruhigend)
  '#FF1493', // Deep Pink (leidenschaftlich, dynamisch)
  '#32CD32'  // Lime Green (lebendig, natürlich)
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
  '#F5D300', // Gelb
  // NEU: 5 zusätzliche kontrastierende Akzentfarben
  '#FF4500', // Orange Red (feurig, kontrastreich)
  '#9370DB', // Medium Purple (sanft, ausgewogen)
  '#20B2AA', // Light Sea Green (tief, beruhigend)
  '#FF69B4', // Hot Pink (lebendig, auffällig)
  '#ADFF2F'  // Green Yellow (hell, energetisch)
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
  0: 2.6,    // Normal (um 30% erhöht)
  1: 3.9,    // Etwas mehr (um 30% erhöht)
  2: 6.5,    // Deutlich mehr (um 30% erhöht)
  3: 9.1     // Viele Äderchen (um 30% erhöht)
}; 