import React, { useRef, useEffect } from 'react';

interface AsciiBackgroundCanvasProps {
  pattern: string[][];
  patternB?: string[][];
  patternBlend?: number; // 0..1
  veins: Array<{ x: number; y: number; color: string }>;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
}

type PatternCache = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
  fontSize: number;
  fontFamily: string;
  // Layout metrics (in CSS px coordinates; assumes ctx is scaled by dpr)
  charWidth: number;
  charHeight: number;
  offsetX: number;
  offsetY: number;
  patternRef: string[][] | null;
};

type Any2dCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createOffscreenCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  // Prefer OffscreenCanvas when available (often faster, avoids DOM coupling).
  // Fallback to a regular canvas for Safari/older browsers.
  const maybe = (globalThis as unknown as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas;
  if (maybe) return new maybe(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function get2dContext(c: HTMLCanvasElement | OffscreenCanvas): Any2dCtx | null {
  return c.getContext('2d');
}

function renderPatternToCache(
  cache: PatternCache,
  pattern: string[][],
): void {
  const ctx = get2dContext(cache.canvas);
  if (!ctx) return;

  // Reset and scale so all coordinates are in CSS px.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(cache.dpr, cache.dpr);

  // Clear (in CSS px coords).
  ctx.clearRect(0, 0, cache.width, cache.height);

  // Font & drawing settings
  ctx.font = `bold ${cache.fontSize}px ${cache.fontFamily}`;
  ctx.textBaseline = 'top';
  if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#888';

  const rows = pattern.length;
  const cols = pattern[0]?.length || 0;
  if (!rows || !cols) return;

  // Draw only the pattern (no veins here; veins are an overlay pass).
  for (let y = 0; y < rows; y++) {
    const row = pattern[y] || [];
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      ctx.fillText(ch, cache.offsetX + x * cache.charWidth, cache.offsetY + y * cache.charHeight);
    }
  }
}

const AsciiBackgroundCanvas: React.FC<AsciiBackgroundCanvasProps> = ({
  pattern,
  patternB,
  patternBlend = 0,
  veins,
  width,
  height,
  fontSize = 16, // Größer für besseren Look
  fontFamily = 'monospace',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheARef = useRef<PatternCache | null>(null);
  const cacheBRef = useRef<PatternCache | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas backing store to native resolution
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Reset + scale so we draw in CSS px coordinates.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';

    // Compute layout metrics (must match cached pattern metrics).
    const charWidth = ctx.measureText('M').width;
    const charHeight = fontSize * 1.05;
    const cols = pattern[0]?.length || 0;
    const rows = pattern.length;
    const totalWidth = cols * charWidth;
    const totalHeight = rows * charHeight;
    const offsetX = (width - totalWidth) / 2;
    const offsetY = (height - totalHeight) / 2;

    // (Re)build cache A if needed.
    const needNewA =
      !cacheARef.current ||
      cacheARef.current.width !== width ||
      cacheARef.current.height !== height ||
      cacheARef.current.dpr !== dpr ||
      cacheARef.current.fontSize !== fontSize ||
      cacheARef.current.fontFamily !== fontFamily;

    if (needNewA) {
      cacheARef.current = {
        canvas: createOffscreenCanvas(Math.floor(width * dpr), Math.floor(height * dpr)),
        width,
        height,
        dpr,
        fontSize,
        fontFamily,
        charWidth,
        charHeight,
        offsetX,
        offsetY,
        patternRef: null,
      };
    } else {
      // Keep metrics in sync when only pattern changes.
      cacheARef.current.charWidth = charWidth;
      cacheARef.current.charHeight = charHeight;
      cacheARef.current.offsetX = offsetX;
      cacheARef.current.offsetY = offsetY;
    }

    if (cacheARef.current.patternRef !== pattern) {
      cacheARef.current.patternRef = pattern;
      renderPatternToCache(cacheARef.current, pattern);
    }

    // (Re)build cache B if needed (only if patternB exists).
    const hasB = !!(patternB && patternB.length > 0);
    if (hasB) {
      const needNewB =
        !cacheBRef.current ||
        cacheBRef.current.width !== width ||
        cacheBRef.current.height !== height ||
        cacheBRef.current.dpr !== dpr ||
        cacheBRef.current.fontSize !== fontSize ||
        cacheBRef.current.fontFamily !== fontFamily;

      if (needNewB) {
        cacheBRef.current = {
          canvas: createOffscreenCanvas(Math.floor(width * dpr), Math.floor(height * dpr)),
          width,
          height,
          dpr,
          fontSize,
          fontFamily,
          charWidth,
          charHeight,
          offsetX,
          offsetY,
          patternRef: null,
        };
      } else if (cacheBRef.current) {
        cacheBRef.current.charWidth = charWidth;
        cacheBRef.current.charHeight = charHeight;
        cacheBRef.current.offsetX = offsetX;
        cacheBRef.current.offsetY = offsetY;
      }

      if (cacheBRef.current && cacheBRef.current.patternRef !== patternB) {
        cacheBRef.current.patternRef = patternB!;
        renderPatternToCache(cacheBRef.current, patternB!);
      }
    } else {
      cacheBRef.current = null;
    }

    // Draw cached base pattern(s)
    const b = Math.max(0, Math.min(1, patternBlend));
    if (cacheARef.current) {
      ctx.globalAlpha = 1;
      // Draw pattern A
      ctx.drawImage(cacheARef.current.canvas as unknown as CanvasImageSource, 0, 0, width, height);
      // Draw pattern B blended in (if present)
      if (cacheBRef.current && b > 0) {
        ctx.globalAlpha = b;
        ctx.drawImage(cacheBRef.current.canvas as unknown as CanvasImageSource, 0, 0, width, height);
      }
    }

    // Draw veins as an overlay pass (this is the only per-tick "text work").
    // Small micro-optimizations:
    // - group by color to reduce fillStyle churn
    // - pick char from current dominant pattern (keeps veins strong during crossfade)
    const dominant = cacheBRef.current && b > 0.5 ? (patternB as string[][]) : pattern;
    const byColor = new Map<string, Array<{ x: number; y: number }>>();
    for (const v of veins) {
      const arr = byColor.get(v.color);
      if (arr) arr.push({ x: v.x, y: v.y });
      else byColor.set(v.color, [{ x: v.x, y: v.y }]);
    }

    ctx.globalAlpha = 1;
    for (const [color, pts] of byColor) {
      ctx.fillStyle = color;
      for (let i = 0; i < pts.length; i++) {
        const { x, y } = pts[i];
        const ch = dominant?.[y]?.[x];
        if (!ch) continue;
        ctx.fillText(ch, offsetX + x * charWidth, offsetY + y * charHeight);
      }
    }

    ctx.globalAlpha = 1;
  }, [pattern, patternB, patternBlend, veins, width, height, fontSize, fontFamily]);

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