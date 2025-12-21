"use client";

import React, { useMemo, useState } from "react";

type ChoreoTrackV1 = {
  version: 1;
  trackName: string;
  src: string;
  createdAtIso: string;
  hopSec: number;
  windowSec: number;
  frames: number;
  energy: number[];
  bass: number[];
  onset: number[];
  beat: number[];
  meta?: Record<string, any>;
};

function clamp01(v: number) {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const i = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[i];
}

export default function ChoreoToolPage() {
  const trackName = "DR4GONSWORD";
  const src = "/music/DR4GONSWORD.mp3";
  const outName = "DR4GONSWORD.v1.json";

  const [status, setStatus] = useState<string>("Idle");
  const [progress, setProgress] = useState<number>(0);
  const [jsonText, setJsonText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => typeof window !== "undefined" && !!(window.AudioContext || (window as any).webkitAudioContext), []);

  const download = (text: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    setError(null);
    setJsonText("");
    if (!canGenerate) {
      setError("WebAudio not available in this browser.");
      return;
    }

    setStatus("Fetching MP3…");
    setProgress(0.02);
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch ${src} (HTTP ${res.status})`);
    const buf = await res.arrayBuffer();

    setStatus("Decoding…");
    setProgress(0.08);
    const AC: any = window.AudioContext || (window as any).webkitAudioContext;
    const ac = new AC();
    const audioBuf: AudioBuffer = await ac.decodeAudioData(buf.slice(0));
    const sr = audioBuf.sampleRate;
    const ch = audioBuf.numberOfChannels;

    // Mixdown to mono
    setStatus("Analyzing…");
    setProgress(0.12);
    const len = audioBuf.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < ch; c++) {
      const data = audioBuf.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += data[i] / ch;
    }

    // Simple one-pole lowpass for bass proxy (~160Hz)
    const cutoffHz = 160;
    const dt = 1 / sr;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const alpha = dt / (rc + dt);
    const bass = new Float32Array(len);
    let y = 0;
    for (let i = 0; i < len; i++) {
      y = y + alpha * (mono[i] - y);
      bass[i] = y;
    }

    // Windowed RMS
    const windowSize = 2048;
    const hop = 1024;
    const hopSec = hop / sr;
    const windowSec = windowSize / sr;
    const frames = Math.max(0, Math.floor((len - windowSize) / hop));

    const energyArr: number[] = new Array(frames);
    const bassArr: number[] = new Array(frames);
    const onsetArr: number[] = new Array(frames);

    let prevE = 0;
    let prevB = 0;
    for (let f = 0; f < frames; f++) {
      const start = f * hop;
      let eSum = 0;
      let bSum = 0;
      for (let i = 0; i < windowSize; i++) {
        const s = mono[start + i];
        const b = bass[start + i];
        eSum += s * s;
        bSum += b * b;
      }
      const e = Math.sqrt(eSum / windowSize);
      const b = Math.sqrt(bSum / windowSize);
      energyArr[f] = e;
      bassArr[f] = b;
      onsetArr[f] = Math.max(0, e - prevE);
      prevE = e;
      prevB = b;
      if (f % 200 === 0) setProgress(0.12 + (f / frames) * 0.75);
    }

    // Normalize to 0..1 via robust quantiles (avoid a single huge peak dominating)
    const eSorted = [...energyArr].sort((a, b) => a - b);
    const bSorted = [...bassArr].sort((a, b) => a - b);
    const oSorted = [...onsetArr].sort((a, b) => a - b);
    const eQ95 = Math.max(1e-6, quantile(eSorted, 0.95));
    const bQ95 = Math.max(1e-6, quantile(bSorted, 0.95));
    const oQ95 = Math.max(1e-6, quantile(oSorted, 0.95));

    const energy01 = energyArr.map((v) => clamp01(v / eQ95));
    const bass01 = bassArr.map((v) => clamp01(v / bQ95));
    const onset01 = onsetArr.map((v) => clamp01(v / oQ95));

    // Beat: kick-like bass transient with adaptive threshold
    const bassDelta: number[] = new Array(frames);
    let prev = bass01[0] ?? 0;
    for (let i = 0; i < frames; i++) {
      const v = bass01[i] ?? 0;
      bassDelta[i] = v - prev;
      prev = v;
    }
    const dSorted = [...bassDelta].sort((a, b) => a - b);
    const dQ98 = quantile(dSorted, 0.98);
    const deltaGate = Math.max(0.03, dQ98);
    const ampGate = Math.max(0.12, quantile(bSorted.map((v) => clamp01(v / bQ95)), 0.75));

    const beat: number[] = new Array(frames).fill(0);
    let lastBeatF = -9999;
    const minGapFrames = Math.round(0.75 / hopSec); // ~0.75s
    for (let i = 0; i < frames; i++) {
      if (i - lastBeatF < minGapFrames) continue;
      const b = bass01[i] ?? 0;
      const d = bassDelta[i] ?? 0;
      if (b > ampGate && d > deltaGate) {
        beat[i] = 1;
        lastBeatF = i;
      }
    }

    const out: ChoreoTrackV1 = {
      version: 1,
      trackName,
      src,
      createdAtIso: new Date().toISOString(),
      hopSec,
      windowSec,
      frames,
      energy: energy01,
      bass: bass01,
      onset: onset01,
      beat,
      meta: {
        algo: "mono+rms+onepoleLowpass(bass)+bassDeltaBeats",
        sr,
        windowSize,
        hop,
        gates: { deltaGate, ampGate, minGapSec: minGapFrames * hopSec },
      },
    };

    setStatus("Done");
    setProgress(1);
    const text = JSON.stringify(out);
    setJsonText(text);
    download(text);
  };

  return (
    <main className="min-h-screen p-6 text-grifter-blue ui-caps">
      <div className="mx-auto w-full max-w-3xl rounded border border-grifter-blue bg-black/60 p-5" style={{ backdropFilter: "blur(6px)" }}>
        <div className="mb-2 text-lg font-bold">CHOREO GENERATOR</div>
        <div className="mb-4 text-sm opacity-80">
          Generates a deterministic JSON “caption” for <span className="font-bold">{trackName}</span> and downloads it. Save it to{" "}
          <code className="rounded bg-black/70 px-1 py-[2px]">public/choreo/{outName}</code>.
        </div>
        <div className="mb-3 text-xs opacity-80">Source: <code>{src}</code></div>
        {!canGenerate && <div className="mb-3 text-red-400">WebAudio unavailable.</div>}
        {error && <div className="mb-3 text-red-400">{error}</div>}
        <div className="mb-3 flex items-center gap-3">
          <button
            className="rounded border border-grifter-blue bg-black px-3 py-2 text-sm hover:bg-black/80"
            onClick={() => generate().catch((e) => setError(String(e)))}
            disabled={!canGenerate}
          >
            GENERATE + DOWNLOAD JSON
          </button>
          <div className="text-xs opacity-80">{status}</div>
        </div>
        <div className="mb-4 h-2 w-full overflow-hidden rounded bg-black/70">
          <div className="h-full bg-grifter-blue" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        {jsonText && (
          <details>
            <summary className="cursor-pointer text-sm">SHOW JSON (LARGE)</summary>
            <textarea className="mt-2 h-64 w-full rounded bg-black/80 p-2 text-[10px] font-mono text-grifter-blue" readOnly value={jsonText} />
          </details>
        )}
      </div>
    </main>
  );
}


