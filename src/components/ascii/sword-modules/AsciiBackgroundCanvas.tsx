import React, { useRef, useEffect } from 'react';

interface AsciiBackgroundCanvasProps {
  pattern: string[][];
  veins: Array<{ x: number; y: number; color: string }>;
  centeredVeins?: Array<{ x: number; y: number; color: string; intensity: number }>;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
}

const AsciiBackgroundCanvas: React.FC<AsciiBackgroundCanvasProps> = ({
  pattern,
  veins,
  centeredVeins = [],
  width,
  height,
  fontSize = 16, // Größer für besseren Look
  fontFamily = 'monospace',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // Setze Canvas auf native Auflösung
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#888';
    ctx.imageSmoothingEnabled = false;

    // Vein-Map für schnellen Zugriff
    const veinMap = new Map<string, string>();
    veins.forEach(v => veinMap.set(`${v.x},${v.y}`, v.color));
    
    // Zentrierte Vein-Map für Intensität
    const centeredVeinMap = new Map<string, { color: string; intensity: number }>();
    centeredVeins.forEach(v => centeredVeinMap.set(`${v.x},${v.y}`, { color: v.color, intensity: v.intensity }));

    // Zeichenbreite/Höhe exakt berechnen
    const charWidth = ctx.measureText('M').width;
    const charHeight = fontSize * 1.05;

    // Berechne Offset, damit das Pattern zentriert ist
    const patternCols = pattern[0]?.length || 0;
    const patternRows = pattern.length;
    const totalWidth = patternCols * charWidth;
    const totalHeight = patternRows * charHeight;
    const offsetX = (width - totalWidth) / 2;
    const offsetY = (height - totalHeight) / 2;

    // Pattern zeichnen
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        const char = pattern[y][x];
        const veinColor = veinMap.get(`${x},${y}`);
        const centeredVein = centeredVeinMap.get(`${x},${y}`);
        
        // Priorität: Zentrierte Veins > Normale Veins > Standard
        if (centeredVein) {
          // Zentrierte Veins mit Intensität
          const alpha = centeredVein.intensity;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = centeredVein.color;
        } else if (veinColor) {
          // Normale Veins
          ctx.globalAlpha = 1;
          ctx.fillStyle = veinColor;
        } else {
          // Standard
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#888';
        }
        
        ctx.fillText(char, offsetX + x * charWidth, offsetY + y * charHeight);
      }
    }
    
    // Reset globalAlpha
    ctx.globalAlpha = 1;
  }, [pattern, veins, centeredVeins, width, height, fontSize, fontFamily]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
    />
  );
};

export default AsciiBackgroundCanvas; 