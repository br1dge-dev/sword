/**
 * swordUtils.ts
 * 
 * Hilfsfunktionen für die ASCII-Schwert-Komponente
 */

/**
 * Zentriert ASCII-Art mit verbesserter Konsistenz
 * @param art Die zu zentrierende ASCII-Art
 * @returns Ein Array von zentrierten Zeilen
 */
export function centerAsciiArt(art: string): string[] {
  const lines = art.trim().split('\n');
  
  // Finde die maximale Breite aller Zeilen
  const maxWidth = Math.max(...lines.map(line => line.length));
  
  // Finde die tatsächliche Breite des Schwerts (ohne Leerzeichen am Ende)
  const actualWidths = lines.map(line => {
    // Entferne Leerzeichen am Ende
    const trimmedLine = line.trimEnd();
    // Zähle führende Leerzeichen
    const leadingSpaces = line.length - line.trimStart().length;
    return {
      content: trimmedLine,
      leadingSpaces,
      contentWidth: trimmedLine.length
    };
  });
  
  // Berechne die Mitte des Schwerts basierend auf den Zeilen mit tatsächlichem Inhalt
  const contentLines = actualWidths.filter(l => l.contentWidth > 0);
  
  // Finde die Mitte des Schwerts (basierend auf der breitesten Zeile)
  const widestLine = contentLines.reduce((max, line) => 
    line.contentWidth > max.contentWidth ? line : max, 
    { contentWidth: 0, leadingSpaces: 0, content: '' }
  );
  
  const swordCenter = widestLine.leadingSpaces + Math.floor(widestLine.contentWidth / 2);
  
  // Fixierte Breite für konsistente Darstellung
  const fixedWidth = Math.max(maxWidth, 20); 
  const targetCenter = Math.floor(fixedWidth / 2);
  
  // Zentriere jede Zeile basierend auf der berechneten Mitte
  return lines.map(line => {
    if (line.trim() === '') return ' '.repeat(fixedWidth);
    
    const trimmedLine = line.trimEnd();
    const leadingSpaces = line.length - line.trimStart().length;
    const lineContentWidth = trimmedLine.length - leadingSpaces;
    
    // Berechne die Mitte dieser Zeile
    const lineCenter = leadingSpaces + Math.floor(lineContentWidth / 2);
    
    // Berechne den Offset zur Zentrierung
    const offset = targetCenter - lineCenter;
    
    // Füge Leerzeichen hinzu, um die Zeile zu zentrieren
    const paddedLine = ' '.repeat(Math.max(0, leadingSpaces + offset)) + 
                      trimmedLine.substring(leadingSpaces);
    
    // Füge Leerzeichen am Ende hinzu, um die fixierte Breite zu erreichen
    return paddedLine.padEnd(fixedWidth);
  });
}

/**
 * Generiert ein Cluster von Punkten um einen Ausgangspunkt
 * @param x X-Koordinate des Ausgangspunkts
 * @param y Y-Koordinate des Ausgangspunkts
 * @param size Größe des Clusters
 * @param maxWidth Maximale Breite
 * @param maxHeight Maximale Höhe
 * @returns Array von Punkten im Cluster
 */
export function generateCluster(
  x: number, 
  y: number, 
  size: number, 
  maxWidth: number, 
  maxHeight: number
): Array<{x: number, y: number}> {
  const cluster: Array<{x: number, y: number}> = [{x, y}];
  
  // Füge zufällige benachbarte Punkte hinzu
  for (let i = 1; i < size; i++) {
    // Wähle einen zufälligen Punkt aus dem bestehenden Cluster
    const basePoint = cluster[Math.floor(Math.random() * cluster.length)];
    
    // Generiere einen benachbarten Punkt
    const directions = [
      {dx: -1, dy: 0},  // links
      {dx: 1, dy: 0},   // rechts
      {dx: 0, dy: -1},  // oben
      {dx: 0, dy: 1},   // unten
      {dx: -1, dy: -1}, // oben links
      {dx: 1, dy: -1},  // oben rechts
      {dx: -1, dy: 1},  // unten links
      {dx: 1, dy: 1}    // unten rechts
    ];
    
    // Wähle eine zufällige Richtung
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // Berechne den neuen Punkt
    const newX = basePoint.x + direction.dx;
    const newY = basePoint.y + direction.dy;
    
    // Prüfe, ob der neue Punkt innerhalb der Grenzen liegt und noch nicht im Cluster ist
    if (newX >= 0 && newX < maxWidth && 
        newY >= 0 && newY < maxHeight && 
        !cluster.some(p => p.x === newX && p.y === newY)) {
      cluster.push({x: newX, y: newY});
    } else {
      // Wenn der Punkt nicht gültig ist, versuche es erneut
      i--;
    }
  }
  
  return cluster;
}

