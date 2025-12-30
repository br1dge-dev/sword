import React, { useRef, useEffect, useState } from 'react';

interface AsciiBackgroundCanvasProps {
  pattern: string[][];
  patternB?: string[][];
  patternBlend?: number; // 0..1
  /**
   * Dynamic colored overlay veins (legacy path).
   * Prefer `veinsMapRef` for high-perf drawing without per-tick React state churn.
   */
  veins?: Array<{ x: number; y: number; color: string }>;
  /**
   * Static monochrome scaffold points drawn into the base layer (so overlay can stay small).
   */
  scaffold?: Array<{ x: number; y: number; color?: string }>;
  /**
   * High-perf path: background reads directly from a veins map ref and draws on its own rAF.
   * Map value shape matches `veinLifecycle.ts` (vein + birth ms).
   */
  veinsMapRef?: React.RefObject<Map<string, { vein: { x: number; y: number; color: string }; birth: number }>>;
  /**
   * Mutable config for overlay fade/pace; updated by parent via ref without triggering rerenders.
   */
  overlayConfigRef?: React.RefObject<{ playing: boolean; lifetimeMs: number; fadeMs: number }>;
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

function ensureCanvasBackstore(canvas: HTMLCanvasElement, widthCssPx: number, heightCssPx: number, dpr: number) {
  const w = Math.floor(widthCssPx * dpr);
  const h = Math.floor(heightCssPx * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
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

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function parseColorToRgbFast(color: string): { r: number; g: number; b: number } | null {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return { r, g, b };
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  return null;
}

function rgbaCached(
  cache: Map<string, string>,
  rgbCache: Map<string, { r: number; g: number; b: number } | null>,
  baseColor: string,
  alpha01: number,
) {
  const a = clamp01(alpha01);
  // quantize alpha for fewer fillStyle switches
  const bucket = Math.max(0, Math.min(7, Math.floor(a * 7 + 0.5)));
  const key = `${baseColor}|${bucket}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let rgb = rgbCache.get(baseColor);
  if (rgb === undefined) {
    rgb = parseColorToRgbFast(baseColor);
    rgbCache.set(baseColor, rgb);
  }
  if (!rgb) {
    cache.set(key, baseColor);
    return baseColor;
  }
  const aa = (bucket / 7);
  const s = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${aa.toFixed(3)})`;
  cache.set(key, s);
  return s;
}

const AsciiBackgroundCanvas: React.FC<AsciiBackgroundCanvasProps> = ({
  pattern,
  patternB,
  patternBlend = 0,
  veins,
  scaffold,
  veinsMapRef,
  overlayConfigRef,
  width,
  height,
  fontSize = 16, // Größer für besseren Look
  fontFamily = 'monospace',
}) => {
  // Split into two layers:
  // - base canvas: cached pattern crossfade (updates only on pattern/blend changes)
  // - overlay canvas: veins only (updates on veins changes)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const cacheARef = useRef<PatternCache | null>(null);
  const cacheBRef = useRef<PatternCache | null>(null);
  const metricsRef = useRef<{ charWidth: number; charHeight: number; offsetX: number; offsetY: number; dpr: number } | null>(null);

  // Reusable grouping buffers to avoid per-frame allocations.
  const byColorRef = useRef<Map<string, number[]>>(new Map());
  const usedColorsRef = useRef<string[]>([]);
  const [fontReadySeq, setFontReadySeq] = useState(0);
  const rgbaStyleCacheRef = useRef<Map<string, string>>(new Map());
  const rgbCacheRef = useRef<Map<string, { r: number; g: number; b: number } | null>>(new Map());
  const overlayLastDrawMsRef = useRef<number>(0);

  // Base layer: (re)render cached pattern(s) and crossfade.
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    const drawBase = () => {
      if (cancelled) return;

      // Set canvas backing store to native resolution
      ensureCanvasBackstore(canvas, width, height, dpr);

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
      metricsRef.current = { charWidth, charHeight, offsetX, offsetY, dpr };

      // (Re)build cache A if needed.
      const needNewA =
        !cacheARef.current ||
        cacheARef.current.width !== width ||
        cacheARef.current.height !== height ||
        cacheARef.current.dpr !== dpr ||
        cacheARef.current.fontSize !== fontSize ||
        cacheARef.current.fontFamily !== fontFamily;

      let cacheA = cacheARef.current;
      if (needNewA) {
        cacheA = {
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
        cacheARef.current = cacheA;
      } else {
        // Keep metrics in sync when only pattern changes.
        if (cacheA) {
          cacheA.charWidth = charWidth;
          cacheA.charHeight = charHeight;
          cacheA.offsetX = offsetX;
          cacheA.offsetY = offsetY;
        }
      }

      if (cacheA && cacheA.patternRef !== pattern) {
        cacheA.patternRef = pattern;
        renderPatternToCache(cacheA, pattern);
      }

      // (Re)build cache B if needed (only if patternB exists).
      const hasB = !!(patternB && patternB.length > 0);
      if (hasB) {
        const cacheBExisting = cacheBRef.current;
        const needNewB =
          !cacheBExisting ||
          cacheBExisting.width !== width ||
          cacheBExisting.height !== height ||
          cacheBExisting.dpr !== dpr ||
          cacheBExisting.fontSize !== fontSize ||
          cacheBExisting.fontFamily !== fontFamily;

        let cacheB = cacheBExisting;
        if (needNewB) {
          cacheB = {
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
          cacheBRef.current = cacheB;
        } else if (cacheB) {
          cacheB.charWidth = charWidth;
          cacheB.charHeight = charHeight;
          cacheB.offsetX = offsetX;
          cacheB.offsetY = offsetY;
        }

        if (cacheB && cacheB.patternRef !== patternB) {
          cacheB.patternRef = patternB!;
          renderPatternToCache(cacheB, patternB!);
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
      ctx.globalAlpha = 1;

      // Draw static scaffold into the base layer (monochrome, stable).
      if (scaffold && scaffold.length) {
        const dominant = patternB && b > 0.5 ? patternB : pattern;
        ctx.fillStyle = '#646B74';
        for (let i = 0; i < scaffold.length; i++) {
          const v = scaffold[i];
          const ch = dominant?.[v.y]?.[v.x];
          if (!ch) continue;
          ctx.fillText(ch, offsetX + v.x * charWidth, offsetY + v.y * charHeight);
        }
      }
    };

    // Initial draw.
    drawBase();

    // Ensure we redraw once fonts have actually loaded (canvas measureText can change),
    // otherwise the centering can drift noticeably.
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown>; load?: (s: string) => Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      // Hint-load the font used by the canvas before re-measuring.
      const spec = `bold ${fontSize}px ${fontFamily}`;
      const load = fonts.load ? fonts.load(spec) : Promise.resolve();
      Promise.resolve(load)
        .catch(() => undefined)
        .then(() => fonts.ready)
        .then(() => {
          if (cancelled) return;
          drawBase();
          // Force overlay to redraw immediately with updated metrics.
          setFontReadySeq((s) => s + 1);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [pattern, patternB, patternBlend, scaffold, width, height, fontSize, fontFamily]);

  // Overlay layer: high-perf path -> draw from veinsMapRef in an internal rAF loop.
  useEffect(() => {
    if (!veinsMapRef) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      ensureCanvasBackstore(canvas, width, height, dpr);

      const now = Date.now();
      const cfg = overlayConfigRef?.current;
      const playing = cfg?.playing ?? true;
      const lifetimeMs = Math.max(0, cfg?.lifetimeMs ?? 9000);
      const fadeMs = Math.max(0, cfg?.fadeMs ?? 7000);

      // Throttle overlay draw to reduce CPU. Faster when playing.
      const minFrameMs = playing ? 33 : 120;
      if (now - overlayLastDrawMsRef.current < minFrameMs) {
        requestAnimationFrame(tick);
        return;
      }
      overlayLastDrawMsRef.current = now;

      // Reset + scale so we draw in CSS px coordinates.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      // Layout metrics.
      let charWidth: number;
      let charHeight: number;
      let offsetX: number;
      let offsetY: number;
      const m = metricsRef.current;
      if (m && m.dpr === dpr) {
        charWidth = m.charWidth;
        charHeight = m.charHeight;
        offsetX = m.offsetX;
        offsetY = m.offsetY;
      } else {
        charWidth = ctx.measureText('M').width;
        charHeight = fontSize * 1.05;
        const cols = pattern[0]?.length || 0;
        const rows = pattern.length;
        const totalWidth = cols * charWidth;
        const totalHeight = rows * charHeight;
        offsetX = (width - totalWidth) / 2;
        offsetY = (height - totalHeight) / 2;
        metricsRef.current = { charWidth, charHeight, offsetX, offsetY, dpr };
      }

      const b = Math.max(0, Math.min(1, patternBlend));
      const dominant = patternB && b > 0.5 ? patternB : pattern;

      const hardExpire = lifetimeMs + fadeMs;
      const byColor = byColorRef.current;
      const used = usedColorsRef.current;
      used.length = 0;

      const rgbaCache = rgbaStyleCacheRef.current;
      const rgbCache = rgbCacheRef.current;

      const map = veinsMapRef.current;
      if (map && map.size) {
        map.forEach((value) => {
          const age = now - value.birth;
          if (age < 0 || age > hardExpire) return;

          // Smooth-ish fade like veinLifecycle.ts (alpha^2), but quantized to 8 buckets.
          let alpha = 1;
          if (fadeMs > 0 && age > lifetimeMs) {
            const t = (age - lifetimeMs) / fadeMs;
            alpha = 1 - clamp01(t);
            alpha = alpha * alpha;
          }
          if (alpha <= 0.01) return;

          const style = rgbaCached(rgbaCache, rgbCache, value.vein.color, alpha);
          let arr = byColor.get(style);
          if (!arr) {
            arr = [];
            byColor.set(style, arr);
          }
          if (arr.length === 0) used.push(style);
          arr.push(((value.vein.y & 0xffff) << 16) | (value.vein.x & 0xffff));
        });
      }

      for (let i = 0; i < used.length; i++) {
        const style = used[i];
        const pts = byColor.get(style) as number[] | undefined;
        if (!pts || pts.length === 0) continue;
        ctx.fillStyle = style;
        for (let j = 0; j < pts.length; j++) {
          const packed: number = pts[j] as number;
          const x = packed & 0xffff;
          const y = (packed >>> 16) & 0xffff;
          const ch = dominant?.[y]?.[x];
          if (!ch) continue;
          ctx.fillText(ch, offsetX + x * charWidth, offsetY + y * charHeight);
        }
        pts.length = 0;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [veinsMapRef, overlayConfigRef, pattern, patternB, patternBlend, width, height, fontSize, fontFamily, fontReadySeq]);

  // Overlay layer: legacy path -> redraw on `veins` prop.
  useEffect(() => {
    if (veinsMapRef) return; // prefer high-perf map loop
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ensureCanvasBackstore(canvas, width, height, dpr);

    // Reset + scale so we draw in CSS px coordinates.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';

    // Layout metrics (prefer base computed metrics to keep layers aligned).
    let charWidth: number;
    let charHeight: number;
    let offsetX: number;
    let offsetY: number;
    const m = metricsRef.current;
    if (m && m.dpr === dpr) {
      charWidth = m.charWidth;
      charHeight = m.charHeight;
      offsetX = m.offsetX;
      offsetY = m.offsetY;
    } else {
      charWidth = ctx.measureText('M').width;
      charHeight = fontSize * 1.05;
      const cols = pattern[0]?.length || 0;
      const rows = pattern.length;
      const totalWidth = cols * charWidth;
      const totalHeight = rows * charHeight;
      offsetX = (width - totalWidth) / 2;
      offsetY = (height - totalHeight) / 2;
      metricsRef.current = { charWidth, charHeight, offsetX, offsetY, dpr };
    }

    // Pick char from current dominant pattern (keeps veins strong during crossfade).
    const b = Math.max(0, Math.min(1, patternBlend));
    const dominant = patternB && b > 0.5 ? patternB : pattern;

    // Group by color to reduce fillStyle churn, but avoid object allocations.
    const byColor = byColorRef.current;
    const usedColors = usedColorsRef.current;
    usedColors.length = 0;

    for (let i = 0; i < (veins?.length ?? 0); i++) {
      const v = veins![i];
      let arr = byColor.get(v.color);
      if (!arr) {
        arr = [];
        byColor.set(v.color, arr);
      }
      if (arr.length === 0) usedColors.push(v.color);
      // pack coords (x,y) into one number to avoid `{x,y}` allocations
      arr.push(((v.y & 0xffff) << 16) | (v.x & 0xffff));
    }

    ctx.globalAlpha = 1;
    for (let c = 0; c < usedColors.length; c++) {
      const color = usedColors[c];
      const pts = byColor.get(color) as number[] | undefined;
      if (!pts || pts.length === 0) continue;
      ctx.fillStyle = color;
      for (let j = 0; j < pts.length; j++) {
        const packed: number = pts[j] as number;
        const x = packed & 0xffff;
        const y = (packed >>> 16) & 0xffff;
        const ch = dominant?.[y]?.[x];
        if (!ch) continue;
        ctx.fillText(ch, offsetX + x * charWidth, offsetY + y * charHeight);
      }
      // reset for next tick but keep array allocated
      pts.length = 0;
    }
    ctx.globalAlpha = 1;
  }, [veins, veinsMapRef, pattern, patternB, patternBlend, width, height, fontSize, fontFamily, fontReadySeq]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={baseCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      />
    <canvas
        ref={overlayCanvasRef}
      width={width}
      height={height}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
    />
    </div>
  );
};

export default AsciiBackgroundCanvas; 