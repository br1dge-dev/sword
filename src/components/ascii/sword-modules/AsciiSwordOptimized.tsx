"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useAudioReactionStore, useBeatReset, useFallbackAnimation } from '@/store/audioReactionStore';
import { effectsReducer, effectsActions, initialEffectsState } from '@/store/effectsReducer';

// Importiere Typen
import {
  AsciiSwordProps,
  SwordPosition,
  EdgePosition
} from './types/swordTypes';

// Importiere Konstanten
import {
  swordLevels,
  edgeChars,
  edgeGlitchChars,
  vibrationIntensity,
  glitchIntensity,
  glitchFrequency,
  colorEffectFrequency,
  colorEffectIntensity,
  unicodeGlitchChars,
  veinIntensity,
  accentColors,
  glitchSymbols
} from './constants/swordConstants';

// Importiere Hilfsfunktionen
import {
  centerAsciiArt,
  isEdgeChar,
  isHandlePosition,
  getDarkerColor,
  getLighterColor,
  getComplementaryColor,
  generateCluster,
  getRandomOffset
} from './utils/swordUtils';

// Importiere Effekt-Generatoren
import { generateCaveBackground, generateColoredVeins } from './effects/backgroundEffects';
import { generateHarmonicColorPair } from './effects/colorEffects';
import {
  generateEdgeGlitches,
  generateUnicodeGlitches,
  generateBlurredChars,
  generateSkewedChars,
  generateFadedChars
} from './effects/glitchEffects';
import { generateColoredTiles, generateGlitchChars } from './effects/tileEffects';

