/**
 * backgroundEffects.ts
 * 
 * Funktionen zur Generierung von Hintergrundeffekten für die ASCII-Schwert-Komponente
 * OPTIMIERT: Lazy-Rendering, Viewport-basiertes Rendering, Caching, vermeidet unnötige Neuberechnungen
 */
import { caveBgPatterns, accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';

// Maximale Dimensionen für Hintergründe
export const MAX_BG_WIDTH = 200;
export const MAX_BG_HEIGHT = 120;
export const MAX_VEINS = 500;

// OPTIMIERT: Cache für Hintergrund-Generierung
interface BackgroundCache {
  key: string;
  background: string[][];
  timestamp: number;
  viewport: { width: number; height: number };
}

// OPTIMIERT: Cache für Vein-Generierung
interface VeinCache {
  key: string;
  veins: Array<{x: number, y: number, color: string}>;
  timestamp: number;
  viewport: { width: number; height: number };
}

// OPTIMIERT: Globale Caches
const backgroundCache = new Map<string, BackgroundCache>();
const veinCache = new Map<string, VeinCache>();

// OPTIMIERT: Cache-Größe begrenzen
const MAX_CACHE_SIZE = 5;
const CACHE_TTL = 30000; // 30 Sekunden

// OPTIMIERT: Viewport-basierte Rendering-Bereiche
interface ViewportRegion {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  visible: boolean;
}

// OPTIMIERT: Generiere Cache-Key
function generateCacheKey(width: number, height: number, patternType?: number): string {
  return `${width}x${height}_${patternType || 'default'}`;
}

// OPTIMIERT: Berechne sichtbaren Viewport-Bereich
function calculateViewportRegion(
  totalWidth: number, 
  totalHeight: number, 
  viewportWidth: number, 
  viewportHeight: number,
  scrollX: number = 0,
  scrollY: number = 0
): ViewportRegion {
  // Berechne den sichtbaren Bereich basierend auf Viewport
  const startX = Math.max(0, Math.floor(scrollX));
  const endX = Math.min(totalWidth, Math.ceil(scrollX + viewportWidth));
  const startY = Math.max(0, Math.floor(scrollY));
  const endY = Math.min(totalHeight, Math.ceil(scrollY + viewportHeight));
  
  return {
    startX,
    endX,
    startY,
    endY,
    visible: startX < endX && startY < endY
  };
}

// OPTIMIERT: Cache-Bereinigung
function cleanupCache<T>(cache: Map<string, T>): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];
  
  for (const [key, entry] of Array.from(cache.entries())) {
    if (now - (entry as any).timestamp > CACHE_TTL) {
      entriesToDelete.push(key);
    }
  }
  
  entriesToDelete.forEach(key => cache.delete(key));
  
  // Begrenze Cache-Größe
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => (a[1] as any).timestamp - (b[1] as any).timestamp);
    
    const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => cache.delete(key));
  }
}

// Deterministische Pseudozufallsfunktion für (x, y, seed)
function pseudoRandom(x: number, y: number, seed: number = 0): number {
  // Einfache Hash-basierte Pseudozufallsfunktion
  return Math.abs(Math.sin(x * 374761393 + y * 668265263 + seed * 982451653) % 1);
}

