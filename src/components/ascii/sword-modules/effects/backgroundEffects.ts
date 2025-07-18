/**
 * backgroundEffects.ts
 * 
 * Funktionen zur Generierung von Hintergrundeffekten für die ASCII-Schwert-Komponente
 * OPTIMIERT: Lazy-Rendering, Viewport-basiertes Rendering, Caching, vermeidet unnötige Neuberechnungen
 */
import { caveBgPatterns, accentColors } from '../constants/swordConstants';
import { generateCluster } from '../utils/swordUtils';

// --- NEU: Globaler Vein-Lifetime-Cache für längere Lebensdauer ---
const VEIN_LIFETIME_FRAMES = 8; // Wie viele Frames Veins sichtbar bleiben
let veinLifetimeCache: Array<Array<{x: number, y: number, color: string}>> = [];

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
    // --- NEU: Glitchige, kleinpartikeldominierte Patterns ---
    {
      light: ['.', ':', '˙', '°', ' ', ' ', 'x', '+'],
      medium: ['*', '░', '▒', '╳', '╱', '╲', '┼', '┴', '┬', '┤', '├', '┐', '└', '┘', '┌'],
      dense: ['┼', '╳', '╱', '╲', '⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢', '◆', '◈', '◦', '◎', '○', '◌', '◉', '◍', '░', '▒', '▓']
    },
    {
      light: ['.', ':', '˙', '°', ' ', ' ', 'x', '+'],
      medium: ['*', '░', '▒', '╳', '╱', '╲', '┼', '┴', '┬', '┤', '├', '┐', '└', '┘', '┌'],
      dense: ['┼', '╳', '╱', '╲', '⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢', '◆', '◈', '◦', '◎', '○', '◌', '◉', '◍', '░', '▒', '▓']
    },
    {
      light: ['.', ':', '˙', '°', ' ', ' ', 'x', '+'],
      medium: ['*', '░', '▒', '╳', '╱', '╲', '┼', '┴', '┬', '┤', '├', '┐', '└', '┘', '┌'],
      dense: ['┼', '╳', '╱', '╲', '⎔', '⎕', '⎖', '⎗', '⎘', '⎙', '⎚', '⎛', '⎜', '⎝', '⎞', '⎟', '⎠', '⎡', '⎢', '◆', '◈', '◦', '◎', '○', '◌', '◉', '◍', '░', '▒', '▓']
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
      // --- NEU: chaotisch-konzentrische Muster ---
      const dx = x - centerX;
      const dy = y - adjustedHeight / 2;
      // Ringbreite pro Feld leicht variieren
      const ringWidth = 6 + Math.floor(pseudoRandom(x, y, patternType + 8888) * 3); // 6 bis 8
      // Zufälliger Offset für den Abstand
      const noisyDist = Math.sqrt(dx * dx + dy * dy) + (pseudoRandom(x, y, patternType + 9999) - 0.5) * 6;
      const ring = Math.floor(noisyDist / ringWidth);

      // Dichte pro Ring: innen dichter, außen lockerer
      let emptyProbability = 0.18 + 0.07 * ring;
      if (isLargeViewport && Math.abs(dx) > fadeStart) {
        emptyProbability = Math.min(0.995, emptyProbability + ((Math.abs(dx) - fadeStart) / fadeWidth) * 1.25);
        emptyProbability = Math.pow(emptyProbability, 1.25);
        if (Math.abs(dx) > centerX * 0.85) {
          emptyProbability = Math.min(0.998, emptyProbability * 1.2);
        }
      }
      emptyProbability = Math.max(emptyProbability, 0.25);
      if (pseudoRandom(x, y, patternType) < emptyProbability) {
        background[y][x] = ' ';
        continue;
      }

      // Zeichenwahl pro Ring: zyklisch durch die Sets
      let charSet;
      if (ring % 3 === 0) {
        charSet = selectedCharSet.light;
      } else if (ring % 3 === 1) {
        charSet = selectedCharSet.medium;
      } else {
        charSet = selectedCharSet.dense;
      }
      // Innerhalb des Sets weiterhin zufällig
      background[y][x] = charSet[Math.floor(pseudoRandom(x, y, patternType) * charSet.length)];
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
  
  // OPTIMIERT: Dynamische Vein-Anzahl basierend auf Energy und Beat (20% reduziert)
  const baseVeinCount = Math.floor(125 + (energy * 499)); // 125-624 Veins basierend auf Energy (20% reduziert)
  const beatMultiplier = beatDetected ? 2.5 : 1; // 2.5x mehr Veins bei Beat
  const totalVeinCount = Math.floor(baseVeinCount * beatMultiplier);
  
  // OPTIMIERT: Vordefinierte Beat-Patterns für bessere Performance
  const beatPatterns = [
    // Pattern 1: Zufällig verteilt (deterministisch, aber mit zusätzlichem Jitter)
    () => {
      const jitterSeed = Math.floor(pseudoRandom(totalVeinCount, Date.now() % 10000, 99) * 10000);
      for (let i = 0; i < totalVeinCount; i++) {
        const jitterX = Math.floor((pseudoRandom(i, jitterSeed, 7) - 0.5) * 3); // -1, 0, 1
        const jitterY = Math.floor((pseudoRandom(i, jitterSeed, 8) - 0.5) * 3);
        const x = viewportRegion.startX + Math.floor(pseudoRandom(i, 0, 1) * (viewportRegion.endX - viewportRegion.startX)) + jitterX;
        const y = viewportRegion.startY + Math.floor(pseudoRandom(i, 1, 1) * (viewportRegion.endY - viewportRegion.startY)) + jitterY;
        const colorIndex = i % accentColors.length;
        if (x >= viewportRegion.startX && x < viewportRegion.endX && y >= viewportRegion.startY && y < viewportRegion.endY) {
          veins.push({ x, y, color: accentColors[colorIndex] });
        }
      }
    },
    // Pattern 2: Wellen-ähnlich (mit zufälligem Offset und Jitter)
    () => {
      const waveSeed = Math.floor(pseudoRandom(totalVeinCount, Date.now() % 10000, 77) * 10000);
      const waveCount = Math.floor(3 + energy * 8);
      const veinsPerWave = Math.floor(totalVeinCount / waveCount);
      for (let wave = 0; wave < waveCount; wave++) {
        const waveY = viewportRegion.startY + (wave * (viewportRegion.endY - viewportRegion.startY) / waveCount) + Math.floor((pseudoRandom(wave, waveSeed, 1) - 0.5) * 8);
        const amplitude = 20 + pseudoRandom(wave, 0, 2) * 40 + pseudoRandom(wave, waveSeed, 2) * 10;
        const frequency = 0.02 + pseudoRandom(wave, 1, 2) * 0.03 + pseudoRandom(wave, waveSeed, 3) * 0.01;
        const phase = pseudoRandom(wave, waveSeed, 4) * Math.PI * 2;
        for (let i = 0; i < veinsPerWave; i++) {
          const x = viewportRegion.startX + (i * (viewportRegion.endX - viewportRegion.startX) / veinsPerWave);
          const waveOffset = Math.sin(x * frequency + phase) * amplitude + (pseudoRandom(i, waveSeed, 5) - 0.5) * 4;
          const y = Math.floor(waveY + waveOffset);
          if (y >= viewportRegion.startY && y < viewportRegion.endY) {
            const colorIndex = (wave + i) % accentColors.length;
            veins.push({ x: Math.floor(x), y, color: accentColors[colorIndex] });
          }
        }
      }
    },
    // Pattern 3: Cluster-ähnlich (Clusterzentren und Punkte mit Jitter)
    () => {
      const clusterSeed = Math.floor(pseudoRandom(totalVeinCount, Date.now() % 10000, 55) * 10000);
      const clusterCount = Math.floor(5 + energy * 15);
      const veinsPerCluster = Math.floor(totalVeinCount / clusterCount);
      for (let cluster = 0; cluster < clusterCount; cluster++) {
        const clusterX = viewportRegion.startX + pseudoRandom(cluster, 0, 3) * (viewportRegion.endX - viewportRegion.startX) + (pseudoRandom(cluster, clusterSeed, 1) - 0.5) * 10;
        const clusterY = viewportRegion.startY + pseudoRandom(cluster, 1, 3) * (viewportRegion.endY - viewportRegion.startY) + (pseudoRandom(cluster, clusterSeed, 2) - 0.5) * 10;
        const clusterRadius = 15 + pseudoRandom(cluster, 2, 3) * 35 + pseudoRandom(cluster, clusterSeed, 3) * 10;
        for (let i = 0; i < veinsPerCluster; i++) {
          const angle = pseudoRandom(i, cluster, 4) * Math.PI * 2 + pseudoRandom(i, clusterSeed, 4) * 0.5;
          const distance = pseudoRandom(i, cluster + 100, 4) * clusterRadius + (pseudoRandom(i, clusterSeed, 5) - 0.5) * 3;
          const x = Math.floor(clusterX + Math.cos(angle) * distance);
          const y = Math.floor(clusterY + Math.sin(angle) * distance);
          if (x >= viewportRegion.startX && x < viewportRegion.endX && y >= viewportRegion.startY && y < viewportRegion.endY) {
            const colorIndex = (cluster + i) % accentColors.length;
            veins.push({ x, y, color: accentColors[colorIndex] });
          }
        }
      }
    },
    // Pattern 4: Spiral-ähnlich (Startwinkel und Radius mit Jitter)
    () => {
      const spiralSeed = Math.floor(pseudoRandom(totalVeinCount, Date.now() % 10000, 33) * 10000);
      const centerX = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2) + Math.floor((pseudoRandom(spiralSeed, 1, 1) - 0.5) * 10);
      const centerY = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2) + Math.floor((pseudoRandom(spiralSeed, 2, 2) - 0.5) * 10);
      const maxRadius = Math.min(viewportRegion.endX - viewportRegion.startX, viewportRegion.endY - viewportRegion.startY) / 2 + pseudoRandom(spiralSeed, 3, 3) * 10;
      const spiralPhase = pseudoRandom(spiralSeed, 4, 4) * Math.PI * 2;
      for (let i = 0; i < totalVeinCount; i++) {
        const progress = i / totalVeinCount;
        const angle = progress * Math.PI * 8 + spiralPhase + (pseudoRandom(i, spiralSeed, 5) - 0.5) * 0.5;
        const radius = maxRadius * (1 - progress) + (pseudoRandom(i, spiralSeed, 6) - 0.5) * 5;
        const x = Math.floor(centerX + Math.cos(angle) * radius);
        const y = Math.floor(centerY + Math.sin(angle) * radius);
        if (x >= viewportRegion.startX && x < viewportRegion.endX && y >= viewportRegion.startY && y < viewportRegion.endY) {
          const colorIndex = Math.floor(progress * accentColors.length);
          veins.push({ x, y, color: accentColors[colorIndex] });
        }
      }
    },
    // Pattern 5: Grid-ähnlich (Zellen und Punkte mit Jitter)
    () => {
      const gridSeed = Math.floor(pseudoRandom(totalVeinCount, Date.now() % 10000, 22) * 10000);
      const gridSize = Math.floor(5 + energy * 10);
      const cellWidth = (viewportRegion.endX - viewportRegion.startX) / gridSize;
      const cellHeight = (viewportRegion.endY - viewportRegion.startY) / gridSize;
      const veinsPerCell = Math.floor(totalVeinCount / (gridSize * gridSize));
      for (let gridX = 0; gridX < gridSize; gridX++) {
        for (let gridY = 0; gridY < gridSize; gridY++) {
          const cellStartX = viewportRegion.startX + gridX * cellWidth + (pseudoRandom(gridX, gridSeed, 1) - 0.5) * 4;
          const cellStartY = viewportRegion.startY + gridY * cellHeight + (pseudoRandom(gridY, gridSeed, 2) - 0.5) * 4;
          for (let i = 0; i < veinsPerCell; i++) {
            const x = Math.floor(cellStartX + pseudoRandom(i, gridX, 5) * cellWidth + (pseudoRandom(i, gridSeed, 3) - 0.5) * 2);
            const y = Math.floor(cellStartY + pseudoRandom(i, gridY, 5) * cellHeight + (pseudoRandom(i, gridSeed, 4) - 0.5) * 2);
            const colorIndex = (gridX + gridY + i) % accentColors.length;
            if (x >= viewportRegion.startX && x < viewportRegion.endX && y >= viewportRegion.startY && y < viewportRegion.endY) {
              veins.push({ x, y, color: accentColors[colorIndex] });
            }
          }
        }
      }
    }
  ];
  
  // OPTIMIERT: Wähle Pattern basierend auf Energy und Beat
  let patternIndex;
  // --- NEU: Zufallsfaktor für Pattern-Auswahl ---
  const patternRandom = Math.floor(pseudoRandom(Date.now() % 10000, totalVeinCount, 42) * 5); // 0-4
  if (beatDetected) {
    // Bei Beat: Explosions- oder Wellen-Pattern
    if (energy > 0.5) {
      patternIndex = patternRandom; // Zufälliges Pattern bei hoher Energie
    } else {
      patternIndex = (1 + patternRandom) % 5; // Zufälliges Pattern, aber nicht immer 0
    }
  } else {
    // Ohne Beat: Cluster, Spiral oder Grid basierend auf Energy, aber zufällig
    if (energy > 0.7) patternIndex = (2 + patternRandom) % 5;
    else if (energy > 0.4) patternIndex = (3 + patternRandom) % 5;
    else patternIndex = (4 + patternRandom) % 5;
  }
  // --- ENDE NEU ---
  
  // Generiere das ausgewählte Pattern
  const selectedPattern = beatPatterns[patternIndex];
  let newVeins: Array<{x: number, y: number, color: string}> = [];
  if (selectedPattern) {
    selectedPattern();
    newVeins = veins.slice();
  }
  // --- NEU: Veins länger sichtbar halten ---
  veinLifetimeCache.push(newVeins);
  if (veinLifetimeCache.length > VEIN_LIFETIME_FRAMES) {
    veinLifetimeCache.shift();
  }
  // Mische alle Veins der letzten Frames zusammen (ältere Veins werden leicht bevorzugt entfernt)
  const allVeins = veinLifetimeCache.flat();
  // Optional: Duplikate entfernen (nach x/y/color)
  const uniqueVeins = Array.from(new Map(allVeins.map((v: {x: number, y: number, color: string}) => [v.x + ',' + v.y + ',' + v.color, v])).values()) as Array<{x: number, y: number, color: string}>;
  return uniqueVeins;
}

