"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  /**
   * Optional label shown next to FPS.
   */
  label?: string;
};

export default function FpsCounter({ label = "FPS" }: Props) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const framesRef = useRef<number>(0);
  const lastReportRef = useRef<number>(0);

  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (!lastRef.current) lastRef.current = now;

      framesRef.current += 1;

      const dt = now - lastRef.current;
      // Report about 4x/sec to avoid re-render spam
      if (dt >= 1000) {
        const currentFps = (framesRef.current * 1000) / dt;
        framesRef.current = 0;
        lastRef.current = now;

        // Extra throttle to avoid tiny fluctuations causing excessive paints
        if (now - lastReportRef.current > 240) {
          lastReportRef.current = now;
          setFps(Math.round(currentFps));
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="fixed top-2 left-2 z-[9999] rounded border border-grifter-blue bg-black/80 px-3 py-2 text-[10px] text-grifter-blue ui-caps"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="font-bold">{label}</div>
      <div>{fps}</div>
    </div>
  );
}