// OPTIMIERT: Lazy-Rendering für Hintergrund-Generierung
function generateBackgroundRegion(
  background: string[][],
  region: ViewportRegion,
  patternType: number,
  timestamp: number,
  adjustedWidth: number,
  adjustedHeight: number
): void {
  if (!region.visible) return;
  
  // OPTIMIERT: Nur den sichtbaren Bereich generieren
  const charSets = [
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '│', '─', '┬', '┴', '┼'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻']
    },
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '┤', '├', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻']
    },
    {
      light: ['·', ':', '.', '˙', '°', ' '],
      medium: ['◇', '◆', '◊', '◈', '◦', '◎', '○', '◌'],
      dense: ['◊', '◈', '◎', '◉', '◍', '◐', '◑', '◒', '◓', '◔', '◕']
    },
    {
      light: ['⌐', '¬', '⌙', '⌖', '·', ':', '.', ' '],
      medium: ['⌘', '⌂', '⌤', '⌧', '⌗', '╱', '╲', '┌', '┐', '└', '┘'],
      dense: ['⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢']
    },
    {
      light: ['·', ':', '.', '˙', '°', ' ', ' '],
      medium: ['╱', '╲', '╳', '┌', '┐', '└', '┘', '◇', '◆', '⌘', '⎔', '│', '─', '┬', '┴'],
      dense: ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '◎', '◉', '◍', '⎕', '⎖', '⎗']
    }
  ];
  
  const selectedCharSet = charSets[patternType];
  const centerX = adjustedWidth / 2;
  const isLargeViewport = adjustedWidth >= 180;
  const fadeStartPercent = isLargeViewport ? 0.30 : 0.45;
  const fadeStart = centerX * fadeStartPercent;
  const fadeWidth = centerX - fadeStart;
  
  // OPTIMIERT: Generiere nur den sichtbaren Bereich
  for (let y = region.startY; y < region.endY; y++) {
    if (!background[y]) background[y] = [];
    
    for (let x = region.startX; x < region.endX; x++) {
      const distFromCenter = Math.abs(x - centerX);
      
      // OPTIMIERT: Früher Exit für unsichtbare Bereiche
      let emptyProbability = 0;
      if (isLargeViewport && distFromCenter > fadeStart) {
        emptyProbability = Math.min(0.95, (distFromCenter - fadeStart) / fadeWidth);
        emptyProbability = Math.pow(emptyProbability, 1.2);
        if (distFromCenter > centerX * 0.85) {
          emptyProbability = Math.min(0.98, emptyProbability * 1.2);
        }
      }
      emptyProbability = Math.max(emptyProbability, 0.10);
      
      // Ersetze Math.random() durch deterministische Variante
      if (pseudoRandom(x, y, patternType) < emptyProbability) {
        background[y][x] = ' ';
        continue;
      }
      
      // OPTIMIERT: Vereinfachte Muster-Generierung für bessere Performance
      const noiseValue = Math.abs(Math.sin(x * 0.07) * Math.cos(y * 0.07));
      const regionValue = noiseValue;
      
      let charSet;
      if (regionValue < 0.35) {
        charSet = selectedCharSet.light;
      } else if (regionValue < 0.75) {
        charSet = selectedCharSet.medium;
      } else {
        charSet = selectedCharSet.dense;
      }
      
      if (isLargeViewport && distFromCenter > fadeStart) {
        const lightCharProbability = Math.min(0.85, (distFromCenter - fadeStart) / fadeWidth);
        if (pseudoRandom(x + 1000, y + 1000, patternType) < lightCharProbability) {
          charSet = selectedCharSet.light;
        }
      }
      
      // OPTIMIERT: Reduzierte rhythmische Variationen für bessere Performance
      // Ersetze Math.random() durch deterministische Variante für Zeichenwahl
      if ((x + y) % 7 === 0 || pseudoRandom(x + 2000, y + 2000, patternType) < 0.1) {
        background[y][x] = charSet[Math.floor(pseudoRandom(x, y, patternType) * charSet.length)];
      } else if (pseudoRandom(x + 3000, y + 3000, patternType) < 0.7) {
        const patternY = y % caveBgPatterns.length;
        const patternX = x % caveBgPatterns[patternY].length;
        const baseChar = caveBgPatterns[patternY][patternX];
        
        if (baseChar === '█' || baseChar === '▓') {
          background[y][x] = selectedCharSet.dense[Math.floor(pseudoRandom(x, y, patternType) * selectedCharSet.dense.length)];
        } else if (baseChar === '▒') {
          background[y][x] = selectedCharSet.medium[Math.floor(pseudoRandom(x, y, patternType) * selectedCharSet.medium.length)];
        } else if (baseChar === '░') {
          background[y][x] = selectedCharSet.light[Math.floor(pseudoRandom(x, y, patternType) * selectedCharSet.light.length)];
        } else {
          background[y][x] = baseChar;
        }
      } else {
        background[y][x] = charSet[Math.floor(pseudoRandom(x + 4000, y + 4000, patternType) * charSet.length)];
      }
    }
  }
}

