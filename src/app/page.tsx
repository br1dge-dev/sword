/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 * OPTIMIERT: Reduzierte Logs, bessere Performance
 * NEU: AudioControlPanel immer sichtbar, Modal nur für SideButtons
 * NEU: HIDE Button zum Ausblenden des kompletten UI
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { usePowerUpStore } from '@/store/powerUpStore';
import AsciiSword from '@/components/ascii/AsciiSword';
import AudioControlPanel from '@/components/ui/AudioControlPanel';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import BuildBadge from '@/components/ui/BuildBadge';
import { IoMdEye, IoMdEyeOff, IoMdTrophy, IoMdHelpCircle, IoMdFlash } from 'react-icons/io';
import { useShallow } from 'zustand/react/shallow';
import WtfIsThisModal from '@/components/ui/WtfIsThisModal';
import FpsCounter from '@/components/ui/FpsCounter';

const HIGHLIGHT_COLORS = ['#F8E16C', '#FF3EC8', '#3EE6FF'] as const;

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isWtfOpen, setIsWtfOpen] = useState(false);
  const [showFps, setShowFps] = useState(false);
  const [debugXrayEnabled, setDebugXrayEnabled] = useState(false);
  const [debugXray, setDebugXray] = useState<{
    intensity: number;
    score: number;
    onTh: number;
    offTh: number;
    energy: number;
    high: number;
    onset: number;
    active: boolean;
    cooldownMs: number;
  } | null>(null);
  const { energy, beatDetected, setMusicPlaying, swordColor, frequencyData } = useAudioReactionStore(
    useShallow((s) => ({
      energy: s.energy,
      beatDetected: s.beatDetected,
      setMusicPlaying: s.setMusicPlaying,
      swordColor: s.swordColor,
      frequencyData: s.frequencyData,
    })),
  );
  const { invertPowerMode, toggleInvertPowerMode, autoXrayEnabled, toggleAutoXrayEnabled } = usePowerUpStore(
    useShallow((s) => ({
      invertPowerMode: s.invertPowerMode,
      toggleInvertPowerMode: s.toggleInvertPowerMode,
      autoXrayEnabled: s.autoXrayEnabled,
      toggleAutoXrayEnabled: s.toggleAutoXrayEnabled,
    })),
  );
  const swordColorSafe = swordColor ?? '#00FCA6';

  // --- AUTO X-RAY driver (audio-reactive, non-flickery) ---
  const mainRef = useRef<HTMLElement | null>(null);
  const energyRef = useRef<number>(energy);
  const beatRef = useRef<boolean>(beatDetected);
  const freqRef = useRef<Uint8Array | null>(frequencyData ?? null);
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);
  useEffect(() => {
    beatRef.current = beatDetected;
  }, [beatDetected]);
  useEffect(() => {
    freqRef.current = frequencyData ?? null;
  }, [frequencyData]);

  const xrayStateRef = useRef<{
    lastNow: number;
    intensity: number; // 0..1
    active: boolean;
    activeSince: number;
    cooldownUntil: number;
    prevSpectrum: Uint8Array | null;
    // adaptive thresholds
    rb: number[];
    rbIdx: number;
    rbCount: number;
    onTh: number;
    offTh: number;
    lastThreshUpdate: number;
    // debug
    lastScore: number;
    lastHigh: number;
    lastOnset: number;
  }>({
    lastNow: 0,
    intensity: 0,
    active: false,
    activeSince: 0,
    cooldownUntil: 0,
    prevSpectrum: null,
    rb: new Array(120).fill(0),
    rbIdx: 0,
    rbCount: 0,
    onTh: 0.7,
    offTh: 0.5,
    lastThreshUpdate: 0,
    lastScore: 0,
    lastHigh: 0,
    lastOnset: 0,
  });

  // Debug toggle: ?debug=xray
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      setDebugXrayEnabled(url.searchParams.get('debug') === 'xray');
    } catch {
      setDebugXrayEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let raf: number | null = null;
    let cancelled = false;

    // Thresholds will adapt, but these are safe clamps.
    const ON_TH_MIN = 0.55;
    const ON_TH_MAX = 0.92;
    const OFF_TH_MIN = 0.38;
    const OFF_TH_MAX = 0.78;
    const MIN_ON_MS = 2600; // keep on long enough to feel like a “mode”
    const MIN_COOLDOWN_MS = 6000;
    const MAX_COOLDOWN_MS = 10000;
    const ATTACK_MS = 320;
    const RELEASE_MS = 520;
    const TICK_MS = 50; // ~20 FPS logic (no need to run at 60)
    let lastTick = 0;
    let lastDebugSet = 0;

    const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

    const avgBand = (arr: Uint8Array, start: number, end: number) => {
      const s = Math.max(0, Math.min(arr.length, start));
      const e = Math.max(s, Math.min(arr.length, end));
      if (e <= s) return 0;
      let sum = 0;
      for (let i = s; i < e; i++) sum += arr[i];
      return sum / (e - s);
    };

    const onsetFlux = (curr: Uint8Array, prev: Uint8Array | null) => {
      if (!prev || prev.length !== curr.length) return 0;
      let flux = 0;
      for (let i = 0; i < curr.length; i++) {
        const d = curr[i] - prev[i];
        if (d > 0) flux += d;
      }
      // This normalization tends to be very small in practice. Boost it to a usable 0..1 trigger-like signal.
      // Empirically: divide by len*32 ~ gives nicer range for onset on these tracks.
      return clamp01(flux / (curr.length * 32));
    };

    const percentile = (arr: number[], count: number, p01: number) => {
      if (count <= 0) return 0;
      const copy = arr.slice(0, count).sort((a, b) => a - b);
      const idx = Math.max(0, Math.min(copy.length - 1, Math.floor(copy.length * p01)));
      return copy[idx] ?? 0;
    };

    const step = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(step);

      if (now - lastTick < TICK_MS) return;
      lastTick = now;

      const el = mainRef.current;
      if (!el) return;

      // Manual override: full X-RAY.
      if (invertPowerMode) {
        xrayStateRef.current.intensity = 1;
        el.style.setProperty('--xray', '1');
        return;
      }

      // If auto is disabled, fade back to 0 and reset state.
      if (!autoXrayEnabled) {
        const st = xrayStateRef.current;
        const dt = st.lastNow ? now - st.lastNow : 0;
        st.lastNow = now;
        const alpha = 1 - Math.exp(-dt / Math.max(1, RELEASE_MS));
        st.intensity = st.intensity + (0 - st.intensity) * alpha;
        if (st.intensity < 0.001) {
          st.intensity = 0;
          st.active = false;
          st.activeSince = 0;
          st.cooldownUntil = 0;
          st.prevSpectrum = null;
        }
        el.style.setProperty('--xray', st.intensity.toFixed(3));
        return;
      }

      const st = xrayStateRef.current;
      const dt = st.lastNow ? now - st.lastNow : 0;
      st.lastNow = now;

      const e = clamp01(energyRef.current);
      const beat = !!beatRef.current;
      const freq = freqRef.current;

      let hi = 0;
      let onset = 0;
      if (freq && freq.length) {
        const midEnd = Math.floor(freq.length * 0.6);
        hi = avgBand(freq, midEnd, freq.length) / 255;
        onset = onsetFlux(freq, st.prevSpectrum);
        // Important: copy, because analyzer pipelines may mutate/reuse typed arrays.
        st.prevSpectrum = freq.slice();
      } else {
        st.prevSpectrum = null;
      }

      // Overdrive score: onset + highs dominate; energy supports it.
      // This should produce occasional “spikes” on hits without staying high.
      let score = clamp01((0.70 * onset) + (0.45 * hi) + (0.18 * e));
      if (beat) score = clamp01(score + 0.10);

      st.lastScore = score;
      st.lastHigh = hi;
      st.lastOnset = onset;

      // Update ring buffer for adaptive thresholding
      st.rb[st.rbIdx] = score;
      st.rbIdx = (st.rbIdx + 1) % st.rb.length;
      st.rbCount = Math.min(st.rb.length, st.rbCount + 1);

      // Recompute thresholds every ~1s once we have enough samples.
      if (st.rbCount >= 30 && now - st.lastThreshUpdate > 1000) {
        st.lastThreshUpdate = now;
        const p90 = percentile(st.rb, st.rbCount, 0.9);
        const p60 = percentile(st.rb, st.rbCount, 0.6);
        // Keep a minimum gap so hysteresis works.
        const onTh = Math.max(ON_TH_MIN, Math.min(ON_TH_MAX, Math.max(p90, p60 + 0.12)));
        const offTh = Math.max(OFF_TH_MIN, Math.min(OFF_TH_MAX, Math.min(p60, onTh - 0.10)));
        st.onTh = onTh;
        st.offTh = offTh;
      }

      // Hysteresis state machine + cooldown
      if (!st.active) {
        if (now >= st.cooldownUntil && score > st.onTh) {
          // Require a “moment” signal to avoid slow/ambient enabling too often.
          // Onset threshold lowered because our normalized onset is smaller.
          if (beat || onset > 0.08 || hi > 0.22) {
            st.active = true;
            st.activeSince = now;
          }
        }
      } else {
        const onFor = now - st.activeSince;
        if (onFor >= MIN_ON_MS && score < st.offTh) {
          st.active = false;
          const cd = MIN_COOLDOWN_MS + Math.random() * (MAX_COOLDOWN_MS - MIN_COOLDOWN_MS);
          st.cooldownUntil = now + cd;
        }
      }

      const target = st.active ? 1 : 0;
      const tau = target > st.intensity ? ATTACK_MS : RELEASE_MS;
      const alpha = 1 - Math.exp(-dt / Math.max(1, tau));
      st.intensity = st.intensity + (target - st.intensity) * alpha;

      el.style.setProperty('--xray', st.intensity.toFixed(3));

      if (debugXrayEnabled && now - lastDebugSet > 250) {
        lastDebugSet = now;
        setDebugXray({
          intensity: st.intensity,
          score: st.lastScore,
          onTh: st.onTh,
          offTh: st.offTh,
          energy: e,
          high: st.lastHigh,
          onset: st.lastOnset,
          active: st.active,
          cooldownMs: Math.max(0, st.cooldownUntil - now),
        });
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isClient, invertPowerMode, autoXrayEnabled, debugXrayEnabled]);
  
  // Für den Titel: Random Highlight
  const leaderboardTitle = 'L3ADERBOARD';
  const [highlightIdx, setHighlightIdx] = useState(() => Math.floor(Math.random() * leaderboardTitle.length));
  const [highlightColor, setHighlightColor] = useState(
    () => HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)],
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightIdx(Math.floor(Math.random() * leaderboardTitle.length));
      setHighlightColor(HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);
  
  // OPTIMIERT: Throttled Logging für bessere Performance
  // const lastLogTimeRef = useRef<number>(0);
  // const lastEnergyRef = useRef(energy);
  
  // OPTIMIERT: Log-Throttling für bessere Performance
  // const logThrottleInterval = 1000; // 1 Sekunde zwischen Logs

  // DEAKTIVIERT: Logging-Funktion
  // const throttledLog = (message: string, force: boolean = false) => {
  //   const now = Date.now();
  //   if (force || now - lastLogTimeRef.current > logThrottleInterval) {
  //     console.log(`[HomePage] ${message}`);
  //     lastLogTimeRef.current = now;
  //   }
  // };
  
  // Client-Side Rendering aktivieren
  useEffect(() => {
    setIsClient(true);
    
    // Musik als nicht spielend markieren, damit Idle aktiviert wird
    setMusicPlaying(false);
    
    // throttledLog('HomePage mounted', true);
    
    return () => {
      // throttledLog('HomePage unmounted', true);
      // KEIN Cleanup beim Unmount, da die Idle-Animation im Layout läuft
    };
  }, [setMusicPlaying]);

  // Persist FPS toggle (dev-friendly)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.localStorage.getItem('griftsword_show_fps');
      setShowFps(v === '1');
    } catch {
      // ignore
    }
  }, []);

  const toggleFps = () => {
    setShowFps((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('griftsword_show_fps', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // IMPORTANT: Only render ONE audio UI at a time (desktop OR mobile).
  // With multiple AudioControlPanels mounted, the global analyzer can attach to the wrong <audio> element,
  // causing “music plays but sword stays idle”.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 640px)'); // Tailwind `sm`
    const update = () => setIsDesktop(!!mql.matches);
    update();
    try {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    } catch {
      // Safari fallback
      (mql as any).addListener(update);
      return () => (mql as any).removeListener(update);
    }
  }, []);
  
  // OPTIMIERT: Reduzierte Energie- und Beat-Logs
  useEffect(() => {
    const now = Date.now();
    // const timeSinceLastLog = now - lastLogTimeRef.current;
    
    // OPTIMIERT: Log nur alle 10 Sekunden oder bei signifikanten Änderungen (erhöht von 5s auf 10s)
    // if (timeSinceLastLog > 10000 || Math.abs(energy - lastEnergyRef.current) > 0.5 || beatDetected) { // Erhöht von 0.3 auf 0.5
      // throttledLog(`Energy: ${energy.toFixed(2)}, Beat: ${beatDetected}`);
      // lastEnergyRef.current = energy;
    // }
  }, [energy, beatDetected]);
  
  // Handle beat detection
  const handleBeat = () => {
    // Aktualisiere den Audio-Reaction-Store direkt
    const { triggerBeat } = useAudioReactionStore.getState();
    triggerBeat();
  };
  
  // Handle energy changes
  const handleEnergyChange = (energy: number) => {
    // Aktualisiere den Audio-Reaction-Store direkt
    const { updateEnergy, setAudioActive } = useAudioReactionStore.getState();
    updateEnergy(energy);
    setAudioActive(true);
  };

  // Pseudo-Leaderboard Daten
  const leaderboardData = [
    { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', points: 2847, rank: 1 },
    { address: '0x8ba1f109551bD432803012645Hac136c772c3c3', points: 2156, rank: 2 },
    { address: '0x1234567890abcdef1234567890abcdef12345678', points: 1892, rank: 3 },
    { address: '0xabcdef1234567890abcdef1234567890abcdef12', points: 1456, rank: 4 },
    { address: '0x9876543210fedcba9876543210fedcba98765432', points: 1234, rank: 5 },
    { address: '0xfedcba0987654321fedcba0987654321fedcba09', points: 987, rank: 6 },
    { address: '0x1111111111111111111111111111111111111111', points: 756, rank: 7 },
    { address: '0x2222222222222222222222222222222222222222', points: 543, rank: 8 },
    { address: '0x3333333333333333333333333333333333333333', points: 321, rank: 9 },
    { address: '0x4444444444444444444444444444444444444444', points: 123, rank: 10 },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-grifter-green';
      case 2: return 'text-grifter-pink';
      case 3: return 'text-grifter-blue';
      default: return 'text-grifter-blue';
    }
  };

  return (
    <main
      ref={mainRef}
      className="xray-power flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden"
    >
      <BuildBadge />
      {isClient && showFps ? <FpsCounter /> : null}
      {isClient && debugXrayEnabled ? (
        <div
          className="fixed top-2 right-2 z-[9999] rounded border border-grifter-blue bg-black/80 px-3 py-2 text-[10px] text-grifter-blue ui-caps"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <div className="font-bold">X-RAY DEBUG</div>
          <div>auto: {autoXrayEnabled ? 'on' : 'off'}</div>
          <div>manual: {invertPowerMode ? 'on' : 'off'}</div>
          <div>active: {debugXray?.active ? 'yes' : 'no'}</div>
          <div>int: {(debugXray?.intensity ?? 0).toFixed(2)}</div>
          <div>score: {(debugXray?.score ?? 0).toFixed(2)}</div>
          <div>on/off: {(debugXray?.onTh ?? 0).toFixed(2)} / {(debugXray?.offTh ?? 0).toFixed(2)}</div>
          <div>e/hi/onset: {(debugXray?.energy ?? 0).toFixed(2)} / {(debugXray?.high ?? 0).toFixed(2)} / {(debugXray?.onset ?? 0).toFixed(2)}</div>
          <div>cd: {Math.round((debugXray?.cooldownMs ?? 0) / 1000)}s</div>
        </div>
      ) : null}
      <div className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
        isModalOpen || isLeaderboardOpen ? 'backdrop-blur-modal' : ''
      }`}>
        {/* Hauptbereich mit dem ASCII-Schwert */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AsciiSword 
            level={baseSwordLevel} 
            directEnergy={energy} 
            directBeat={beatDetected} 
          />
        </div>
        
        {/* AudioControlPanel: Desktop only. Mobile lives behind the gear overlay so the sword stays the hero. */}
        {isClient && isDesktop && (
          <div className={`absolute z-10 sm:top-1/2 sm:left-[75vw] sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 transition-opacity duration-300 ${
            isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="scale-125 origin-center ui-caps">
              <AudioControlPanel 
                onBeat={handleBeat} 
                onEnergyChange={handleEnergyChange} 
              />
            </div>
          </div>
        )}
        
        {/* SideButtons - Desktop: links, Mobile: im Modal */}
        {isClient && isDesktop && (
          <div className={`absolute top-1/2 left-[25vw] transform -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${
            isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="scale-125 origin-center ui-caps">
              <SideButtons />
            </div>
          </div>
        )}
        
        {/* Mobile Steuerelemente - Gear overlay for all controls */}
        {isClient && !isDesktop && (
          <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
            isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <MobileControlsOverlay 
              isOpen={isModalOpen}
              onToggle={(open: boolean) => setIsModalOpen(open)}
              onBeat={handleBeat}
              onEnergyChange={handleEnergyChange}
              onToggleUI={() => setIsUIVisible((v) => !v)}
              onOpenWtf={() => setIsWtfOpen(true)}
              onToggleLeaderboard={() => setIsLeaderboardOpen((v) => !v)}
              isUIVisible={isUIVisible}
              isFpsEnabled={showFps}
              onToggleFps={toggleFps}
            />
          </div>
        )}

        {/* Bottom Buttons - HIDE, Config, Leaderboard */}
        {isClient && isDesktop && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-4 sm:gap-4 w-auto sm:w-auto px-2 sm:px-0 ui-caps">
          {/* POWER (invert) */}
          <button
            onClick={toggleInvertPowerMode}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: invertPowerMode
                ? '0 0 22px rgba(255, 255, 255, 0.85)'
                : '0 0 16px rgba(62, 230, 255, 0.75)',
            }}
            aria-label="Power (invert)"
            title="POWER"
          >
            <IoMdFlash className={`${invertPowerMode ? 'text-black' : 'text-grifter-blue'} text-3xl`} />
          </button>

          {/* AUTO X-RAY */}
          <button
            onClick={toggleAutoXrayEnabled}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: autoXrayEnabled ? '0 0 22px rgba(62, 230, 255, 0.95)' : '0 0 16px rgba(62, 230, 255, 0.55)',
            }}
            aria-label="Auto X-ray"
            title="AUTO"
          >
            <span className="text-grifter-blue text-[10px] font-press-start-2p">AUTO</span>
          </button>

          {/* HIDE Button */}
          <button
            onClick={() => setIsUIVisible(!isUIVisible)}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 16px rgba(62, 230, 255, 0.75)',
            }}
          >
            {isUIVisible ? (
              <IoMdEyeOff className="text-grifter-blue text-3xl" />
            ) : (
              <IoMdEye className="text-grifter-blue text-3xl" />
            )}
          </button>

          {/* WTF is this? */}
          <button
            onClick={() => setIsWtfOpen(true)}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 16px rgba(62, 230, 255, 0.75)',
            }}
            aria-label="WTF is this?"
          >
            <IoMdHelpCircle className="text-grifter-blue text-3xl" />
          </button>

          {/* FPS */}
          <button
            onClick={toggleFps}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: showFps ? '0 0 22px rgba(62, 230, 255, 0.95)' : '0 0 16px rgba(62, 230, 255, 0.55)',
            }}
            aria-label="Toggle FPS counter"
            title="FPS"
          >
            <span className="text-grifter-blue text-[12px] font-press-start-2p">FPS</span>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
            className="w-[3.75rem] h-[3.75rem] flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 16px rgba(62, 230, 255, 0.75)',
            }}
          >
            <IoMdTrophy className="text-grifter-blue text-3xl" />
          </button>
        </div>
        )}

        <WtfIsThisModal open={isWtfOpen} onClose={() => setIsWtfOpen(false)} />

        {/* Leaderboard Modal */}
        {isLeaderboardOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-90 backdrop-blur-modal flex items-center justify-center p-4">
            <div className="bg-black border border-grifter-blue rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative leaderboard-scrollbar">
              {/* X-Button oben rechts */}
              <button
                onClick={() => setIsLeaderboardOpen(false)}
                className="absolute top-3 right-3 text-grifter-blue text-xl font-bold hover:text-pink-400 transition-colors"
                aria-label="Schließen"
                style={{ zIndex: 10 }}
              >
                ×
              </button>
              <div className="text-center mb-6">
                {/* Titel wie Track-Title */}
                <h2 className="text-2xl font-press-start-2p mb-2 select-none" style={{ color: swordColorSafe, letterSpacing: '0.05em' }}>
                  {leaderboardTitle.split('').map((char, i) => (
                    <span key={i} style={i === highlightIdx ? { color: highlightColor } : {}}>{char}</span>
                  ))}
                </h2>
              </div>
              
              <div className="space-y-3">
                {leaderboardData.map((entry) => {
                  let rankClass = '';
                  let numberColor = '';
                  let pointsColor = '';
                  let addressColor = '';
                  let unitColor = '';
                  if (entry.rank === 1) {
                    rankClass = 'leaderboard-rank-1';
                    numberColor = 'text-[#00FCA6]';
                    pointsColor = 'text-[#00FCA6]';
                    addressColor = 'text-[#00FCA6]';
                    unitColor = '';
                  } else if (entry.rank === 2) {
                    rankClass = 'leaderboard-rank-2';
                    numberColor = 'text-[#F8E16C]';
                    pointsColor = 'text-[#F8E16C]';
                    addressColor = 'text-[#F8E16C]';
                    unitColor = '';
                  } else if (entry.rank === 3) {
                    rankClass = 'leaderboard-rank-3';
                    numberColor = 'text-[#FF3EC8]';
                    pointsColor = 'text-[#FF3EC8]';
                    addressColor = 'text-[#FF3EC8]';
                    unitColor = '';
                  } else {
                    numberColor = 'text-[#3EE6FF]';
                    pointsColor = 'text-[#3EE6FF]';
                    addressColor = 'text-[#3EE6FF]';
                    unitColor = 'text-[#3EE6FF]';
                  }
                  return (
                    <div
                      key={entry.address}
                      className={`flex items-center justify-between p-3 rounded ${rankClass || 'border border-grifter-blue'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-xs font-press-start-2p flex items-center ${numberColor}`}>
                          #{entry.rank}
                        </div>
                        <div className={`font-mono text-xs ${addressColor}`}>
                          {formatAddress(entry.address)}
                        </div>
                      </div>
                      <div className="leaderboard-points">
                        <span className={`text-xs font-press-start-2p ${pointsColor}`}>{entry.points}</span>
                        <span className={`leaderboard-points-unit ${unitColor}`}>͆</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLeaderboardOpen(false)}
                  className="px-4 py-2 bg-grifter-blue text-black font-press-start-2p text-xs rounded border border-grifter-blue hover:bg-transparent hover:text-grifter-blue transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </main>
  );
} 