export default function AsciiSwordOptimized({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef(0);
  const performanceMonitorRef = useRef<{startRender: () => void, endRender: () => void} | null>(null);
  
  // Zugriff auf den PowerUpStore
  const { currentLevel, chargeLevel, glitchLevel } = usePowerUpStore();
  
  // Audio-Reaktionsdaten abrufen
  const { energy: storeEnergy, beatDetected: storeBeat } = useAudioReactionStore();
  
  // Verwende direkte Werte, wenn verfügbar, sonst aus dem Store
  const energy = directEnergy !== undefined ? directEnergy : storeEnergy;
  const beatDetected = directBeat !== undefined ? directBeat : storeBeat;
  
  // Automatisches Beat-Reset aktivieren
  useBeatReset(100);
  
  // Fallback-Animation aktivieren, wenn keine Audio-Reaktivität vorhanden ist
  useFallbackAnimation();
  
  // State-Reducer für alle visuellen Effekte
  const [effects, dispatch] = useReducer(effectsReducer, initialEffectsState);
  
  // Client-Side Rendering
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  
  // ===== KRITISCHE MEMOIZATION =====
  
  // Memoisierte Level-Daten
  const activeLevel = useMemo(() => currentLevel || level, [currentLevel, level]);
  const swordArt = useMemo(() => swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1], [activeLevel]);
  const centeredSwordLines = useMemo(() => centerAsciiArt(swordArt), [swordArt]);
  
  // Memoisierte Positionen (nur bei Änderung der Schwert-Form neu berechnen)
  const swordPositions = useMemo(() => {
    const positions: Array<SwordPosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (char !== ' ') {
          positions.push({x, y});
        }
      });
    });
    return positions;
  }, [centeredSwordLines]);
  
  const edgePositions = useMemo(() => {
    const positions: Array<EdgePosition> = [];
    centeredSwordLines.forEach((line, y) => {
      Array.from(line).forEach((char, x) => {
        if (isEdgeChar(char) && !isHandlePosition(x, y, centeredSwordLines)) {
          positions.push({x, y, char});
        }
      });
    });
    return positions;
  }, [centeredSwordLines]);
  
  // Memoisierte Hintergrund-Dimensionen
  const backgroundDimensions = useMemo(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    const baseWidth = 160;
    const baseHeight = 100;
    
    let widthFactor, heightFactor;
    
    if (viewportWidth > 1440) {
      widthFactor = Math.min(1.5, Math.max(1, viewportWidth / 960));
      heightFactor = Math.min(1.5, Math.max(1, viewportHeight / 720));
    } else {
      widthFactor = Math.min(1.25, Math.max(1, viewportWidth / 1024));
      heightFactor = Math.min(1.25, Math.max(1, viewportHeight / 768));
    }
    
    return {
      width: Math.floor(baseWidth * widthFactor),
      height: Math.floor(baseHeight * heightFactor)
    };
  }, []);
  
  // Memoisierte Hintergrund-Daten
  const caveBackground = useMemo(() => 
    generateCaveBackground(backgroundDimensions.width, backgroundDimensions.height),
    [backgroundDimensions.width, backgroundDimensions.height]
  );
  
  const coloredVeins = useMemo(() => {
    const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
    const numVeins = Math.floor((backgroundDimensions.width * backgroundDimensions.height) / (300 / veinMultiplier));
    return generateColoredVeins(backgroundDimensions.width, backgroundDimensions.height, numVeins);
  }, [backgroundDimensions.width, backgroundDimensions.height, glitchLevel]);
  
  // ===== OPTIMIERTE AUDIO-REAKTION =====
  
  // Debounced Audio-Updates (verhindert zu häufige Updates)
  const debouncedAudioUpdate = useCallback(() => {
    dispatch(effectsActions.audioReactiveUpdate(energy, beatDetected, glitchLevel, chargeLevel));
  }, [energy, beatDetected, glitchLevel, chargeLevel]);
  
  // Audio-reaktive Updates mit Throttling
  useEffect(() => {
    const now = performance.now();
    if (now - lastRenderTimeRef.current > 16) { // Maximal 60fps
      debouncedAudioUpdate();
      lastRenderTimeRef.current = now;
    }
  }, [debouncedAudioUpdate]);
  
  // ===== CANVAS-RENDERING =====
  
  // Canvas-Initialisierung
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const fontSize = Math.max(8, Math.min(16, rect.width / 80));
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    
    return { ctx, width: rect.width, height: rect.height, fontSize };
  }, []);
  
  // Optimierte Render-Funktion
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const renderer = initializeCanvas();
    if (!renderer) return;
    
    const { ctx, width, height, fontSize } = renderer;
    
    // Performance-Monitoring starten
    performanceMonitorRef.current?.startRender();
    
    // Canvas löschen
    ctx.clearRect(0, 0, width, height);
    
    // Hintergrundfarbe
    const backgroundColor = getDarkerColor(effects.bgColor);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Hintergrund rendern (nur wenn nötig)
    if (caveBackground.length > 0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const charWidth = fontSize * 0.6;
      const charHeight = fontSize;
      
      caveBackground.forEach((row, y) => {
        const lineY = centerY + (y - caveBackground.length / 2) * charHeight;
        
        row.forEach((char, x) => {
          if (char === ' ') return;
          
          const charX = centerX + (x - row.length / 2) * charWidth;
          
          // Vein-Effekt prüfen
          const vein = coloredVeins.find(v => v.x === x && v.y === y);
          
          if (vein) {
            ctx.fillStyle = vein.color;
            ctx.shadowColor = vein.color;
            ctx.shadowBlur = 2 + glitchLevel;
          } else {
            ctx.fillStyle = getLighterColor(effects.bgColor);
            ctx.shadowBlur = 0;
          }
          
          ctx.fillText(char, charX, lineY);
        });
      });
    }
    
    // Schwert rendern
    const centerX = width / 2;
    const centerY = height / 2;
    const charWidth = fontSize * 0.6;
    const charHeight = fontSize;
    
    centeredSwordLines.forEach((line, y) => {
      const lineY = centerY + (y - centeredSwordLines.length / 2) * charHeight;
      
      Array.from(line).forEach((char, x) => {
        if (char === ' ') return;
        
        const charX = centerX + (x - line.length / 2) * charWidth;
        
        // Effekte anwenden
        let finalChar = char;
        let finalColor = effects.baseColor;
        let finalShadow = effects.glowIntensity * 10;
        let finalOffset = { x: 0, y: 0 };
        
        // Colored Tiles
        const coloredTile = effects.coloredTiles.find(t => t.x === x && t.y === y);
        if (coloredTile) {
          finalColor = coloredTile.color;
        }
        
        // Edge Effects
        const edgeEffect = effects.edgeEffects.find(e => e.x === x && e.y === y);
        if (edgeEffect) {
          if (edgeEffect.char) finalChar = edgeEffect.char;
          if (edgeEffect.color) finalColor = edgeEffect.color;
          if (edgeEffect.offset) finalOffset = edgeEffect.offset;
        }
        
        // Unicode Glitches
        const unicodeGlitch = effects.unicodeGlitches.find(g => g.x === x && g.y === y);
        if (unicodeGlitch) {
          finalChar = unicodeGlitch.char;
        }
        
        // Rendering
        ctx.fillStyle = finalColor;
        ctx.shadowColor = finalColor;
        ctx.shadowBlur = finalShadow;
        
        ctx.fillText(finalChar, charX + finalOffset.x, lineY + finalOffset.y);
      });
    });
    
    // Performance-Monitoring beenden
    performanceMonitorRef.current?.endRender();
    
    // Nächste Frame planen
    animationFrameRef.current = requestAnimationFrame(render);
  }, [centeredSwordLines, effects, caveBackground, coloredVeins, glitchLevel, initializeCanvas]);
  
  // ===== RESIZE-HANDLING =====
  
  const handleResize = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(render);
  }, [render]);
  
  // ===== LIFECYCLE =====
  
  useEffect(() => {
    if (!isClient) return;
    
    // Performance-Monitoring initialisieren
    performanceMonitorRef.current = {
      startRender: () => {
        // Render-Zeit messen
      },
      endRender: () => {
        // Render-Zeit beenden
      }
    };
    
    // Resize-Handler
    window.addEventListener('resize', handleResize);
    
    // Animation starten
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isClient, render, handleResize]);
  
  if (!isClient) {
    return <div style={{width: '100vw', height: '100vh', background: '#111'}} />;
  }
  
  return (
    <div 
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          display: 'block',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
} 