/**
 * OPTIMIERT: Generiert einen Höhlenhintergrund mit Lazy-Rendering
 * Nur der sichtbare Bereich wird generiert, unnötige Neuberechnungen werden vermieden
 */
export function generateCaveBackground(
  width: number, 
  height: number, 
  viewportWidth?: number, 
  viewportHeight?: number,
  scrollX?: number,
  scrollY?: number
): string[][] {
  // OPTIMIERT: Cache-Bereinigung
  cleanupCache(backgroundCache);
  
  // Begrenze die Dimensionen
  const adjustedWidth = Math.min(Math.max(width, 160), MAX_BG_WIDTH);
  const adjustedHeight = Math.min(Math.max(height, 100), MAX_BG_HEIGHT);
  
  // OPTIMIERT: Verwende Viewport-Dimensionen falls verfügbar
  const effectiveViewportWidth = viewportWidth || adjustedWidth;
  const effectiveViewportHeight = viewportHeight || adjustedHeight;
  
  // OPTIMIERT: Berechne sichtbaren Bereich
  const viewportRegion = calculateViewportRegion(
    adjustedWidth,
    adjustedHeight,
    effectiveViewportWidth,
    effectiveViewportHeight,
    scrollX,
    scrollY
  );
  
  // OPTIMIERT: Prüfe Cache
  const patternType = Math.floor(Math.random() * 5);
  const cacheKey = generateCacheKey(adjustedWidth, adjustedHeight, patternType);
  const cached = backgroundCache.get(cacheKey);
  
  if (cached && 
      cached.viewport.width === effectiveViewportWidth && 
      cached.viewport.height === effectiveViewportHeight &&
      Date.now() - cached.timestamp < CACHE_TTL) {
    // OPTIMIERT: Verwende gecachten Hintergrund
    return cached.background;
  }
  
  // OPTIMIERT: Initialisiere Hintergrund nur für sichtbaren Bereich
  const background: string[][] = [];
  const timestamp = Date.now();
  
  // OPTIMIERT: Generiere nur den sichtbaren Bereich
  generateBackgroundRegion(
    background,
    viewportRegion,
    patternType,
    timestamp,
    adjustedWidth,
    adjustedHeight
  );
  
  // OPTIMIERT: Füge Formationen nur im sichtbaren Bereich hinzu
  if (viewportRegion.visible) {
    const numFormations = Math.floor((viewportRegion.endX - viewportRegion.startX) * (viewportRegion.endY - viewportRegion.startY) / 200) + 1;
    const formationChars = ['┼', '╋', '╬', '╪', '╫', '┣', '┫', '┳', '┻', '┃', '━', '╸', '╹', '╺', '╻'];
    
    for (let i = 0; i < numFormations; i++) {
      const formationX = Math.floor(viewportRegion.startX + Math.random() * (viewportRegion.endX - viewportRegion.startX));
      const formationY = Math.floor(viewportRegion.startY + Math.random() * (viewportRegion.endY - viewportRegion.startY));
      const formationSize = Math.floor(Math.random() * 3) + 2; // OPTIMIERT: Kleinere Formationen
      
      const formation = generateCluster(
        formationX, 
        formationY, 
        formationSize, 
        adjustedWidth, 
        adjustedHeight
      );
      
      formation.forEach(pos => {
        if (pos.y < adjustedHeight && pos.x < adjustedWidth && 
            pos.y >= viewportRegion.startY && pos.y < viewportRegion.endY &&
            pos.x >= viewportRegion.startX && pos.x < viewportRegion.endX) {
          if (!background[pos.y]) background[pos.y] = [];
          background[pos.y][pos.x] = formationChars[Math.floor(Math.random() * formationChars.length)];
        }
      });
    }
  }
  
  // OPTIMIERT: Cache den generierten Hintergrund
  backgroundCache.set(cacheKey, {
    key: cacheKey,
    background,
    timestamp,
    viewport: { width: effectiveViewportWidth, height: effectiveViewportHeight }
  });
  
  return background;
}

/**
 * OPTIMIERT: Generiert farbige Äderchen mit Lazy-Rendering
 * Nur Äderchen im sichtbaren Bereich werden generiert
 */
