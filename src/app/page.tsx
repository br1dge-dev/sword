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
import { ClaimRewardButton } from '@/components/ui/ClaimRewardButton';
import { IoMdEye, IoMdEyeOff, IoMdTrophy, IoMdHelpCircle } from 'react-icons/io';
import { useShallow } from 'zustand/react/shallow';
import WtfIsThisModal from '@/components/ui/WtfIsThisModal';
import { HitIndicator } from '@/components/ui/HitIndicator';
import { useEdgeLeaderboard, formatEdgeBalance, formatAddress } from '@/hooks/useEdgeLeaderboard';

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
    hitMap,
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
      hitMap: s.hitMap,
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

  // $EDGE Leaderboard from contract
  const { leaderboard: edgeLeaderboard, isLoading: isLeaderboardLoading } = useEdgeLeaderboard();

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

        {/* Wallet Connect Button - top left (avoids collision with challenge UI) */}
        {isClient && (
          <div className="fixed top-4 left-4 z-[1000]">
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
                {isLeaderboardLoading ? (
                  <div className="text-center text-grifter-blue font-mono text-sm py-8">
                    Loading $EDGE holders...
                  </div>
                ) : edgeLeaderboard.length === 0 ? (
                  <div className="text-center text-gray-500 font-mono text-sm py-8">
                    No $EDGE holders yet.<br />
                    <span className="text-xs">Be the first to claim!</span>
                  </div>
                ) : (
                  edgeLeaderboard.map((entry) => {
                    let rankClass = '';
                    let numberColor = '';
                    let pointsColor = '';
                    let addressColor = '';
                    if (entry.rank === 1) {
                      rankClass = 'leaderboard-rank-1';
                      numberColor = 'text-[#00FCA6]';
                      pointsColor = 'text-[#00FCA6]';
                      addressColor = 'text-[#00FCA6]';
                    } else if (entry.rank === 2) {
                      rankClass = 'leaderboard-rank-2';
                      numberColor = 'text-[#F8E16C]';
                      pointsColor = 'text-[#F8E16C]';
                      addressColor = 'text-[#F8E16C]';
                    } else if (entry.rank === 3) {
                      rankClass = 'leaderboard-rank-3';
                      numberColor = 'text-[#FF3EC8]';
                      pointsColor = 'text-[#FF3EC8]';
                      addressColor = 'text-[#FF3EC8]';
                    } else {
                      numberColor = 'text-[#3EE6FF]';
                      pointsColor = 'text-[#3EE6FF]';
                      addressColor = 'text-[#3EE6FF]';
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
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-press-start-2p ${pointsColor}`}>
                            {formatEdgeBalance(entry.balance)}
                          </span>
                          <span className={`text-[10px] font-mono ${pointsColor} opacity-70`}>
                            $EDGE
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
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