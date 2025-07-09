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
export const MAX_VEINS = 300;

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
      
      if (Math.random() < emptyProbability) {
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
        if (Math.random() < lightCharProbability) {
          charSet = selectedCharSet.light;
        }
      }
      
      // OPTIMIERT: Reduzierte rhythmische Variationen für bessere Performance
      if ((x + y) % 7 === 0 || Math.random() < 0.1) {
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
      } else if (Math.random() < 0.7) {
        const patternY = y % caveBgPatterns.length;
        const patternX = x % caveBgPatterns[patternY].length;
        const baseChar = caveBgPatterns[patternY][patternX];
        
        if (baseChar === '█' || baseChar === '▓') {
          background[y][x] = selectedCharSet.dense[Math.floor(Math.random() * selectedCharSet.dense.length)];
        } else if (baseChar === '▒') {
          background[y][x] = selectedCharSet.medium[Math.floor(Math.random() * selectedCharSet.medium.length)];
        } else if (baseChar === '░') {
          background[y][x] = selectedCharSet.light[Math.floor(Math.random() * selectedCharSet.light.length)];
        } else {
          background[y][x] = baseChar;
        }
      } else {
        background[y][x] = charSet[Math.floor(Math.random() * charSet.length)];
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