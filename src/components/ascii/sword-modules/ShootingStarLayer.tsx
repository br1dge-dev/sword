"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  width: number;
  height: number;
  enabled: boolean;
};

const GRIFTER_COLORS = ["#00FCA6", "#FF3EC8", "#3EE6FF", "#F8E16C"];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

type StarState = {
  angleRad: number;
  // movement along a perpendicular axis, from -1.2..+1.2 viewport lengths
  startT: number;
  durationMs: number;
  thicknessPx: number;
  colorA: string;
  colorB: string;
};

function spawnStar(now: number): StarState {
  const angleRad = (Math.random() * Math.PI * 0.9) + Math.PI * 0.05; // avoid perfectly flat/vertical
  const durationMs = 450 + Math.random() * 420; // “sehr zügig”
  const thicknessPx = 10 + Math.random() * 10; // “handbreit, vllt weniger”
  const colorA = pick(GRIFTER_COLORS);
  let colorB = pick(GRIFTER_COLORS);
  if (colorB === colorA) colorB = pick(GRIFTER_COLORS);
  return { angleRad, startT: now, durationMs, thicknessPx, colorA, colorB };
}

export default function ShootingStarLayer({ width, height, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<StarState | null>(null);
  const nextSpawnAtRef = useRef<number>(0);

  const dpr = useMemo(() => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const frame = (nowMs: number) => {
      if (cancelled) return;

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      if (enabled) {
        // Spawn schedule
        if (!stateRef.current && nowMs >= nextSpawnAtRef.current) {
          stateRef.current = spawnStar(nowMs);
          nextSpawnAtRef.current = nowMs + 600 + Math.random() * 1100; // random gaps
        }

        const s = stateRef.current;
        if (s) {
          const t = clamp01((nowMs - s.startT) / s.durationMs);
          if (t >= 1) {
            stateRef.current = null;
          } else {
            // Draw a rotated thin band sweeping across the screen.
            const cx = width / 2;
            const cy = height / 2;

            // Movement along perpendicular direction (band “slides” across)
            const perpAngle = s.angleRad + Math.PI / 2;
            const travel = Math.hypot(width, height) * 1.35;
            const offset = (t * 2 - 1) * travel; // -travel..+travel
            const ox = Math.cos(perpAngle) * offset;
            const oy = Math.sin(perpAngle) * offset;

            ctx.save();
            ctx.translate(cx + ox, cy + oy);
            ctx.rotate(s.angleRad);

            // Screen blend for neon “tube” feel
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.85;

            const bandLen = travel * 2;
            const halfLen = bandLen / 2;
            const halfTh = s.thicknessPx / 2;

            // Gradient across thickness for crisp center + soft edges
            const grad = ctx.createLinearGradient(0, -halfTh, 0, halfTh);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.25, `${s.colorA}AA`);
            grad.addColorStop(0.5, `${s.colorB}FF`);
            grad.addColorStop(0.75, `${s.colorA}AA`);
            grad.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = grad;
            ctx.shadowColor = s.colorB;
            ctx.shadowBlur = 16;

            ctx.fillRect(-halfLen, -halfTh, bandLen, s.thicknessPx);

            // Extra bright core
            ctx.globalAlpha = 0.55;
            ctx.shadowBlur = 28;
            ctx.fillStyle = `${s.colorB}CC`;
            ctx.fillRect(-halfLen, -1.5, bandLen, 3);

            ctx.restore();
            ctx.globalCompositeOperation = "source-over";
          }
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [width, height, enabled, dpr]);

  // Keep the DOM stable; canvas draws only when enabled.
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        imageRendering: "pixelated",
      }}
    />
  );
}


