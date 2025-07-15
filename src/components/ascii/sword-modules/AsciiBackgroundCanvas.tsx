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

  // NEU: Funktion zur Reduzierung der Farbsättigung um 25%
  const reduceColorSaturation = (color: string, reductionPercent: number = 25): string => {
    // Konvertiere Hex zu RGB
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);
    
    // Konvertiere zu HSL für einfachere Sättigungsmanipulation
    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return [h, s, l];
    };
    
    // Konvertiere HSL zurück zu RGB
    const hslToRgb = (h: number, s: number, l: number) => {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      let r, g, b;
      
      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
      ];
    };
    
    // Reduziere Sättigung um 25%
    const [h, s, l] = rgbToHsl(r, g, b);
    const reducedSaturation = Math.max(0, s * (1 - reductionPercent / 100));
    const [newR, newG, newB] = hslToRgb(h, reducedSaturation, l);
    
    // Konvertiere zurück zu Hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

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
          // Zentrierte Veins mit Intensität (Sättigung um 25% reduziert)
          const alpha = centeredVein.intensity;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = reduceColorSaturation(centeredVein.color, 25);
        } else if (veinColor) {
          // Normale Veins (Sättigung um 25% reduziert)
          ctx.globalAlpha = 1;
          ctx.fillStyle = reduceColorSaturation(veinColor, 25);
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