/**
 * Prüft, ob ein Zeichen ein Linienzeichen ist
 * @param char Das zu prüfende Zeichen
 * @returns true, wenn es sich um ein Linienzeichen handelt
 */
export function isEdgeChar(char: string): boolean {
  return ['/', '\\', '|', 'V', '_', '╱', '╲', '┃', '┏', '┓', '┗', '┛'].includes(char);
}

/**
 * Prüft, ob eine Position im Griff-Bereich des Schwerts liegt
 * @param x X-Koordinate
 * @param y Y-Koordinate
 * @param centeredLines Zentrierte ASCII-Art-Zeilen
 * @returns true, wenn die Position im Griff-Bereich liegt
 */
export function isHandlePosition(x: number, y: number, centeredLines: string[]): boolean {
  // Bestimme die Mitte des Schwerts
  const middleX = Math.floor(centeredLines[0].length / 2);
  
  // Finde die Zeile mit "__▓█▓__" oder "_▓██▓_" oder "_▓███▓_" (Heft-Beginn)
  const hiltStartIndex = centeredLines.findIndex(line => 
    line.includes('__▓█▓__') || line.includes('_▓██▓_') || line.includes('_▓███▓_')
  );
  
  // Wenn keine Heft-Zeile gefunden wurde, ist es nicht im Griff-Bereich
  if (hiltStartIndex === -1) return false;
  
  // Prüfe, ob die Position unterhalb des Hefts liegt
  if (y >= hiltStartIndex) {
    // Prüfe, ob die Position im Bereich des Griffs liegt (schmaler Bereich in der Mitte)
    const distanceFromMiddle = Math.abs(x - middleX);
    return distanceFromMiddle <= 2; // Griff ist ca. 5 Zeichen breit (2 links, 1 mitte, 2 rechts)
  }
  
  return false;
}

/**
 * Generiert einen zufälligen Offset basierend auf der Intensität
 * @param intensity Intensität des Offsets
 * @returns Offset-Objekt mit x und y Werten
 */
export function getRandomOffset(intensity: number): {x: number, y: number} {
  // Generiere zufällige Offsets basierend auf der Intensität
  const maxOffset = Math.ceil(intensity * 2); // Maximal 2 Pixel bei voller Intensität
  
  return {
    x: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset,
    y: Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset
  };
}

/**
 * Berechnet die Komplementärfarbe zu einer gegebenen Hex-Farbe
 * @param hexColor Hex-Farbcode (mit #)
 * @returns Komplementäre Hex-Farbe
 */
export function getComplementaryColor(hexColor: string): string {
  // Entferne # und konvertiere in RGB
  const hex = hexColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Berechne Komplementärfarbe (255 - Wert)
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  
  // Konvertiere zurück in Hex
  return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

/**
 * Berechnet eine dunklere Version einer Hex-Farbe
 * @param hexColor Hex-Farbcode (mit #)
 * @param factor Faktor für die Verdunkelung (0-1)
 * @returns Dunklere Hex-Farbe
 */
export function getDarkerColor(hexColor: string, factor: number = 0.08): string {
  // Entferne # und konvertiere in RGB
  const hex = hexColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Erzeuge eine dunklere Version
  const darkR = Math.floor(r * factor);
  const darkG = Math.floor(g * factor);
  const darkB = Math.floor(b * factor);
  
  // Konvertiere zurück in Hex
  return `rgb(${darkR}, ${darkG}, ${darkB})`;
}

/**
 * Berechnet eine hellere Version einer Hex-Farbe
 * @param hexColor Hex-Farbcode (mit #)
 * @param factor Faktor für die Aufhellung (0-1)
 * @returns Hellere Hex-Farbe
 */
export function getLighterColor(hexColor: string, factor: number = 0.1): string {
  // Entferne # und konvertiere in RGB
  const hex = hexColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Erzeuge eine hellere Version (addiere einen Prozentsatz zum Originalwert)
  const lighterR = Math.min(255, Math.floor(r * (1 + factor)));
  const lighterG = Math.min(255, Math.floor(g * (1 + factor)));
  const lighterB = Math.min(255, Math.floor(b * (1 + factor)));
  
  // Konvertiere zurück in RGB
  return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
} 