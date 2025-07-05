/**
 * backgroundEffects.ts
 * 
 * Funktionen zur Generierung von Hintergrundeffekten für die ASCII-Schwert-Komponente
 */
import { caveBgPatterns, accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';

/**
 * Generiert einen Höhlenhintergrund mit dynamischen Texturen und rhythmischen Mustern
 * @param width Breite des Hintergrunds
 * @param height Höhe des Hintergrunds
 * @returns 2D-Array mit Hintergrund-Zeichen
 */
export function generateCaveBackground(width: number, height: number): string[][] {
  const background: string[][] = [];
  
  // Zeitstempel für dynamische Muster
  const timestamp = Date.now();
  
  // Zufällige Musterparameter für diese Generation
  // Bevorzuge feinere Muster (0, 3, 4) gegenüber blockigen Mustern (1, 2)
  const patternTypeWeights = [0.35, 0.05, 0.05, 0.30, 0.25]; // Höhere Gewichtung für feine Muster
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
  
  const waveAmplitude = Math.floor(height / (8 + Math.random() * 4)); // Zufällige Amplitude
  const waveFrequency = 0.05 + (Math.random() * 0.05); // Zufällige Frequenz
  const noiseScale = 0.08 + (Math.random() * 0.08); // Zufällige Rauschskalierung
  const patternScale = 0.2 + (Math.random() * 0.3); // Skalierung des Grundmusters
  
  // Zufällige Rotation/Verschiebung für diese Generation
  const rotationAngle = Math.random() * Math.PI * 2; // 0-360 Grad
  const offsetX = Math.floor(Math.random() * width);
  const offsetY = Math.floor(Math.random() * height);
  
  // Überarbeitete Zeichensätze mit mehr feinen Linien und weniger Blöcken
  const charSets = [
    // Set 1: Dünne Linien und Punkte (BEVORZUGT)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '│', '─', '┬', '┴', '┼'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻']
    },
    // Set 2: Blockige Texturen (REDUZIERT)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '┤', '├', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻']
    },
    // Set 3: Geometrische Formen (ANGEPASST)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['◇', '◆', '◊', '◈', '◦', '◎', '○', '◌'],
      dense: ['◊', '◈', '◎', '◉', '◍', '◐', '◑', '◒', '◓', '◔', '◕']
    },
    // Set 4: Technische Zeichen (BEVORZUGT)
    {
      light: ['⌐', '¬', '⌙', '⌖', '·', ':', '.'],
      medium: ['⌘', '⌂', '⌤', '⌧', '⌨', '⌫', '⎋', '⌖', '⌗', '⌚', '⌛'],
      dense: ['⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢']
    },
    // Set 5: Mischung aus feinen Zeichen (BEVORZUGT)
    {
      light: ['·', ':', '.', '˙', '°', '╱', '╲', '◦', '⌐'],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '◇', '◆', '⌘', '⎔', '│', '─', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '◎', '◉', '◍', '⎕', '⎖', '⎗']
    }
  ];
  
  // Wähle Zeichensatz für diese Generation
  const selectedCharSet = charSets[patternType];
  
  // Generiere Basis-Muster für verschiedene Regionen
  const generatePattern = (x: number, y: number, type: string): string => {
    // Transformiere Koordinaten für Rotation und Verschiebung
    const rotX = Math.cos(rotationAngle) * x - Math.sin(rotationAngle) * y;
    const rotY = Math.sin(rotationAngle) * x + Math.cos(rotationAngle) * y;
    const tx = (rotX + offsetX) % width;
    const ty = (rotY + offsetY) % height;
    
    // Verschiedene Mustertypen
    switch(patternType) {
      case 0: // Wellenförmiges Muster mit feinen Linien
        if (Math.sin(tx * patternScale) * Math.cos(ty * patternScale) > 0.3) {
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 1: // Konzentrische Kreise mit feinen Linien statt Blöcken
        const dist = Math.sqrt(Math.pow((tx - width/2) / width, 2) + Math.pow((ty - height/2) / height, 2));
        if (Math.abs(Math.sin(dist * 20)) > 0.7) {
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 2: // Schachbrettmuster mit feinen Variationen
        if ((Math.floor(tx * patternScale) + Math.floor(ty * patternScale)) % 2 === 0) {
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 3: // Spiralmuster mit komplexen Zeichen
        const angle = Math.atan2(ty - height/2, tx - width/2);
        const dist2 = Math.sqrt(Math.pow(tx - width/2, 2) + Math.pow(ty - height/2, 2));
        if (Math.abs(Math.sin(angle * 5 + dist2 * 0.2)) > 0.7) {
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 4: // Fraktales Muster mit feinen Zeichen
        if (((tx & ty) % 3 === 0) || ((tx * ty) % 7 === 0)) {
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
  for (let y = 0; y < height; y++) {
    background[y] = [];
    
    // Erzeuge Welleneffekt für die vertikale Position
    const baseWaveY = Math.sin(y * waveFrequency) * waveAmplitude;
    
    for (let x = 0; x < width; x++) {
      // Erzeuge Welleneffekt für die horizontale Position
      const waveX = Math.sin((x + y) * waveFrequency * 0.7) * waveAmplitude;
      const waveY = baseWaveY + Math.cos(x * waveFrequency * 0.5) * (waveAmplitude / 2);
      
      // Kombiniere Wellen für einen dynamischen Effekt
      const noiseValue = Math.abs(Math.sin(x * noiseScale) * Math.cos(y * noiseScale));
      
      // Bestimme Region basierend auf Wellenwerten und Mustern
      const regionValue = (noiseValue + Math.abs(waveX / width) + Math.abs(waveY / height)) / 3;
      
      // Basismuster für diese Position
      const baseChar = generatePattern(x, y, 'base');
      
      // Wähle Zeichensatz basierend auf Region
      let charSet;
      if (regionValue < 0.3) {
        charSet = selectedCharSet.light;
      } else if (regionValue < 0.7) {
        charSet = selectedCharSet.medium;
      } else {
        charSet = selectedCharSet.dense;
      }
      
      // Füge rhythmische Variation hinzu
      if ((x + y) % 7 === 0 || Math.sin((x * y) * 0.01 + (timestamp * 0.0001)) > 0.7) {
        // Spezielles Muster an rhythmischen Positionen
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if ((x * y) % 11 === 0 || Math.cos((x - y) * 0.03) > 0.8) {
        // Sekundäres rhythmisches Muster
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if (Math.random() < 0.7) {
        // Grundmuster mit hoher Wahrscheinlichkeit
        background[y][x] = baseChar;
      } else {
        // Zufälliges Zeichen aus dem ausgewählten Set
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      }
    }
  }
  
  // Füge einige kleinere Felsformationen hinzu - mit feinen Zeichen statt Blöcken
  const numFormations = Math.floor((width * height) / 150) + 2;
  const formationChars = ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻'];
  
  for (let i = 0; i < numFormations; i++) {
    const formationX = Math.floor(Math.random() * width);
    const formationY = Math.floor(Math.random() * height);
    const formationSize = Math.floor(Math.random() * 5) + 2; // 2-6 Zeichen große Formationen
    
    const formation = generateCluster(formationX, formationY, formationSize, width, height);
    
    formation.forEach(pos => {
      if (pos.y < height && pos.x < width) {
        // Feine Zeichen für Formationen statt '▒'
        background[pos.y][pos.x] = formationChars[Math.floor(Math.random() * formationChars.length)];
      }
    });
  }
  
  // Füge einige Stalaktiten/Stalagmiten hinzu mit feinen Zeichen
  const numStalactites = Math.floor(width / 5);
  const stalactiteChars = ['╹', '╿', '┃', '│', '╽', '╵'];
  const stalagmiteChars = ['╻', '╿', '┃', '│', '╽', '╵'];
  
  for (let i = 0; i < numStalactites; i++) {
    const stalX = Math.floor(Math.random() * width);
    const isTop = Math.random() < 0.5;
    
    if (isTop) {
      // Stalaktit von oben mit feinen Zeichen
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        if (y < height) {
          background[y][stalX] = stalactiteChars[Math.floor(Math.random() * stalactiteChars.length)];
        }
      }
    } else {
      // Stalagmit von unten mit feinen Zeichen
      const length = Math.floor(Math.random() * 3) + 1;
      for (let y = 0; y < length; y++) {
        const posY = height - 1 - y;
        if (posY >= 0) {
          background[posY][stalX] = stalagmiteChars[Math.floor(Math.random() * stalagmiteChars.length)];
        }
      }
    }
  }
  
  // Füge einige kleine "Höhlen" hinzu (Bereiche mit leichter Textur)
  const numCaves = Math.floor((width * height) / 800); // Weniger Höhlen: eine Höhle pro 800 Pixel
  
  for (let i = 0; i < numCaves; i++) {
    // Zufällige Position für die Höhle
    const caveX = Math.floor(Math.random() * width);
    const caveY = Math.floor(Math.random() * height);
    
    // Kleinere Höhlen (3-6 Pixel)
    const caveSize = Math.floor(Math.random() * 4) + 3;
    
    // Fülle die Höhle mit dünneren Mustern
    for (let y = Math.max(0, caveY - caveSize); y < Math.min(height, caveY + caveSize); y++) {
      for (let x = Math.max(0, caveX - caveSize); x < Math.min(width, caveX + caveSize); x++) {
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
  const numCracks = Math.floor((width * height) / 1000); // Ungefähr ein Riss pro 1000 Pixel
  
  for (let i = 0; i < numCracks; i++) {
    // Zufälliger Startpunkt für den Riss
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);
    
    // Zufällige Länge für den Riss (5-15 Pixel)
    const crackLength = Math.floor(Math.random() * 11) + 5;
    
    // Zufällige Richtung für den Riss
    let dx = Math.random() < 0.5 ? -1 : 1;
    let dy = Math.random() < 0.5 ? -1 : 1;
    
    // Zeichne den Riss
    for (let j = 0; j < crackLength; j++) {
      // Prüfe, ob der Punkt innerhalb der Grenzen liegt
      if (x >= 0 && x < width && y >= 0 && y < height) {
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
 * Generiert farbige Äderchen für den Hintergrund mit Tropf-Animation von oben nach unten
 * @param width Breite des Hintergrunds
 * @param height Höhe des Hintergrunds
 * @param numVeins Anzahl der Äderchen
 * @returns Array mit Positionen und Farben der Äderchen
 */
export function generateColoredVeins(
  width: number, 
  height: number, 
  numVeins: number
): Array<{x: number, y: number, color: string}> {
  const veins: Array<{x: number, y: number, color: string}> = [];
  
  // Parameter für Animation
  const timestamp = Date.now() / 1000; // Zeitstempel für Animation
  const animationSpeed = 0.5; // Geschwindigkeit der Animation
  const animationPhase = (timestamp * animationSpeed) % height; // Phase der Animation (0 bis height)
  
  // Identifiziere Formationen und Strukturen im Hintergrund
  const formationPoints: Array<{x: number, y: number}> = [];
  
  // Erzeuge Quellpunkte für Tropfen an markanten Stellen (Formationen, Stalaktiten)
  const numSources = Math.floor(numVeins / 3);
  
  // Erstelle Quellpunkte am oberen Rand und an Stalaktiten
  for (let i = 0; i < numSources; i++) {
    const sourceX = Math.floor(Math.random() * width);
    const sourceY = Math.floor(Math.random() * Math.min(5, height / 10)); // Oben im Bild
    
    formationPoints.push({x: sourceX, y: sourceY});
  }
  
  // Erzeuge Tropfen für jede Quelle
  formationPoints.forEach(source => {
    // Wähle eine dominante Farbe für diesen Tropfen
    const dominantColor = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Parameter für diesen Tropfen
    const dropLength = Math.floor(Math.random() * 10) + 5; // Länge des Tropfens
    const dropSpeed = Math.random() * 0.5 + 0.5; // Individuelle Geschwindigkeit
    const dropPhase = (timestamp * dropSpeed) % (height * 2); // Individuelle Phase
    
    // Berechne aktuelle Y-Position basierend auf Zeit
    let currentY = (source.y + dropPhase) % height;
    
    // Erzeuge den Tropfen
    for (let i = 0; i < dropLength; i++) {
      const y = Math.floor(currentY) - i;
      
      // Prüfe, ob der Punkt innerhalb der Grenzen liegt
      if (y >= 0 && y < height) {
        // Berechne X-Position mit leichtem Schwanken
        const waveOffset = Math.sin(y * 0.2 + timestamp) * 1.5;
        const x = Math.floor(source.x + waveOffset);
        
        // Prüfe, ob der Punkt innerhalb der Grenzen liegt
        if (x >= 0 && x < width) {
          // Berechne Opazität basierend auf Position im Tropfen
          const opacity = 1 - (i / dropLength);
          
          // Füge Punkt zum Tropfen hinzu
          veins.push({
            x,
            y,
            color: dominantColor
          });
          
          // Füge manchmal Seitenäste hinzu
          if (i > 0 && i < dropLength - 1 && Math.random() < 0.2) {
            const branchX = x + (Math.random() < 0.5 ? -1 : 1);
            if (branchX >= 0 && branchX < width) {
              veins.push({
                x: branchX,
                y,
                color: dominantColor
              });
            }
          }
        }
      }
    }
    
    // Füge Tropfen am Ende hinzu
    const endY = Math.floor(currentY);
    if (endY >= 0 && endY < height) {
      const endX = Math.floor(source.x + Math.sin(endY * 0.2 + timestamp) * 1.5);
      if (endX >= 0 && endX < width) {
        // Füge einen größeren Tropfen am Ende hinzu
        veins.push({x: endX, y: endY, color: dominantColor});
        
        // Füge manchmal einen Spritzer hinzu
        if (Math.random() < 0.3) {
          for (let s = 0; s < 3; s++) {
            const splashX = endX + Math.floor(Math.random() * 3) - 1;
            const splashY = endY + Math.floor(Math.random() * 2) + 1;
            if (splashX >= 0 && splashX < width && splashY >= 0 && splashY < height) {
              veins.push({x: splashX, y: splashY, color: dominantColor});
            }
          }
        }
      }
    }
  });
  
  // Erzeuge zusätzliche fließende Muster, die von Strukturen abhängen
  const numFlows = Math.floor(numVeins / 2);
  
  for (let i = 0; i < numFlows; i++) {
    // Startpunkt für den Fluss (bevorzugt oben)
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * (height / 3)); // Oberes Drittel
    
    // Farbe für diesen Fluss
    const flowColor = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Parameter für diesen Fluss
    const flowLength = Math.floor(Math.random() * 15) + 10;
    const flowSpeed = Math.random() * 0.3 + 0.2;
    const flowPhase = (timestamp * flowSpeed) % height;
    
    // Aktuelle Position
    let x = startX;
    let y = (startY + flowPhase) % height;
    
    // Erzeuge den Fluss
    for (let j = 0; j < flowLength; j++) {
      // Bewegung hauptsächlich nach unten mit leichter seitlicher Bewegung
      const dx = Math.sin(y * 0.1 + timestamp * 0.5) * 0.8;
      const dy = 1 + Math.random() * 0.5; // Hauptsächlich nach unten
      
      // Bewege den Punkt
      x += dx;
      y += dy;
      
      // Runde auf ganze Pixel
      const pixelX = Math.floor(x);
      const pixelY = Math.floor(y);
      
      // Prüfe, ob der Punkt innerhalb der Grenzen liegt
      if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
        // Füge den Punkt zum Fluss hinzu
        veins.push({
          x: pixelX,
          y: pixelY,
          color: flowColor
        });
        
        // Füge manchmal Verzweigungen hinzu
        if (j > 3 && Math.random() < 0.15) {
          const branchLength = Math.floor(Math.random() * 3) + 1;
          let branchX = x;
          let branchY = y;
          
          for (let b = 0; b < branchLength; b++) {
            // Verzweigung mit Tendenz nach unten
            branchX += Math.random() * 2 - 1;
            branchY += Math.random() * 1.5;
            
            const branchPixelX = Math.floor(branchX);
            const branchPixelY = Math.floor(branchY);
            
            if (branchPixelX >= 0 && branchPixelX < width && branchPixelY >= 0 && branchPixelY < height) {
              veins.push({
                x: branchPixelX,
                y: branchPixelY,
                color: flowColor
              });
            }
          }
        }
      }
    }
  }
  
  // Erzeuge einige Ansammlungen am unteren Rand (wie Pfützen)
  const numPuddles = Math.floor(numVeins / 10);
  
  for (let i = 0; i < numPuddles; i++) {
    const puddleX = Math.floor(Math.random() * width);
    const puddleY = Math.floor(height - Math.random() * (height / 5)); // Unteres Fünftel
    const puddleSize = Math.floor(Math.random() * 5) + 2;
    const puddleColor = accentColors[Math.floor(Math.random() * accentColors.length)];
    
    // Erzeuge eine kleine Ansammlung
    const puddle = generateCluster(puddleX, puddleY, puddleSize, width, height);
    
    puddle.forEach(pos => {
      if (pos.y < height && pos.x < width) {
        veins.push({
          x: pos.x,
          y: pos.y,
          color: puddleColor
        });
      }
    });
  }
  
  return veins;
}

/**
 * Generiert einen Beat-reaktiven Hintergrund mit dynamischen Mustern
 * @param width Breite des Hintergrunds
 * @param height Höhe des Hintergrunds
 * @param beatEnergy Energie des aktuellen Beats (0-1)
 * @returns 2D-Array mit Hintergrund-Zeichen
 */
export function generateBeatReactiveBackground(width: number, height: number, beatEnergy: number = 0): string[][] {
  // Debug-Log für Funktionsaufruf
  console.log(`%c[BACKGROUND_EFFECT_DEBUG] generateBeatReactiveBackground aufgerufen mit beatEnergy=${beatEnergy.toFixed(2)}`, 
             'color: #00AA55; background-color: #222222; font-weight: bold;');
  
  const background: string[][] = [];
  
  // Zeitstempel für dynamische Muster
  const timestamp = Date.now();
  
  // Beat-Energie für visuelle Effekte nutzen
  // Höhere Energie = intensivere Muster
  const energyFactor = Math.max(0.3, beatEnergy * 1.5); // Verstärkter Energiefaktor (1.5x)
  
  // Musterparameter basierend auf Beat-Energie
  const patternType = Math.floor(beatEnergy * 5) % 5; // 0-4 basierend auf Energie
  
  // Wellenparameter basierend auf Beat-Energie
  const waveAmplitude = Math.floor(height / (8 + Math.random() * 4)) * energyFactor * 1.2; // Verstärkte Amplitude
  const waveFrequency = (0.05 + (Math.random() * 0.05)) * energyFactor * 1.2; // Verstärkte Frequenz
  const noiseScale = (0.08 + (Math.random() * 0.08)) * energyFactor;
  const patternScale = (0.2 + (Math.random() * 0.3)) * energyFactor;
  
  // Zufällige Rotation/Verschiebung für diese Generation
  const rotationAngle = Math.random() * Math.PI * 2 * energyFactor; // 0-360 Grad, skaliert mit Energie
  const offsetX = Math.floor(Math.random() * width * energyFactor);
  const offsetY = Math.floor(Math.random() * height * energyFactor);
  
  // Zeichensätze mit unterschiedlicher Intensität je nach Beat-Energie
  const charSets = [
    // Set 1: Dünne Linien und Punkte (niedrige Energie)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '│', '─', '┬', '┴', '┼'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻']
    },
    // Set 2: Blockige Texturen (mittlere Energie)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '┤', '├', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻']
    },
    // Set 3: Geometrische Formen (mittlere-hohe Energie)
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['◇', '◆', '◊', '◈', '◦', '◎', '○', '◌'],
      dense: ['◊', '◈', '◎', '◉', '◍', '◐', '◑', '◒', '◓', '◔', '◕']
    },
    // Set 4: Technische Zeichen (hohe Energie)
    {
      light: ['⌐', '¬', '⌙', '⌖', '·', ':', '.'],
      medium: ['⌘', '⌂', '⌤', '⌧', '⌨', '⌫', '⎋', '⌖', '⌗', '⌚', '⌛'],
      dense: ['⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢']
    },
    // Set 5: Mischung aus komplexen Zeichen (sehr hohe Energie)
    {
      light: ['·', ':', '.', '˙', '°', '╱', '╲', '◦', '⌐'],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '◇', '◆', '⌘', '⎔', '│', '─', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '◎', '◉', '◍', '⎕', '⎖', '⎗']
    }
  ];
  
  // Wähle Zeichensatz basierend auf Beat-Energie
  const selectedCharSet = charSets[patternType];
  
  // Generiere Basis-Muster für verschiedene Regionen
  const generatePattern = (x: number, y: number, type: string): string => {
    // Transformiere Koordinaten für Rotation und Verschiebung
    const rotX = Math.cos(rotationAngle) * x - Math.sin(rotationAngle) * y;
    const rotY = Math.sin(rotationAngle) * x + Math.cos(rotationAngle) * y;
    const tx = (rotX + offsetX) % width;
    const ty = (rotY + offsetY) % height;
    
    // Verschiedene Mustertypen basierend auf Beat-Energie
    switch(patternType) {
      case 0: // Wellenförmiges Muster mit feinen Linien
        if (Math.sin(tx * patternScale) * Math.cos(ty * patternScale) > 0.3 - (beatEnergy * 0.3)) { // Verstärkte Reaktion
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 1: // Konzentrische Kreise mit feinen Linien
        const dist = Math.sqrt(Math.pow((tx - width/2) / width, 2) + Math.pow((ty - height/2) / height, 2));
        if (Math.abs(Math.sin(dist * 20 * energyFactor * 1.2)) > 0.7 - (beatEnergy * 0.4)) { // Verstärkte Reaktion
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 2: // Schachbrettmuster mit feinen Variationen
        if ((Math.floor(tx * patternScale * (1 + beatEnergy * 0.5)) + Math.floor(ty * patternScale * (1 + beatEnergy * 0.5))) % 2 === 0) { // Verstärkte Reaktion
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 3: // Spiralmuster mit komplexen Zeichen
        const angle = Math.atan2(ty - height/2, tx - width/2);
        const dist2 = Math.sqrt(Math.pow(tx - width/2, 2) + Math.pow(ty - height/2, 2));
        if (Math.abs(Math.sin(angle * 5 * energyFactor * 1.3 + dist2 * 0.2)) > 0.7 - (beatEnergy * 0.4)) { // Verstärkte Reaktion
          return selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        }
        break;
      case 4: // Fraktales Muster mit feinen Zeichen
        if (((tx & ty) % 3 === 0) || ((tx * ty) % (7 - Math.floor(beatEnergy * 5)) === 0)) { // Verstärkte Reaktion
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
  for (let y = 0; y < height; y++) {
    background[y] = [];
    
    // Erzeuge Welleneffekt für die vertikale Position
    const baseWaveY = Math.sin(y * waveFrequency) * waveAmplitude;
    
    for (let x = 0; x < width; x++) {
      // Erzeuge Welleneffekt für die horizontale Position
      const waveX = Math.sin((x + y) * waveFrequency * 0.7) * waveAmplitude;
      const waveY = baseWaveY + Math.cos(x * waveFrequency * 0.5) * (waveAmplitude / 2);
      
      // Kombiniere Wellen für einen dynamischen Effekt
      const noiseValue = Math.abs(Math.sin(x * noiseScale) * Math.cos(y * noiseScale));
      
      // Bestimme Region basierend auf Wellenwerten und Mustern
      const regionValue = (noiseValue + Math.abs(waveX / width) + Math.abs(waveY / height)) / 3;
      
      // Basismuster für diese Position
      const baseChar = generatePattern(x, y, 'base');
      
      // Wähle Zeichensatz basierend auf Region und Beat-Energie
      let charSet;
      if (regionValue < 0.3 - (beatEnergy * 0.15)) { // Verstärkte Reaktion
        charSet = selectedCharSet.light;
      } else if (regionValue < 0.7 - (beatEnergy * 0.25)) { // Verstärkte Reaktion
        charSet = selectedCharSet.medium;
      } else {
        charSet = selectedCharSet.dense;
      }
      
      // Füge Beat-reaktive rhythmische Variation hinzu
      const beatFactor = timestamp * 0.0001 + (beatEnergy * 0.15); // Verstärkter Faktor
      if ((x + y) % 7 === 0 || Math.sin((x * y) * 0.01 + beatFactor) > 0.7 - (beatEnergy * 0.4)) { // Verstärkte Reaktion
        // Spezielles Muster an rhythmischen Positionen
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if ((x * y) % 11 === 0 || Math.cos((x - y) * 0.03 + beatFactor) > 0.8 - (beatEnergy * 0.4)) { // Verstärkte Reaktion
        // Sekundäres rhythmisches Muster
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if (Math.random() < 0.7 - (beatEnergy * 0.3)) { // Verstärkte Reaktion
        // Grundmuster mit hoher Wahrscheinlichkeit
        background[y][x] = baseChar;
      } else {
        // Zufälliges Zeichen aus dem ausgewählten Set
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      }
    }
  }
  
  // Füge einige kleinere Felsformationen hinzu - mit feinen Zeichen statt Blöcken
  const numFormations = Math.floor((width * height) / 150) + 2 + Math.floor(beatEnergy * 8); // Verstärkte Reaktion
  const formationChars = ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻'];
  
  for (let i = 0; i < numFormations; i++) {
    const formationX = Math.floor(Math.random() * width);
    const formationY = Math.floor(Math.random() * height);
    const formationSize = Math.floor(Math.random() * 5 * (1 + beatEnergy * 1.5)) + 2; // Verstärkte Reaktion
    
    const formation = generateCluster(formationX, formationY, formationSize, width, height);
    
    formation.forEach(pos => {
      if (pos.y < height && pos.x < width) {
        // Feine Zeichen für Formationen statt '▒'
        background[pos.y][pos.x] = formationChars[Math.floor(Math.random() * formationChars.length)];
      }
    });
  }
  
  // Füge Beat-reaktive "Explosionen" hinzu
  if (beatEnergy > 0.2) { // Niedrigerer Schwellenwert für mehr Explosionen
    const numExplosions = Math.floor(beatEnergy * 5) + 1; // Mehr Explosionen
    
    for (let i = 0; i < numExplosions; i++) {
      const explosionX = Math.floor(Math.random() * width);
      const explosionY = Math.floor(Math.random() * height);
      const explosionSize = Math.floor(beatEnergy * 12) + 3; // Größere Explosionen
      
      for (let y = Math.max(0, explosionY - explosionSize); y < Math.min(height, explosionY + explosionSize); y++) {
        for (let x = Math.max(0, explosionX - explosionSize); x < Math.min(width, explosionX + explosionSize); x++) {
          const distance = Math.sqrt(Math.pow(x - explosionX, 2) + Math.pow(y - explosionY, 2));
          
          if (distance < explosionSize * beatEnergy * 1.2) { // Verstärkte Reaktion
            // Wähle ein Zeichen basierend auf der Entfernung vom Zentrum
            const charSet = distance < explosionSize * 0.3 ? 
                            selectedCharSet.dense : 
                            (distance < explosionSize * 0.6 ? selectedCharSet.medium : selectedCharSet.light);
            
            background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
          }
        }
      }
    }
  }
  
  return background;
} 