/**
 * NEU: Generiert zentrierte Energie-Veins die von der Mitte aus nach außen wachsen
 * Wie ein Bargraph-Meter, aber innerhalb der bestehenden Patterns
 */
export function generateCenteredEnergyVeins(
  width: number, 
  height: number, 
  energy: number,
  beatDetected: boolean,
  viewportWidth?: number,
  viewportHeight?: number
): Array<{x: number, y: number, color: string, intensity: number}> {
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
  
  const veins: Array<{x: number, y: number, color: string, intensity: number}> = [];
  
  // Zentrum des sichtbaren Bereichs
  const centerX = Math.floor((viewportRegion.startX + viewportRegion.endX) / 2);
  const centerY = Math.floor((viewportRegion.startY + viewportRegion.endY) / 2);
  
  // Maximale Ausbreitung basierend auf Viewport-Größe
  const maxRadius = Math.min(
    viewportRegion.endX - viewportRegion.startX,
    viewportRegion.endY - viewportRegion.startY
  ) / 2;
  
  // Energie-basierte Ausbreitung: 0-100% der maximalen Ausbreitung
  // Bei niedriger Energie: konzentriert in der Mitte (20% Radius)
  // Bei hoher Energie: volle Ausbreitung (100% Radius)
  const energyRadius = maxRadius * Math.min(1, 0.2 + (energy * 1.6)); // 0.2-1.0 basierend auf Energy
  
  // Beat-Multiplikator für zusätzliche Intensität
  const beatMultiplier = beatDetected ? 1.5 : 1;
  
  // Anzahl der Veins basierend auf Energie und Beat (20% reduziert)
  // Bei niedriger Energie: weniger Veins in der Mitte
  // Bei hoher Energie: mehr Veins überall
  const baseVeinCount = Math.floor(24 + (energy * 240)); // 24-264 Veins (20% reduziert)
  const totalVeinCount = Math.floor(baseVeinCount * beatMultiplier);
  
  // Farbverlauf von innen nach außen
  const innerColors = ['#ff0000', '#ff6600', '#ffcc00']; // Rot -> Orange -> Gelb (innen)
  const outerColors = ['#00ff00', '#00ccff', '#0066ff']; // Grün -> Cyan -> Blau (außen)
  
  for (let i = 0; i < totalVeinCount; i++) {
    // Zufällige Position innerhalb des Energie-Radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * energyRadius;
    
    const x = Math.floor(centerX + Math.cos(angle) * distance);
    const y = Math.floor(centerY + Math.sin(angle) * distance);
    
    // Prüfe ob Position im sichtbaren Bereich
    if (x >= viewportRegion.startX && x < viewportRegion.endX && 
        y >= viewportRegion.startY && y < viewportRegion.endY) {
      
      // Berechne Intensität basierend auf Entfernung vom Zentrum
      const normalizedDistance = distance / energyRadius;
      const intensity = Math.max(0.1, 1 - normalizedDistance);
      
      // Farbauswahl basierend auf Entfernung
      let color;
      if (normalizedDistance < 0.5) {
        // Innere Hälfte: warme Farben
        const colorIndex = Math.floor(normalizedDistance * 2 * innerColors.length);
        color = innerColors[Math.min(colorIndex, innerColors.length - 1)];
      } else {
        // Äußere Hälfte: kalte Farben
        const outerIndex = Math.floor((normalizedDistance - 0.5) * 2 * outerColors.length);
        color = outerColors[Math.min(outerIndex, outerColors.length - 1)];
      }
      
      // Beat-basierte Intensitätsmodulation
      const beatIntensity = beatDetected ? 
        intensity * (0.8 + Math.random() * 0.4) : // 0.8-1.2 bei Beat
        intensity * (0.6 + Math.random() * 0.4);  // 0.6-1.0 normal
      
      veins.push({
        x,
        y,
        color,
        intensity: Math.min(1, beatIntensity)
      });
    }
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