export function generateColoredVeins(
  width: number, 
  height: number, 
  numVeins: number,
  viewportWidth?: number,
  viewportHeight?: number,
  scrollX?: number,
  scrollY?: number
): Array<{x: number, y: number, color: string}> {
  // OPTIMIERT: Cache-Bereinigung
  cleanupCache(veinCache);
  
  const adjustedNumVeins = Math.min(numVeins, MAX_VEINS);
  const adjustedWidth = Math.min(width, MAX_BG_WIDTH);
  const adjustedHeight = Math.min(height, MAX_BG_HEIGHT);
  
  // OPTIMIERT: Verwende Viewport-Dimensionen falls verfügbar
  const effectiveViewportWidth = viewportWidth || adjustedWidth;
  const effectiveViewportHeight = viewportHeight || adjustedHeight;
  
  // OPTIMIERT: Berechne sichtbaren Bereich
  const viewportRegion = calculateViewportRegion(
    adjustedWidth,
    adjustedHeight,
    effectiveViewportWidth,
    effectiveViewportHeight,
    scrollX,
    scrollY
  );
  
  // OPTIMIERT: Prüfe Cache
  const cacheKey = generateCacheKey(adjustedWidth, adjustedHeight) + `_veins_${adjustedNumVeins}`;
  const cached = veinCache.get(cacheKey);
  
  if (cached && 
      cached.viewport.width === effectiveViewportWidth && 
      cached.viewport.height === effectiveViewportHeight &&
      Date.now() - cached.timestamp < CACHE_TTL) {
    // OPTIMIERT: Filtere nur sichtbare Veins
    return cached.veins.filter(vein => 
      vein.x >= viewportRegion.startX && vein.x < viewportRegion.endX &&
      vein.y >= viewportRegion.startY && vein.y < viewportRegion.endY
    );
  }
  
  const veins: Array<{x: number, y: number, color: string}> = [];
  const centerX = adjustedWidth / 2;
  const centerY = adjustedHeight / 2;
  
  // OPTIMIERT: Generiere nur Äderchen im sichtbaren Bereich
  const visibleVeins = Math.floor(adjustedNumVeins * 
    ((viewportRegion.endX - viewportRegion.startX) * (viewportRegion.endY - viewportRegion.startY)) / 
    (adjustedWidth * adjustedHeight));
  
  for (let i = 0; i < visibleVeins; i++) {
    // OPTIMIERT: Positionen nur im sichtbaren Bereich
    const startX = viewportRegion.startX + Math.random() * (viewportRegion.endX - viewportRegion.startX);
    const startY = viewportRegion.startY + Math.random() * (viewportRegion.endY - viewportRegion.startY);
    
    const colorIndex = Math.floor(Math.random() * accentColors.length);
    const color = accentColors[colorIndex];
    
    // OPTIMIERT: Kürzere Äderchen für bessere Performance
    const length = Math.floor(Math.random() * 5) + 2; // 2-6 Zeichen
    
    const cluster = generateCluster(
      Math.floor(startX), 
      Math.floor(startY), 
      length, 
      adjustedWidth, 
      adjustedHeight
    );
    
    // OPTIMIERT: Füge nur sichtbare Punkte hinzu
    cluster.forEach(point => {
      if (point.x >= viewportRegion.startX && point.x < viewportRegion.endX &&
          point.y >= viewportRegion.startY && point.y < viewportRegion.endY) {
        veins.push({
          x: point.x,
          y: point.y,
          color
        });
      }
    });
  }
  
  // OPTIMIERT: Cache die generierten Veins
  veinCache.set(cacheKey, {
    key: cacheKey,
    veins,
    timestamp: Date.now(),
    viewport: { width: effectiveViewportWidth, height: effectiveViewportHeight }
  });
  
  return veins;
}

/**
 * OPTIMIERT: Generiert ressourcenschonende Beat-Veins für dynamische Visualisierung
 * Verwendet vordefinierte Pattern und optimierte Algorithmen für bessere Performance
 */
