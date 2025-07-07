/**
 * backgroundEffects.ts
 * 
 * Funktionen zur Generierung von Hintergrundeffekten für die ASCII-Schwert-Komponente
 * Angepasst für dezentere Effekte, die weniger häufig wechseln
 */
import { caveBgPatterns, accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';

// Maximale Dimensionen für Hintergründe
export const MAX_BG_WIDTH = 200;
export const MAX_BG_HEIGHT = 120;
export const MAX_VEINS = 300; // Maximale Anzahl von Adern

/**
 * Generiert einen Höhlenhintergrund mit dynamischen Texturen und rhythmischen Mustern
 * Angepasst für dezentere Effekte mit längerer Stabilität
 * @param width Breite des Hintergrunds
 * @param height Höhe des Hintergrunds
 * @returns 2D-Array mit Hintergrund-Zeichen
 */
export function generateCaveBackground(width: number, height: number): string[][] {
  const background: string[][] = [];
  
  // Begrenze die Dimensionen auf die maximalen Werte
  const adjustedWidth = Math.min(Math.max(width, 160), MAX_BG_WIDTH);  // Zwischen 160 und MAX_BG_WIDTH
  const adjustedHeight = Math.min(Math.max(height, 100), MAX_BG_HEIGHT);  // Zwischen 100 und MAX_BG_HEIGHT
  
  // Zeitstempel für dynamische Muster
  const timestamp = Date.now();
  
  // Zufällige Musterparameter für diese Generation
  // Bevorzuge noch stärker feinere Muster (0, 3, 4) für dezentere Effekte
  const patternTypeWeights = [0.40, 0.05, 0.05, 0.35, 0.15]; // Höhere Gewichtung für feine Muster
  const patternTypeRand = Math.random();
  let patternType = 0;
  let cumulativeWeight = 0;
  
  // Wähle Mustertyp basierend auf Gewichtung
  for (let i = 0; i < patternTypeWeights.length; i++) {
    cumulativeWeight += patternTypeWeights[i];
    if (patternTypeRand <= cumulativeWeight) {
      patternType = i;
      break;
    }
  }
  
  // Reduzierte Amplitude und Frequenz für dezentere Effekte
  const waveAmplitude = Math.floor(adjustedHeight / (10 + Math.random() * 6)); // Reduzierte Amplitude
  const waveFrequency = 0.03 + (Math.random() * 0.04); // Reduzierte Frequenz
  const noiseScale = 0.06 + (Math.random() * 0.06); // Reduzierte Rauschskalierung
  const patternScale = 0.15 + (Math.random() * 0.25); // Reduzierte Skalierung des Grundmusters
  
  // Zufällige Rotation/Verschiebung für diese Generation
  const rotationAngle = Math.random() * Math.PI * 2; // 0-360 Grad
  const offsetX = Math.floor(Math.random() * adjustedWidth);
  const offsetY = Math.floor(Math.random() * adjustedHeight);
  
  // Überarbeitete Zeichensätze mit noch mehr feinen Linien und weniger Blöcken für dezentere Effekte
  const charSets = [
    // Set 1: Dünne Linien und Punkte (BEVORZUGT)
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' ', ' '], // Mehr Leerzeichen für dezentere Effekte
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '│', '─', '┬', '┴', '┼'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻']
    },
    // Set 2: Blockige Texturen (REDUZIERT)
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' ', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '┤', '├', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻']
    },
    // Set 3: Geometrische Formen (ANGEPASST)
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' ', ' '],
      medium: ['◇', '◆', '◊', '◈', '◦', '◎', '○', '◌'],
      dense: ['◊', '◈', '◎', '◉', '◍', '◐', '◑', '◒', '◓', '◔', '◕']
    },
    // Set 4: Technische Zeichen (OHNE KOMPLEXE SYMBOLE)
    {
      light: ['⌐', '¬', '⌙', '⌖', '·', ':', '.', ' ', ' '],
      medium: ['⌘', '⌂', '⌤', '⌧', '⌗', '╱', '╲', '┌', '┐', '└', '┘'],
      dense: ['⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢']
    },
    // Set 5: Mischung aus feinen Zeichen (BEVORZUGT)
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' ', ' ', ' '], // Mehr Leerzeichen für dezentere Effekte
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '◇', '◆', '⌘', '⎔', '│', '─', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '◎', '◉', '◍', '⎕', '⎖', '⎗']
    }
  ];
  
  // Wähle Zeichensatz für diese Generation
  const selectedCharSet = charSets[patternType];
  
  // Bestimme, ob wir auf einem großen Viewport sind (> 1280px)
  const isLargeViewport = adjustedWidth >= 180;
  
  // Berechne die Zentrumsposition
  const centerX = adjustedWidth / 2;
  
  // Parameter für die Dichtegradierung - verstärkte Ausdünnung für dezentere Effekte
  const fadeStartPercent = isLargeViewport ? 0.25 : 0.40; // Früher mit dem Ausblenden beginnen
  const fadeStart = centerX * fadeStartPercent;
  const fadeWidth = centerX - fadeStart;
  
  // Generiere Basis-Muster für verschiedene Regionen
  const generatePattern = (x: number, y: number, type: string): string => {
    // Transformiere Koordinaten für Rotation und Verschiebung
    const rotX = Math.cos(rotationAngle) * x - Math.sin(rotationAngle) * y;
    const rotY = Math.sin(rotationAngle) * x + Math.cos(rotationAngle) * y;
    const tx = (rotX + offsetX) % adjustedWidth;
    const ty = (rotY + offsetY) % adjustedHeight;
    
    // Verschiedene Mustertypen
    switch(patternType) {
      case 0: // Wellenförmiges Muster mit feinen Linien
        if (Math.sin(tx * patternScale) * Math.cos(ty * patternScale) > 0.4) { // Erhöhter Schwellenwert für weniger Zeichen
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 1: // Konzentrische Kreise mit feinen Linien statt Blöcken
        const dist = Math.sqrt(Math.pow((tx - adjustedWidth/2) / adjustedWidth, 2) + Math.pow((ty - adjustedHeight/2) / adjustedHeight, 2));
        if (Math.abs(Math.sin(dist * 20)) > 0.8) { // Erhöhter Schwellenwert für weniger Zeichen
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 2: // Schachbrettmuster mit feinen Variationen
        if ((Math.floor(tx * patternScale) + Math.floor(ty * patternScale)) % 3 === 0) { // Geändert von 2 auf 3 für weniger Zeichen
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 3: // Spiralmuster mit einfachen Zeichen
        const angle = Math.atan2(ty - adjustedHeight/2, tx - adjustedWidth/2);
        const dist2 = Math.sqrt(Math.pow(tx - adjustedWidth/2, 2) + Math.pow(ty - adjustedHeight/2, 2));
        if (Math.abs(Math.sin(angle * 5 + dist2 * 0.2)) > 0.8) { // Erhöhter Schwellenwert für weniger Zeichen
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 4: // Fraktales Muster mit feinen Zeichen
        if (((tx & ty) % 4 === 0) || ((tx * ty) % 9 === 0)) { // Geändert von 3/7 auf 4/9 für weniger Zeichen
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
    }
    
    // Fallback auf Standardzeichen aus caveBgPatterns mit Präferenz für feine Zeichen
    const patternY = y % caveBgPatterns.length;
    const patternX = x % caveBgPatterns[patternY].length;
    const baseChar = caveBgPatterns[patternY][patternX];
    
    // Ersetze blockige Zeichen durch feinere Alternativen
    if (baseChar === '█' || baseChar === '▓') {
      return selectedCharSet.dense[Math.floor(Math.random() * selectedCharSet.dense.length)];
    } else if (baseChar === '▒') {
      return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
    } else if (baseChar === '░') {
      return selectedCharSet.light[Math.floor(Math.random() * selectedCharSet.light.length)];
    }
    
    return baseChar;
  };
  
  // Initialisiere den Hintergrund mit rhythmischen Mustern
  for (let y = 0; y < adjustedHeight; y++) {
    background[y] = [];
    
    // Erzeuge Welleneffekt für die vertikale Position
    const baseWaveY = Math.sin(y * waveFrequency) * waveAmplitude;
    
    for (let x = 0; x < adjustedWidth; x++) {
      // Berechne Abstand vom Zentrum (für Dichtegradierung)
      const distFromCenter = Math.abs(x - centerX);
      
      // Berechne Wahrscheinlichkeit für leeren Raum basierend auf Abstand vom Zentrum
      let emptyProbability = 0;
      
      if (isLargeViewport && distFromCenter > fadeStart) {
        // Lineare Zunahme der Wahrscheinlichkeit für Leerraum von fadeStart bis centerX
        emptyProbability = Math.min(0.98, (distFromCenter - fadeStart) / fadeWidth);
        
        // Exponentieller Anstieg für natürlicheren Übergang
        emptyProbability = Math.pow(emptyProbability, 1.3); // Reduziert von 1.5 für sanfteren Übergang
        
        // Wenn wir nahe am Rand sind, erhöhe die Wahrscheinlichkeit noch mehr
        if (distFromCenter > centerX * 0.85) {
          emptyProbability = Math.min(0.99, emptyProbability * 1.3);
        }
      }
      
      // Erhöhte Grundwahrscheinlichkeit für Leerraum überall für dezentere Effekte
      emptyProbability = Math.max(emptyProbability, 0.15);
      
      // Wenn die Zufallszahl unter der Wahrscheinlichkeit liegt, setze leeren Raum
      if (Math.random() < emptyProbability) {
        background[y][x] = ' ';
        continue;
      }
      
      // Erzeuge Welleneffekt für die horizontale Position
      const waveX = Math.sin((x + y) * waveFrequency * 0.7) * waveAmplitude;
      const waveY = baseWaveY + Math.cos(x * waveFrequency * 0.5) * (waveAmplitude / 2);
      
      // Kombiniere Wellen für einen dynamischen Effekt
      const noiseValue = Math.abs(Math.sin(x * noiseScale) * Math.cos(y * noiseScale));
      
      // Bestimme Region basierend auf Wellenwerten und Mustern
      const regionValue = (noiseValue + Math.abs(waveX / adjustedWidth) + Math.abs(waveY / adjustedHeight)) / 3;
      
      // Basismuster für diese Position
      const baseChar = generatePattern(x, y, 'base');
      
      // Wähle Zeichensatz basierend auf Region
      let charSet;
      if (regionValue < 0.4) { // Erhöht von 0.3 für mehr leichte Zeichen
        charSet = selectedCharSet.light;
      } else if (regionValue < 0.8) { // Erhöht von 0.7 für weniger dichte Zeichen
        charSet = selectedCharSet.medium;
      } else {
        charSet = selectedCharSet.dense;
      }
      
      // Bei großen Viewports: Zusätzliche Ausdünnung basierend auf Abstand vom Zentrum
      if (isLargeViewport && distFromCenter > fadeStart) {
        // Je weiter vom Zentrum entfernt, desto höhere Wahrscheinlichkeit für leichte Zeichen
        const lightCharProbability = Math.min(0.9, (distFromCenter - fadeStart) / fadeWidth);
        
        if (Math.random() < lightCharProbability) {
          charSet = selectedCharSet.light;
        }
      }
      
      // Füge rhythmische Variation hinzu - reduzierte Häufigkeit für dezentere Effekte
      if ((x + y) % 9 === 0 || Math.sin((x * y) * 0.01 + (timestamp * 0.0001)) > 0.8) { // Geändert von 7/0.7 auf 9/0.8
        // Spezielles Muster an rhythmischen Positionen
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if ((x * y) % 13 === 0 || Math.cos((x - y) * 0.03) > 0.85) { // Geändert von 11/0.8 auf 13/0.85
        // Sekundäres rhythmisches Muster
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if (Math.random() < 0.6) { // Reduziert von 0.7 für weniger Zeichen
        // Grundmuster mit hoher Wahrscheinlichkeit
        background[y][x] = baseChar;
      } else {
        // Zufälliges Zeichen aus dem ausgewählten Set
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      }
    }
  }
  
  // Füge einige kleinere Felsformationen hinzu - reduzierte Anzahl für dezentere Effekte
  const numFormations = Math.floor((adjustedWidth * adjustedHeight) / 200) + 1; // Reduziert von 150 auf 200
  const formationChars = ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻'];
  
  for (let i = 0; i < numFormations; i++) {
    // Bei großen Viewports: Formationen eher in der Mitte platzieren
    let formationX;
    if (isLargeViewport) {
      // Berechne einen Bereich um die Mitte herum (±60% vom Zentrum)
      const minX = Math.floor(centerX * 0.4);
      const maxX = Math.floor(centerX * 1.6);
      formationX = Math.floor(minX + Math.random() * (maxX - minX));
    } else {
      formationX = Math.floor(Math.random() * adjustedWidth);
    }
    
    const formationY = Math.floor(Math.random() * adjustedHeight);
    const formationSize = Math.floor(Math.random() * 5) + 2; // 2-6 Zeichen große Formationen
    
    const formation = generateCluster(
      formationX, 
      formationY, 
      formationSize, 
      adjustedWidth, 
      adjustedHeight
    );
    
    formation.forEach(pos => {
      if (pos.y < adjustedHeight && pos.x < adjustedWidth) {
        // Feine Zeichen für Formationen statt '▒'
        background[pos.y][pos.x] = formationChars[Math.floor(Math.random() * formationChars.length)];
      }
    });
  }
  
  // Füge einige Stalaktiten/Stalagmiten hinzu mit feinen Zeichen
  const numStalactites = Math.floor(adjustedWidth / 5);
  const stalactiteChars = ['╹', '╿', '┃', '│', '╽', '╵'];
  const stalagmiteChars = ['╻', '╿', '┃', '│', '╽', '╵'];
  
  for (let i = 0; i < numStalactites; i++) {
    // Bei großen Viewports: Stalaktiten eher in der Mitte platzieren
    let stalX;
    if (isLargeViewport) {
      // Berechne einen Bereich um die Mitte herum (±60% vom Zentrum)
      const minX = Math.floor(centerX * 0.4);
      const maxX = Math.floor(centerX * 1.6);
      stalX = Math.floor(minX + Math.random() * (maxX - minX));
    } else {
      stalX = Math.floor(Math.random() * adjustedWidth);
    }
    
    const isTop = Math.random() < 0.5;
    
    if (isTop) {
      // Stalaktit von oben mit feinen Zeichen
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        if (y < adjustedHeight) {
          background[y][stalX] = stalactiteChars[Math.floor(Math.random() * stalactiteChars.length)];
        }
      }
    } else {
      // Stalagmit von unten mit feinen Zeichen
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        const posY = adjustedHeight - 1 - y;
        if (posY >= 0) {
          background[posY][stalX] = stalagmiteChars[Math.floor(Math.random() * stalagmiteChars.length)];
        }
      }
    }
  }
  
  // Füge einige kleine "Höhlen" hinzu (Bereiche mit leichter Textur)
  const numCaves = Math.floor((adjustedWidth * adjustedHeight) / 800);
  
  for (let i = 0; i < numCaves; i++) {
    // Bei großen Viewports: Höhlen eher in der Mitte platzieren
    let caveX;
    if (isLargeViewport) {
      // Berechne einen Bereich um die Mitte herum (±60% vom Zentrum)
      const minX = Math.floor(centerX * 0.4);
      const maxX = Math.floor(centerX * 1.6);
      caveX = Math.floor(minX + Math.random() * (maxX - minX));
    } else {
      caveX = Math.floor(Math.random() * adjustedWidth);
    }
    
    const caveY = Math.floor(Math.random() * adjustedHeight);
    
    // Kleinere Höhlen (3-6 Pixel)
    const caveSize = Math.floor(Math.random() * 4) + 3;
    
    // Fülle die Höhle mit dünneren Mustern
    for (let y = Math.max(0, caveY - caveSize); y < Math.min(adjustedHeight, caveY + caveSize); y++) {
      for (let x = Math.max(0, caveX - caveSize); x < Math.min(adjustedWidth, caveX + caveSize); x++) {
        // Berechne den Abstand zum Mittelpunkt
        const distance = Math.sqrt(Math.pow(x - caveX, 2) + Math.pow(y - caveY, 2));
        
        // Wenn der Punkt innerhalb des Höhlenradius liegt, setze dünneres Muster
        if (distance < caveSize) {
          // Nur 30% Chance für komplett leer, 70% Chance für dünneres Muster
          if (Math.random() < 0.3) {
            background[y][x] = ' ';
          } else {
            background[y][x] = ['·', ':', '.', '˙', '°'][Math.floor(Math.random() * 5)];
          }
        }
      }
    }
  }
  
  // Füge einige "Risse" im Hintergrund hinzu
  const numCracks = Math.floor((adjustedWidth * adjustedHeight) / 1000);
  
  for (let i = 0; i < numCracks; i++) {
    // Bei großen Viewports: Risse eher in der Mitte platzieren
    let x;
    if (isLargeViewport) {
      // Berechne einen Bereich um die Mitte herum (±60% vom Zentrum)
      const minX = Math.floor(centerX * 0.4);
      const maxX = Math.floor(centerX * 1.6);
      x = Math.floor(minX + Math.random() * (maxX - minX));
    } else {
      x = Math.floor(Math.random() * adjustedWidth);
    }
    
    let y = Math.floor(Math.random() * adjustedHeight);
    
    // Zufällige Länge für den Riss (5-15 Pixel)
    const crackLength = Math.floor(Math.random() * 11) + 5;
    
    // Zufällige Richtung für den Riss
    let dx = Math.random() < 0.5 ? -1 : 1;
    let dy = Math.random() < 0.5 ? -1 : 1;
    
    // Zeichne den Riss
    for (let j = 0; j < crackLength; j++) {
      // Prüfe, ob der Punkt innerhalb der Grenzen liegt
      if (x >= 0 && x < adjustedWidth && y >= 0 && y < adjustedHeight) {
        // 80% Chance für leeren Raum, 20% Chance für dünnes Muster
        background[y][x] = Math.random() < 0.8 ? ' ' : ['·', ':', '.', '˙', '°'][Math.floor(Math.random() * 5)];
      }
      
      // Bewege den Punkt in die aktuelle Richtung
      x += dx;
      y += dy;
      
      // 20% Chance, die Richtung zu ändern
      if (Math.random() < 0.2) {
        dx = Math.random() < 0.5 ? -1 : 1;
      }
      if (Math.random() < 0.2) {
        dy = Math.random() < 0.5 ? -1 : 1;
      }
    }
  }
  
  return background;
}

/**
 * Generiert farbige Äderchen für den Hintergrund
 * Angepasst für dezentere Effekte
 * @param width Breite des Hintergrunds
 * @param height Höhe des Hintergrunds
 * @param numVeins Anzahl der Äderchen
 * @returns Array mit Äderchen-Positionen und -Farben
 */
export function generateColoredVeins(
  width: number, 
  height: number, 
  numVeins: number
): Array<{x: number, y: number, color: string}> {
  // Begrenze die Anzahl der Äderchen
  const adjustedNumVeins = Math.min(numVeins, MAX_VEINS);
  
  // Array für die Äderchen
  const veins: Array<{x: number, y: number, color: string}> = [];
  
  // Begrenze die Dimensionen auf die maximalen Werte
  const adjustedWidth = Math.min(width, MAX_BG_WIDTH);
  const adjustedHeight = Math.min(height, MAX_BG_HEIGHT);
  
  // Berechne die Zentrumsposition
  const centerX = adjustedWidth / 2;
  const centerY = adjustedHeight / 2;
  
  // Generiere Äderchen
  for (let i = 0; i < adjustedNumVeins; i++) {
    // Wähle eine zufällige Position für den Startpunkt des Äderchens
    // Bevorzuge Positionen näher am Zentrum für dezentere Effekte
    const centerBias = Math.random() < 0.7 ? 0.6 : 0.3; // 70% Chance für näher am Zentrum
    const startX = centerX + (Math.random() - 0.5) * adjustedWidth * centerBias;
    const startY = centerY + (Math.random() - 0.5) * adjustedHeight * centerBias;
    
    // Wähle eine zufällige Farbe aus den Akzentfarben
    const colorIndex = Math.floor(Math.random() * accentColors.length);
    const color = accentColors[colorIndex];
    
    // Wähle eine zufällige Länge für das Äderchen
    // Reduzierte Länge für dezentere Effekte
    const length = Math.floor(Math.random() * 8) + 3; // Reduziert von 12+5 auf 8+3
    
    // Generiere ein Cluster von Punkten um den Startpunkt
    const cluster = generateCluster(
      Math.floor(startX), 
      Math.floor(startY), 
      length, 
      adjustedWidth, 
      adjustedHeight
    );
    
    // Füge die Punkte zum Äderchen hinzu
    cluster.forEach(point => {
      veins.push({
        x: point.x,
        y: point.y,
        color
      });
    });
  }
  
  return veins;
} 