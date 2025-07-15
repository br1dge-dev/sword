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
import AsciiSword from '@/components/ascii/AsciiSword';
import AudioControlPanel from '@/components/ui/AudioControlPanel';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import { IoMdEye, IoMdEyeOff, IoMdTrophy, IoMdBulb } from 'react-icons/io';

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isWtfModalOpen, setIsWtfModalOpen] = useState(false);
  const { energy, beatDetected, setMusicPlaying, swordColor = '#00FCA6' } = useAudioReactionStore();
  
  // Für den Titel: Random Highlight
  const leaderboardTitle = 'L3ADERBOARD';
  const highlightColors = ['#F8E16C', '#FF3EC8', '#3EE6FF'];
  const [highlightIdx, setHighlightIdx] = useState(Math.floor(Math.random() * leaderboardTitle.length));
  const [highlightColor, setHighlightColor] = useState(highlightColors[Math.floor(Math.random() * highlightColors.length)]);
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightIdx(Math.floor(Math.random() * leaderboardTitle.length));
      setHighlightColor(highlightColors[Math.floor(Math.random() * highlightColors.length)]);
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
      <div className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
        isModalOpen || isLeaderboardOpen || isWtfModalOpen ? 'backdrop-blur-modal' : ''
      }`}>
        {/* Hauptbereich mit dem ASCII-Schwert */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AsciiSword 
            level={baseSwordLevel} 
            directEnergy={energy} 
            directBeat={beatDetected} 
          />
        </div>
        
        {/* NEU: AudioControlPanel immer sichtbar - Desktop: rechts, Mobile: oben */}
        <div className={`absolute z-10 sm:top-1/2 sm:left-[75vw] sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 top-4 left-1/2 -translate-x-1/2 sm:bottom-auto transition-opacity duration-300 ${
          isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <AudioControlPanel 
            onBeat={handleBeat} 
            onEnergyChange={handleEnergyChange} 
          />
        </div>
        
        {/* SideButtons - Desktop: links, Mobile: im Modal */}
        <div className={`hidden sm:flex absolute top-1/2 left-[25vw] transform -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${
          isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <SideButtons />
        </div>
        
        {/* Mobile Steuerelemente - nur noch für SideButtons */}
        <div className={`sm:hidden absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <MobileControlsOverlay 
            isOpen={isModalOpen}
            onToggle={(open: boolean) => setIsModalOpen(open)}
          />
        </div>



        {/* Bottom Buttons - HIDE, Config, Leaderboard, WTF */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-4 sm:gap-4 w-auto sm:w-auto px-2 sm:px-0">
          {/* HIDE Button */}
          <button
            onClick={() => setIsUIVisible(!isUIVisible)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
            }}
          >
            {isUIVisible ? (
              <IoMdEyeOff className="text-grifter-blue text-2xl" />
            ) : (
              <IoMdEye className="text-grifter-blue text-2xl" />
            )}
          </button>
          {/* Config Button (MobileControlsOverlay Trigger) */}
          <button
            onClick={() => setIsModalOpen(!isModalOpen)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue sm:hidden"
            style={{
              boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
            }}
            aria-label="Config"
          >
            <svg className={`text-grifter-blue text-2xl transition-transform duration-300 ${isModalOpen ? 'rotate-90' : ''}`} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="#3EE6FF" strokeWidth="2"/><path d="M19.4 15A1.65 1.65 0 0 0 21 13.35V10.65A1.65 1.65 0 0 0 19.4 9L18.13 7.13A1.65 1.65 0 0 0 16.35 6.6L13.65 6.6A1.65 1.65 0 0 0 12 5A1.65 1.65 0 0 0 10.35 6.6L7.65 6.6A1.65 1.65 0 0 0 5.87 7.13L4.6 9A1.65 1.65 0 0 0 3 10.65V13.35A1.65 1.65 0 0 0 4.6 15L5.87 16.87A1.65 1.65 0 0 0 7.65 17.4L10.35 17.4A1.65 1.65 0 0 0 12 19A1.65 1.65 0 0 0 13.65 17.4L16.35 17.4A1.65 1.65 0 0 0 18.13 16.87L19.4 15Z" stroke="#3EE6FF" strokeWidth="2"/></svg>
          </button>
          {/* Leaderboard Button */}
          <button
            onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
            }}
          >
            <IoMdTrophy className="text-grifter-blue text-2xl" />
          </button>
          {/* WTF IS THIS Button */}
          <button
            onClick={() => setIsWtfModalOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black border border-grifter-blue"
            style={{
              boxShadow: '0 0 10px rgba(62, 230, 255, 0.5)',
            }}
            aria-label="WTF IS THIS"
          >
            <IoMdBulb className="text-grifter-blue text-2xl" />
          </button>
        </div>

        {/* Leaderboard Modal */}
        {isLeaderboardOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-90 backdrop-blur-modal flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-title"
            aria-describedby="leaderboard-description"
          >
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
              {/* Leaderboard Modal Headline Scanline */}
              <h2 
                id="leaderboard-title"
                className="text-2xl font-press-start-2p mb-2 select-none relative scanlines-subtle" 
                style={{ color: swordColor, letterSpacing: '0.05em' }}
              >
                {leaderboardTitle.split('').map((char, i) => (
                  <span key={i} style={i === highlightIdx ? { color: highlightColor } : {}}>{char}</span>
                ))}
              </h2>
              <div id="leaderboard-description" className="sr-only">
                Leaderboard showing top contributors to the GR1FTSWORD project
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
        
        {/* WTF IS THIS Modal */}
        {isWtfModalOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-90 backdrop-blur-modal flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wtf-title"
            aria-describedby="wtf-description"
          >
            <div className="bg-black border border-grifter-blue rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative leaderboard-scrollbar">
              {/* X-Button oben rechts */}
              <button
                onClick={() => setIsWtfModalOpen(false)}
                className="absolute top-3 right-3 text-grifter-blue text-xl font-bold hover:text-pink-400 transition-colors"
                aria-label="Schließen"
                style={{ textShadow: '0 0 10px currentColor' }}
              >
                ×
              </button>

              {/* Headline wie im Leaderboard */}
              <h2
                id="wtf-title"
                className="text-2xl font-press-start-2p uppercase mb-4 text-center select-none relative scanlines-subtle"
                style={{
                  color: swordColor,
                  letterSpacing: '0.05em',
                  zIndex: 1
                }}
              >
                {"WTF IS THIS?".split('').map((char, i) => (
                  <span key={i} style={i === highlightIdx ? { color: highlightColor } : {}}>{char}</span>
                ))}
              </h2>
              <div id="wtf-description" className="sr-only">
                Information about the GR1FTSWORD project and how it works
              </div>

              {/* Einleitung */}
              <p className="text-gray-300 mb-6 text-xs font-press-start-2p uppercase leading-relaxed text-center">
                VIEWERS CAN HELP THE GR1FTSWORD EVOLVE BY MAKING A SMALL CONTRIBUTION.<br />
                OF COURSE, YOU CAN ENJOY GREAT MUSIC AND RHYTHMIC ASCII ART 24/7 – COMPLETELY FREE OF CHARGE!
              </p>

              {/* Punkte-Tabelle im Leaderboard-Style */}
              <div className="mb-4">
                <h3 className="text-grifter-blue font-press-start-2p uppercase font-semibold mb-3 text-center text-sm">HOW DOES IT WORK?</h3>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  {/* Upgrades */}
                  <h4 className="text-pink-400 font-press-start-2p uppercase font-medium mb-2 text-xs">UPGRADES <span className='text-gray-400 font-normal'>(pro Level: 100x)</span></h4>
                  <table className="w-full text-xs font-press-start-2p uppercase">
                    <thead>
                      <tr className="text-grifter-blue text-left">
                        <th className="py-1 px-2 font-semibold">LEVEL</th>
                        <th className="py-1 px-2 font-semibold text-right">POINTS</th>
                        <th className="py-1 px-2 font-semibold text-right">COST</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 1 → 2</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">10͆ × 100</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">TBD × 100</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 2 → 3</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">20͆ × 100</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">TBD*2 × 100</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 3 → 4</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">40͆ × 100</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">... × 100</td>
                      </tr>
                      <tr className="opacity-50">
                        <td className="py-1 px-2 text-gray-400">LVL 4 → 5</td>
                        <td className="py-1 px-2 text-gray-500 text-right font-mono">80͆ × 100</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">... × 100</td>
                      </tr>
                      <tr className="opacity-30">
                        <td className="py-1 px-2 text-gray-400">LVL 5 → 6</td>
                        <td className="py-1 px-2 text-gray-500 text-right font-mono">160͆ × 100</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">... × 100</td>
                      </tr>
                    </tbody>
                  </table>
                  {/* LVL-Ups */}
                  <h4 className="text-pink-400 font-press-start-2p uppercase font-medium mb-2 text-xs mt-4">EVOLUTION <span className='text-gray-400 font-normal'>(nur 1x pro Level)</span></h4>
                  <table className="w-full text-xs font-press-start-2p uppercase">
                    <thead>
                      <tr className="text-grifter-blue text-left">
                        <th className="py-1 px-2 font-semibold">LEVEL</th>
                        <th className="py-1 px-2 font-semibold text-right">POINTS</th>
                        <th className="py-1 px-2 font-semibold text-right">COST</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 1 → 2</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">200͆</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">TBD</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 2 → 3</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">400͆</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">TBD*2</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 text-gray-200">LVL 3 → 4</td>
                        <td className="py-1 px-2 text-grifter-blue text-right font-mono">800͆</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">...</td>
                      </tr>
                      <tr className="opacity-50">
                        <td className="py-1 px-2 text-gray-400">LVL 4 → 5</td>
                        <td className="py-1 px-2 text-gray-500 text-right font-mono">1600͆</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">...</td>
                      </tr>
                      <tr className="opacity-30">
                        <td className="py-1 px-2 text-gray-400">LVL 5 → 6</td>
                        <td className="py-1 px-2 text-gray-500 text-right font-mono">3200͆</td>
                        <td className="py-1 px-2 text-pink-400 text-right font-mono">...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
      {/* Scanline-Effekt für Leaderboard-Headline */}
      <style jsx global>{`
        .scanlines-subtle::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.25),
            rgba(0, 0, 0, 0.25) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 10;
        }
      `}</style>
    </main>
  );
} 