export function generateBeatVeins(
  width: number, 
  height: number, 
  energy: number,
  beatDetected: boolean,
  viewportWidth?: number,
  viewportHeight?: number
): Array<{x: number, y: number, color: string}> {
  const adjustedWidth = Math.min(width, MAX_BG_WIDTH);
  const adjustedHeight = Math.min(height, MAX_BG_HEIGHT);
  const effectiveViewportWidth = viewportWidth || adjustedWidth;
  const effectiveViewportHeight = viewportHeight || adjustedHeight;
  
  // Berechne sichtbaren Bereich
  const viewportRegion = calculateViewportRegion(
    adjustedWidth,
    adjustedHeight,
    effectiveViewportWidth,
    effectiveViewportHeight
  );
  
  const veins: Array<{x: number, y: number, color: string}> = [];
  
  // OPTIMIERT: Dynamische Vein-Anzahl basierend auf Energy und Beat
  const baseVeinCount = Math.floor(60 + (energy * 240)); // 60-300 Veins basierend auf Energy (300% mehr)
  const beatMultiplier = beatDetected ? 2.5 : 1; // 2.5x mehr Veins bei Beat
  const totalVeinCount = Math.floor(baseVeinCount * beatMultiplier);
  
  // OPTIMIERT: Vordefinierte Beat-Patterns für bessere Performance
  const beatPatterns = [
    // Pattern 1: Zufällig verteilt
    () => {
      for (let i = 0; i < totalVeinCount; i++) {
        const x = viewportRegion.startX + Math.floor(Math.random() * (viewportRegion.endX - viewportRegion.startX));
        const y = viewportRegion.startY + Math.floor(Math.random() * (viewportRegion.endY - viewportRegion.startY));
        const colorIndex = i % accentColors.length;
        veins.push({ x, y, color: accentColors[colorIndex] });
      }
    },
    
    // Pattern 2: Wellen-ähnlich (mehrere Wellen)
    () => {
      const waveCount = Math.floor(3 + energy * 8); // 3-11 Wellen (erhöht von 2-6)
      const veinsPerWave = Math.floor(totalVeinCount / waveCount);
      
      for (let wave = 0; wave < waveCount; wave++) {
        const waveY = viewportRegion.startY + (wave * (viewportRegion.endY - viewportRegion.startY) / waveCount);
        const amplitude = 20 + Math.random() * 40; // 20-60 Pixel Amplitude (erhöht von 15-30)
        const frequency = 0.02 + Math.random() * 0.03; // 0.02-0.05 Frequenz
        
        for (let i = 0; i < veinsPerWave; i++) {
          const x = viewportRegion.startX + (i * (viewportRegion.endX - viewportRegion.startX) / veinsPerWave);
          const waveOffset = Math.sin(x * frequency) * amplitude;
          const y = Math.floor(waveY + waveOffset);
          
          if (y >= viewportRegion.startY && y < viewportRegion.endY) {
            const colorIndex = wave % accentColors.length;
            veins.push({ x: Math.floor(x), y, color: accentColors[colorIndex] });
          }
        }
      }
    },
    
    // Pattern 3: Cluster-ähnlich (mehrere kleine Gruppen)
    () => {
      const clusterCount = Math.floor(5 + energy * 15); // 5-20 Cluster (erhöht von 3-10)
      const veinsPerCluster = Math.floor(totalVeinCount / clusterCount);
      
      for (let cluster = 0; cluster < clusterCount; cluster++) {
        const clusterX = viewportRegion.startX + Math.random() * (viewportRegion.endX - viewportRegion.startX);
        const clusterY = viewportRegion.startY + Math.random() * (viewportRegion.endY - viewportRegion.startY);
        const clusterRadius = 15 + Math.random() * 35; // 15-50 Pixel Radius (erhöht von 10-30)
        
        for (let i = 0; i < veinsPerCluster; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const x = Math.floor(clusterX + Math.cos(angle) * distance);
          const y = Math.floor(clusterY + Math.sin(angle) * distance);
          
          if (x >= viewportRegion.startX && x < viewportRegion.endX &&
              y >= viewportRegion.startY && y < viewportRegion.endY) {
            const colorIndex = cluster % accentColors.length;
            veins.push({ x, y, color: accentColors[colorIndex] });
          }
        }
      }
    },
    
    // Pattern 4: Spiral-ähnlich (von außen nach innen)
    () => {
      const centerX = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2);
      const centerY = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2);
      const maxRadius = Math.min(viewportRegion.endX - viewportRegion.startX, viewportRegion.endY - viewportRegion.startY) / 2;
      
      for (let i = 0; i < totalVeinCount; i++) {
        const progress = i / totalVeinCount;
        const angle = progress * Math.PI * 8; // 4 Umdrehungen
        const radius = maxRadius * (1 - progress); // Von außen nach innen
        const x = Math.floor(centerX + Math.cos(angle) * radius);
        const y = Math.floor(centerY + Math.sin(angle) * radius);
        
        if (x >= viewportRegion.startX && x < viewportRegion.endX &&
            y >= viewportRegion.startY && y < viewportRegion.endY) {
          const colorIndex = Math.floor(progress * accentColors.length);
          veins.push({ x, y, color: accentColors[colorIndex] });
        }
      }
    },
    
    // Pattern 5: Grid-ähnlich (strukturiertes Raster)
    () => {
      const gridSize = Math.floor(5 + energy * 10); // 5-15 Grid-Zellen
      const cellWidth = (viewportRegion.endX - viewportRegion.startX) / gridSize;
      const cellHeight = (viewportRegion.endY - viewportRegion.startY) / gridSize;
      const veinsPerCell = Math.floor(totalVeinCount / (gridSize * gridSize));
      
      for (let gridX = 0; gridX < gridSize; gridX++) {
        for (let gridY = 0; gridY < gridSize; gridY++) {
          const cellStartX = viewportRegion.startX + gridX * cellWidth;
          const cellStartY = viewportRegion.startY + gridY * cellHeight;
          
          for (let i = 0; i < veinsPerCell; i++) {
            const x = Math.floor(cellStartX + Math.random() * cellWidth);
            const y = Math.floor(cellStartY + Math.random() * cellHeight);
            const colorIndex = (gridX + gridY) % accentColors.length;
            veins.push({ x, y, color: accentColors[colorIndex] });
          }
        }
      }
    }
  ];
  
  // OPTIMIERT: Wähle Pattern basierend auf Energy und Beat
  let patternIndex;
  if (beatDetected) {
    // Bei Beat: Explosions- oder Wellen-Pattern
    patternIndex = energy > 0.5 ? 0 : 1; // Explosion bei hoher Energy, Wellen bei niedriger
  } else {
    // Ohne Beat: Cluster, Spiral oder Grid basierend auf Energy
    if (energy > 0.7) patternIndex = 2; // Cluster bei hoher Energy
    else if (energy > 0.4) patternIndex = 3; // Spiral bei mittlerer Energy
    else patternIndex = 4; // Grid bei niedriger Energy
  }
  
  // Generiere das ausgewählte Pattern
  const selectedPattern = beatPatterns[patternIndex];
  if (selectedPattern) {
    selectedPattern();
  }
  
  return veins;
}

