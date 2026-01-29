/**
 * HomePage - Hauptseite der SWORD-App
 *
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 * OPTIMIERT: Reduzierte Logs, bessere Performance
 * NEU: AudioControlPanel mit Challenge Mode
 * NEU: HIDE Button zum Ausblenden des kompletten UI
 * NEU: SideButtons mit Progress-Bars (ohne manuelle Buttons)
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useChallengeStore } from '@/store/challengeStore';
import AsciiSword from '@/components/ascii/AsciiSword';
import AudioControlPanel from '@/components/ui/AudioControlPanel';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import BuildBadge from '@/components/ui/BuildBadge';
import WalletConnectButton from '@/components/ui/WalletConnectButton';
import { IoMdEye, IoMdEyeOff, IoMdTrophy, IoMdHelpCircle } from 'react-icons/io';
import { useShallow } from 'zustand/react/shallow';
import WtfIsThisModal from '@/components/ui/WtfIsThisModal';
import { HitIndicator } from '@/components/ui/HitIndicator';

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
  const { energy, beatDetected, setMusicPlaying, swordColor } = useAudioReactionStore(
    useShallow((s) => ({
      energy: s.energy,
      beatDetected: s.beatDetected,
      setMusicPlaying: s.setMusicPlaying,
      swordColor: s.swordColor,
    })),
  );
  // keep store import to preserve future usage patterns; currently no X-RAY / POWER modes
  usePowerUpStore(useShallow(() => ({})));
  const swordColorSafe = swordColor ?? '#00FCA6';

  // Challenge state from shared store
  const {
    mode: challengeMode,
    phase: challengePhase,
    accuracy: challengeScore,
    timeLeft,
    hits: challengeHits,
    getUpcomingBeats,
    setMode,
    setPhase,
    resetChallenge,
  } = useChallengeStore(
    useShallow((s) => ({
      mode: s.mode,
      phase: s.phase,
      accuracy: s.accuracy,
      timeLeft: s.timeLeft,
      hits: s.hits,
      getUpcomingBeats: s.getUpcomingBeats,
      setMode: s.setMode,
      setPhase: s.setPhase,
      resetChallenge: s.resetChallenge,
    })),
  );

  const isChallengeActive = challengeMode === 'challenge' && challengePhase === 'active';
  const challengeEnded = challengePhase === 'results';

  const [lastHitResult, setLastHitResult] = useState<{ hit: boolean; delta: number } | null>(null);

  // Auto-show UI when challenge starts
  useEffect(() => {
    if (isChallengeActive) {
      setIsUIVisible(true);
    }
  }, [isChallengeActive]);

  // Update upcoming beats at 60fps when challenge is active
  // Uses global variable instead of React state to avoid re-renders
  useEffect(() => {
    if (!isChallengeActive) {
      (window as any).upcomingBeats = [];
      return;
    }

    let rafId: number;
    const updateBeats = () => {
      const beats = getUpcomingBeats(2000);
      (window as any).upcomingBeats = beats;
      rafId = requestAnimationFrame(updateBeats);
    };
    rafId = requestAnimationFrame(updateBeats);

    return () => {
      cancelAnimationFrame(rafId);
      (window as any).upcomingBeats = [];
    };
  }, [isChallengeActive, getUpcomingBeats]);

  // Handle hit from indicator - sync with shared store
  const handleChallengeHit = useCallback(() => {
    // The actual hit handling is done by AudioControlPanel's global click handler
    // This is just for visual feedback
    setLastHitResult({ hit: true, delta: 0 });
    setTimeout(() => setLastHitResult(null), 200);
  }, []);
  
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
    <main className="flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden">
      <BuildBadge />
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
        
        {/* Hit Indicator - nur wenn Challenge aktiv */}
        {isClient && isChallengeActive && (
          <HitIndicator
            isActive={isChallengeActive}
            onHit={handleChallengeHit}
            lastHitResult={lastHitResult}
          />
        )}

        {/* Challenge Mode Indicator - shows when challenge mode is active */}
        {isClient && challengeMode === 'challenge' && !isChallengeActive && challengePhase !== 'idle' && (
          <div className="fixed top-4 left-4 z-30 bg-black/80 border border-grifter-green rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="text-xs font-mono text-grifter-green/60">CHALLENGE</div>
            <div className="text-sm font-press-start-2p text-grifter-green">{challengePhase.toUpperCase()}</div>
          </div>
        )}

        {/* Wallet Connect Button - top left */}
        {isClient && (
          <div className="fixed top-4 left-4 z-30">
            <WalletConnectButton />
          </div>
        )}
        
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

        {/* SideButtons - Desktop: left side */}
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
            />
          </div>
        )}

        {/* Challenge Score Display - top right when active */}
        {isClient && isChallengeActive && (
          <div className="fixed top-4 right-4 z-30 flex flex-col items-end gap-2">
            <div className="bg-black/80 border border-grifter-green rounded-lg px-4 py-2 backdrop-blur-sm">
              <div className="text-xs font-mono text-grifter-green/60 mb-1">SCORE</div>
              <div className="text-2xl font-press-start-2p text-grifter-green">{challengeScore.toFixed(0)}%</div>
            </div>
            <div className="bg-black/80 border border-grifter-green rounded-lg px-4 py-2 backdrop-blur-sm">
              <div className="text-xs font-mono text-grifter-green/60 mb-1">TIME</div>
              <div className="text-lg font-mono text-grifter-green">{timeLeft.toFixed(0)}s</div>
            </div>

            <button
              onClick={() => {
                setMode('music');
                resetChallenge();
              }}
              className="px-3 py-1 text-xs font-mono bg-black border border-grifter-pink text-grifter-pink rounded hover:bg-grifter-pink hover:text-black transition-colors"
            >
              STOP
            </button>
          </div>
        )}

        {/* Challenge Result - shown when challenge ended */}
        {isClient && challengeEnded && (
          <div className="fixed top-4 right-4 z-30 flex flex-col items-end gap-2">
            <div className="bg-black/80 border border-grifter-green rounded-lg px-4 py-2 backdrop-blur-sm">
              <div className="text-xs font-mono text-grifter-green/60 mb-1">FINAL SCORE</div>
              <div className="text-2xl font-press-start-2p text-grifter-green">{challengeScore.toFixed(0)}%</div>
            </div>
            <div className="bg-black/80 border border-grifter-green/50 rounded-lg px-4 py-1 backdrop-blur-sm">
              <div className="text-[10px] font-mono text-grifter-green/40">HITS: {challengeHits.filter(h => h.hit).length}/{challengeHits.length}</div>
            </div>
            <button
              onClick={() => {
                setMode('challenge');
                setPhase('idle');
              }}
              className="px-3 py-1 text-xs font-mono bg-black border border-grifter-green text-grifter-green rounded hover:bg-grifter-green hover:text-black transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Bottom Buttons - HIDE, Config, Leaderboard */}
        {isClient && isDesktop && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-4 sm:gap-4 w-auto sm:w-auto px-2 sm:px-0 ui-caps">
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