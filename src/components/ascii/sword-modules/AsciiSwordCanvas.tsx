"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useAudioReactionStore, useBeatReset, useFallbackAnimation } from '@/store/audioReactionStore';

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

interface CanvasRenderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  charWidth: number;
  charHeight: number;
  fontSize: number;
}

export default function AsciiSwordCanvas({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
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
  
  // Zustände für visuelle Effekte
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [baseColor, setBaseColor] = useState('#00FCA6');
  const [bgColor, setBgColor] = useState<string>(getComplementaryColor('#00FCA6'));
  const [lastColorChangeTime, setLastColorChangeTime] = useState<number>(Date.now());
  const [colorStability, setColorStability] = useState<number>(2000);
  const [isClient, setIsClient] = useState(false);
  
  // Memoisierte Daten
  const activeLevel = useMemo(() => currentLevel || level, [currentLevel, level]);
  const swordArt = useMemo(() => swordLevels[activeLevel as keyof typeof swordLevels] || swordLevels[1], [activeLevel]);
  const centeredSwordLines = useMemo(() => centerAsciiArt(swordArt), [swordArt]);
  
  // Memoisierte Positionen
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
  
  // Canvas-Initialisierung
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas-Größe setzen
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    // Skalierung für Retina-Displays
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Font-Einstellungen
    const fontSize = Math.max(8, Math.min(16, rect.width / 80));
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    
    // Char-Dimensionen berechnen
    const charMetrics = ctx.measureText('M');
    const charWidth = charMetrics.width;
    const charHeight = fontSize;
    
    rendererRef.current = {
      ctx,
      width: rect.width,
      height: rect.height,
      charWidth,
      charHeight,
      fontSize
    };
    
    console.log('Canvas initialized:', { width: rect.width, height: rect.height, fontSize });
  }, []);
  
  // Render-Funktion
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    
    const { ctx, width, height, charWidth, charHeight } = renderer;
    
    // Canvas löschen
    ctx.clearRect(0, 0, width, height);
    
    // Hintergrundfarbe
    const backgroundColor = getDarkerColor(bgColor);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Schwert rendern
    const centerX = width / 2;
    const centerY = height / 2;
    
    centeredSwordLines.forEach((line, y) => {
      const lineY = centerY + (y - centeredSwordLines.length / 2) * charHeight;
      
      Array.from(line).forEach((char, x) => {
        if (char === ' ') return;
        
        const charX = centerX + (x - line.length / 2) * charWidth;
        
        // Basis-Styling
        ctx.fillStyle = baseColor;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = glowIntensity * 10;
        
        // Zeichen zeichnen
        ctx.fillText(char, charX, lineY);
        
        // Reset Shadow
        ctx.shadowBlur = 0;
      });
    });
    
    // Animation-Frame fortsetzen
    animationFrameRef.current = requestAnimationFrame(render);
  }, [centeredSwordLines, baseColor, bgColor, glowIntensity]);
  
  // Audio-reaktive Effekte
  useEffect(() => {
    if (beatDetected || energy > 0.2) {
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
    }
  }, [beatDetected, energy]);
  
  useEffect(() => {
    if ((energy > 0.30 || beatDetected) && Date.now() - lastColorChangeTime > colorStability) {
      const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
      setBaseColor(swordColor);
      setBgColor(newBgColor);
      setLastColorChangeTime(Date.now());
      
      const newStability = energy > 0.7 
        ? Math.max(300, Math.floor(1000 - (energy * 800)))
        : Math.floor(1000 + Math.random() * 1500);
      
      setColorStability(newStability);
    }
  }, [beatDetected, energy, lastColorChangeTime, colorStability]);
  
  // Canvas-Initialisierung und Cleanup
  useEffect(() => {
    setIsClient(true);
    
    if (isClient) {
      initializeCanvas();
      
      // Resize-Handler
      const handleResize = () => {
        initializeCanvas();
      };
      
      window.addEventListener('resize', handleResize);
      
      // Animation starten
      animationFrameRef.current = requestAnimationFrame(render);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isClient, initializeCanvas, render]);
  
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