// OPTIMIERT: Export-Funktion für Cache-Management
export function clearBackgroundCaches(): void {
  backgroundCache.clear();
  veinCache.clear();
}

// OPTIMIERT: Export-Funktion für Cache-Status
export function getBackgroundCacheStatus(): { background: number; veins: number } {
  return {
    background: backgroundCache.size,
    veins: veinCache.size
  };
}

/**
 * OPTIMIERT: Generiert vordefinierte Vein-Sequenzen für Idle-Animation
 * 10 verschiedene Muster, die in einer Schleife abgespielt werden
 */
export function generateIdleVeinSequence(
  width: number, 
  height: number, 
  step: number,
  viewportWidth?: number,
  viewportHeight?: number
): Array<{x: number, y: number, color: string}> {
  const adjustedWidth = Math.min(width, MAX_BG_WIDTH);
  const adjustedHeight = Math.min(height, MAX_BG_HEIGHT);
  const effectiveViewportWidth = viewportWidth || adjustedWidth;
  const effectiveViewportHeight = viewportHeight || adjustedHeight;
  
  // Berechne sichtbaren Bereich
  const viewportRegion = calculateViewportRegion(
    adjustedWidth,
    adjustedHeight,
    effectiveViewportWidth,
    effectiveViewportHeight
  );
  
  const veins: Array<{x: number, y: number, color: string}> = [];
  const stepIndex = step % 10; // 10 Schritte pro Loop
  
  // Vordefinierte Muster für jeden Schritt
  const patterns = [
    // Schritt 0: Horizontale Linie oben
    () => {
      const y = Math.floor(viewportRegion.startY + (viewportRegion.endY - viewportRegion.startY) * 0.1);
      for (let x = viewportRegion.startX; x < viewportRegion.endX; x += 2) {
        veins.push({ x, y, color: accentColors[0] });
      }
    },
    // Schritt 1: Vertikale Linie links
    () => {
      const x = Math.floor(viewportRegion.startX + (viewportRegion.endX - viewportRegion.startX) * 0.1);
      for (let y = viewportRegion.startY; y < viewportRegion.endY; y += 2) {
        veins.push({ x, y, color: accentColors[1] });
      }
    },
    // Schritt 2: Diagonale von oben-links nach unten-rechts
    () => {
      const startX = viewportRegion.startX;
      const startY = viewportRegion.startY;
      const endX = viewportRegion.endX;
      const endY = viewportRegion.endY;
      for (let i = 0; i < Math.min(endX - startX, endY - startY); i += 3) {
        veins.push({ 
          x: startX + i, 
          y: startY + i, 
          color: accentColors[2] 
        });
      }
    },
    // Schritt 3: Kleine Cluster in der Mitte
    () => {
      const centerX = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2);
      const centerY = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 2) {
            veins.push({ 
              x: centerX + dx, 
              y: centerY + dy, 
              color: accentColors[3] 
            });
          }
        }
      }
    },
    // Schritt 4: Horizontale Linie in der Mitte
    () => {
      const y = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2);
      for (let x = viewportRegion.startX; x < viewportRegion.endX; x += 3) {
        veins.push({ x, y, color: accentColors[4] });
      }
    },
    // Schritt 5: Vertikale Linie in der Mitte
    () => {
      const x = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2);
      for (let y = viewportRegion.startY; y < viewportRegion.endY; y += 3) {
        veins.push({ x, y, color: accentColors[0] });
      }
    },
    // Schritt 6: Diagonale von oben-rechts nach unten-links
    () => {
      const startX = viewportRegion.endX - 1;
      const startY = viewportRegion.startY;
      const endX = viewportRegion.startX;
      const endY = viewportRegion.endY;
      for (let i = 0; i < Math.min(startX - endX, endY - startY); i += 3) {
        veins.push({ 
          x: startX - i, 
          y: startY + i, 
          color: accentColors[1] 
        });
      }
    },
    // Schritt 7: Horizontale Linie unten
    () => {
      const y = Math.floor(viewportRegion.startY + (viewportRegion.endY - viewportRegion.startY) * 0.9);
      for (let x = viewportRegion.startX; x < viewportRegion.endX; x += 2) {
        veins.push({ x, y, color: accentColors[2] });
      }
    },
    // Schritt 8: Vertikale Linie rechts
    () => {
      const x = Math.floor(viewportRegion.startX + (viewportRegion.endX - viewportRegion.startX) * 0.9);
      for (let y = viewportRegion.startY; y < viewportRegion.endY; y += 2) {
        veins.push({ x, y, color: accentColors[3] });
      }
    },
    // Schritt 9: Kreuz in der Mitte
    () => {
      const centerX = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2);
      const centerY = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2);
      // Horizontale Linie
      for (let dx = -3; dx <= 3; dx++) {
        veins.push({ x: centerX + dx, y: centerY, color: accentColors[4] });
      }
      // Vertikale Linie
      for (let dy = -3; dy <= 3; dy++) {
        if (dy !== 0) { // Vermeide Duplikat in der Mitte
          veins.push({ x: centerX, y: centerY + dy, color: accentColors[4] });
        }
      }
    }
  ];
  
  // Generiere das Muster für den aktuellen Schritt
  if (patterns[stepIndex]) {
    patterns[stepIndex]();
  }
  
  return veins;
} 