"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioAnalyzer, globalAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useAudioReactionStore } from '../../store/audioReactionStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useSwordEvolutionV2 } from '../../hooks/useSwordEvolutionV2';
import { useShallow } from 'zustand/react/shallow';
import type { HitMapData } from '@/store/challengeStore';
import { ClaimRewardButton } from './ClaimRewardButton';

interface AudioControlPanelProps {
  className?: string;
  onBeat?: () => void;
  onEnergyChange?: (energy: number) => void;
}

// Verfügbare Tracks
const tracks = [
  { src: "/music/gr1ftsword.mp3", name: "GR1FTSWORD" },
  { src: "/music/flashword.mp3", name: "FLASHWORD" },
  { src: "/music/funksword.mp3", name: "FUNKSWORD" },
  { src: "/music/atarisword.mp3", name: "ATARISWORD" },
  { src: "/music/DR4GONSWORD.mp3", name: "DR4GONSWORD" },
  { src: "/music/PUNCHSWORD.mp3", name: "PUNCHSWORD" },
  { src: "/music/NIGHTSWORD.mp3", name: "NIGHTSWORD" },
  // NEU:
  { src: "/music/DANGERSWORD.mp3", name: "DANGERSWORD" },
  { src: "/music/SHONENSWORD.mp3", name: "SHONENSWORD" },
  { src: "/music/WORFSWORD.mp3", name: "WORFSWORD" }
];

// Pseudo-zufällige Reihenfolge für Highlight-Position und Farbe
const highlightPattern = [
  { idx: 0, color: '#3EE6FF' }, // Cyan
  { idx: 2, color: '#FF3EC8' }, // Pink
  { idx: 1, color: '#F8E16C' }, // Gelb
  { idx: 4, color: '#00FCA6' }, // Grün
  { idx: 3, color: '#3EE6FF' },
  { idx: 5, color: '#FF3EC8' },
  { idx: 6, color: '#F8E16C' },
  { idx: 0, color: '#00FCA6' },
  { idx: 2, color: '#3EE6FF' },
  { idx: 1, color: '#FF3EC8' },
];

export default function AudioControlPanel({ className = '', onBeat, onEnergyChange }: AudioControlPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [analyzerInitialized, setAnalyzerInitialized] = useState(false);
  const [visualBeatActive, setVisualBeatActive] = useState(false);
  const [lastEnergy, setLastEnergy] = useState(0);
  
  // Challenge Mode State - use shared store
  const { mode, setMode, phase, setPhase, hits: sharedHits, timeLeft: sharedTimeLeft, missedBeats: sharedMissedBeats, totalBeats: sharedTotalBeats, accuracy: sharedAccuracy, addHit, addUserClick, addMissedBeat, startChallenge, resetChallenge, finalizeAccuracy, setTotalBeats, setTimeLeft: setSharedTimeLeft, getAccuracy } = useChallengeStore(
    useShallow((s) => ({
      mode: s.mode,
      setMode: s.setMode,
      phase: s.phase,
      setPhase: s.setPhase,
      hits: s.hits,
      timeLeft: s.timeLeft,
      missedBeats: s.missedBeats,
      totalBeats: s.totalBeats,
      accuracy: s.accuracy,
      addHit: s.addHit,
      addUserClick: s.addUserClick,
      addMissedBeat: s.addMissedBeat,
      startChallenge: s.startChallenge,
      resetChallenge: s.resetChallenge,
      finalizeAccuracy: s.finalizeAccuracy,
      setTotalBeats: s.setTotalBeats,
      setTimeLeft: s.setTimeLeft,
      getAccuracy: s.getAccuracy,
    })),
  );

  // Local state for things that don't need to be shared
  const [countdown, setCountdown] = useState(3);
  const [hitMap, setHitMap] = useState<HitMapData | null>(null);
  const [localTotalBeats, setLocalTotalBeats] = useState(0); // Store totalBeats locally to avoid async issues
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const challengeRafRef = useRef<number | undefined>(undefined);
  const isPlayingChallengeRef = useRef(false);
  
  // DEBUG: Track override for testing different hitmaps
  const [debugTrackOverride, setDebugTrackOverride] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Available tracks for debug selector (tracks with hitmaps)
  const challengeTracks = [
    { name: 'GR1FTSWORD', file: 'gr1ftsword' },
    { name: 'FLASHWORD', file: 'flashword' },
    { name: 'FUNKSWORD', file: 'funksword' },
    { name: 'ATARISWORD', file: 'atarisword' },
    { name: 'DR4GONSWORD', file: 'dr4gonsword' },
    { name: 'PUNCHSWORD', file: 'punchsword' },
    { name: 'NIGHTSWORD', file: 'nightsword' },
    { name: 'DANGERSWORD', file: 'dangersword' },
    { name: 'SHONENSWORD', file: 'shonensword' },
    { name: 'WORFSWORD', file: 'worfsword' },
  ];

  // Derived values from shared hits (with safe defaults)
  const safeHits = sharedHits || [];
  // Count UNIQUE successful hits (by beatIndex) - same as server
  const hitBeatIndices = new Set(safeHits.filter(h => h?.hit).map(h => h?.beatIndex).filter((i): i is number => i !== undefined));
  const uniqueHits = hitBeatIndices.size || 0;
  const missClicks = safeHits.filter(h => h && !h.hit).length || 0;
  const safeMissedBeats = sharedMissedBeats || 0;
  // Use localTotalBeats instead of sharedTotalBeats to avoid async state issues
  const effectiveTotalBeats = localTotalBeats > 0 ? localTotalBeats : (sharedTotalBeats || 0);
  
  const initializationAttemptedRef = useRef<boolean>(false);

  // ENTFERNT: Logging-Variablen (lastLogTimeRef, logThrottleInterval)

  // DEAKTIVIERT: Logging-Funktion
  // const throttledLog = (message: string, force: boolean = false) => {
  //   const now = Date.now();
  //   if (force || now - lastLogTimeRef.current > logThrottleInterval) {
  //     console.log(`[AudioControlPanel] ${message}`);
  //     lastLogTimeRef.current = now;
  //   }
  // };
  
  // Audio-Reaction-Store
  const { setMusicPlaying, setAudioActive, isIdleActive, swordColor, triggerBeat, updateEnergy, stopIdle, addRipple, clearRipples } = useAudioReactionStore(
    useShallow((state) => ({
    setMusicPlaying: state.setMusicPlaying,
    setAudioActive: state.setAudioActive,
    isIdleActive: state.isIdleActive(),
      swordColor: state.swordColor,
      triggerBeat: state.triggerBeat,
      updateEnergy: state.updateEnergy,
      stopIdle: state.stopIdle,
      addRipple: state.addRipple,
      clearRipples: state.clearRipples,
    })),
  );

  
  // Use SwordEvolution hook for claim status AND active challenge
  const { userState, globalState, aspectLevels, activeChallenge, refetch } = useSwordEvolutionV2();
  const [hasClaimedSuccessfully, setHasClaimedSuccessfully] = useState(false);
  const [showProgressUpdate, setShowProgressUpdate] = useState(false);
  const prevAspectLevelsRef = useRef(aspectLevels);

  // Visual effect when aspect levels update after claim
  useEffect(() => {
    if (hasClaimedSuccessfully && aspectLevels !== prevAspectLevelsRef.current) {
      setShowProgressUpdate(true);
      prevAspectLevelsRef.current = aspectLevels;
      const timer = setTimeout(() => setShowProgressUpdate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [aspectLevels, hasClaimedSuccessfully]);

  // Audio-Analyzer Hook
  const {
    initialize,
    start,
    stop,
    isInitialized,
    isAnalyzing
  } = useAudioAnalyzer({
    energyThreshold: 0.02, // slightly less sensitive: beats shouldn't fire on every melodic transient
    analyzeInterval: 16, // target ~60Hz for tighter perceived sync (render loop remains rAF)
    frequencyInterval: 16, // keep band/onset features fresh; entropy uses bass transients
    beatSensitivity: 1.0, // less sensitive: prefer kick/bass beats
    onBeat: () => {
      onBeat?.();
      setVisualBeatActive(true);
      setTimeout(() => setVisualBeatActive(false), 150);
    },
    onEnergy: (e) => {
      onEnergyChange?.(e);
      setLastEnergy(e);
    }
  });

  // Initialisiere Audio-Analyzer
  const initializeAudioAnalyzer = useCallback(async () => {
    if (!audioRef.current || analyzerInitialized || initializationAttemptedRef.current) {
      return;
    }
    
    initializationAttemptedRef.current = true;
    
    try {
      await initialize(audioRef.current);
      setAnalyzerInitialized(true);
      // throttledLog('Audio analyzer initialized', true);
      
      if (isInitialized && !isAnalyzing && isPlaying) {
        start();
        // throttledLog('Auto-starting audio analysis', true);
      }
    } catch (err) {
      // DEAKTIVIERT: Logging
      // console.error('Failed to initialize audio analyzer:', err);
    }
  }, [initialize, isInitialized, isAnalyzing, start, isPlaying, analyzerInitialized]);
  
  useEffect(() => {
    if (audioRef.current && !analyzerInitialized) {
      initializeAudioAnalyzer();
    }
  }, [analyzerInitialized, initializeAudioAnalyzer]);
  
  // Starte/Stoppe Analyzer basierend auf Wiedergabestatus
  useEffect(() => {
    if (isInitialized && !isAnalyzing && isPlaying) {
      start();
      // throttledLog('Starting audio analysis', true);
    } else if (isInitialized && isAnalyzing && !isPlaying) {
      stop();
      // throttledLog('Stopping audio analysis', true);
    }
  }, [isInitialized, isAnalyzing, start, stop, isPlaying]);

  // Load hitmap when challenge mode is enabled
  const { setHitMap: setSharedHitMap, setAudioTime } = useChallengeStore(
    useShallow((s) => ({
      setHitMap: s.setHitMap,
      setAudioTime: s.setAudioTime,
    })),
  );

  // Load hitmap when challenge mode is enabled - use debug override or contract's activeChallenge
  useEffect(() => {
    if (mode === 'challenge' && !hitMap) {
      // DEBUG: Use override if set, otherwise use contract data
      const trackName = debugTrackOverride || activeChallenge?.trackName?.toLowerCase() || 'gr1ftsword';
      const contractStartOffsetMs = debugTrackOverride ? 0 : (activeChallenge?.startOffsetMs || 0);
      const contractEndOffsetMs = debugTrackOverride ? 45000 : (activeChallenge?.endOffsetMs || 45000);
      
      console.log('[Challenge] Loading hitmap for track:', trackName, debugTrackOverride ? '(DEBUG OVERRIDE)' : '', 'offset:', contractStartOffsetMs, '-', contractEndOffsetMs);
      
      fetch(`/hitmaps/${trackName}.json`)
        .then(res => {
          if (!res.ok) {
            console.warn(`[Challenge] No hitmap for ${trackName}, falling back to gr1ftsword`);
            return fetch('/hitmaps/gr1ftsword.json');
          }
          return res;
        })
        .then(res => res.json())
        .then((data: HitMapData) => {
          // Override challengeConfig with contract values if available (not in debug mode)
          if (!debugTrackOverride && activeChallenge && contractStartOffsetMs > 0) {
            data.challengeConfig = {
              startOffset: contractStartOffsetMs / 1000, // Convert ms to seconds
              duration: (contractEndOffsetMs - contractStartOffsetMs) / 1000,
              toleranceMs: data.challengeConfig?.toleranceMs || 150,
            };
            console.log('[Challenge] Using contract offsets:', data.challengeConfig);
          } else {
            console.log('[Challenge] Using hitmap default offsets:', data.challengeConfig);
          }
          
          setHitMap(data);
          setSharedHitMap(data); // Also store in shared state
          // Calculate max possible hits in the challenge window
          const startTime = data.challengeConfig.startOffset;
          const endTime = startTime + data.challengeConfig.duration;
          const hitsInWindow = data.fullHitMap.filter(t => t >= startTime && t <= endTime).length;
          console.log('[Challenge] Beats in window:', hitsInWindow);
          setTotalBeats(hitsInWindow);
        })
        .catch(err => console.error('Failed to load hitmap:', err));
    }
  }, [mode, hitMap, activeChallenge, debugTrackOverride, setTotalBeats, setSharedHitMap]);

  // Get wallet address from window.ethereum
  const getWalletAddress = useCallback(async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts.length > 0 ? accounts[0] : null;
    }
    return null;
  }, []);

  // Track wallet changes
  useEffect(() => {
    const handleAccountsChanged = () => {
      setHasClaimedSuccessfully(false);
    };
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Handle challenge button click
  const handleChallengeClick = useCallback(async () => {
    setMode('challenge');
  }, [setMode]);

  // Reset challenge state when switching modes
  useEffect(() => {
    if (mode === 'music') {
      setPhase('idle');
      resetChallenge();
      clearRipples();
      setHitMap(null); // Reset hitmap so it reloads with new contract data next time
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (challengeRafRef.current) {
        cancelAnimationFrame(challengeRafRef.current);
        challengeRafRef.current = undefined;
      }
      // Stop challenge audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setMusicPlaying(false);
      isPlayingChallengeRef.current = false;
    }
  }, [mode, setPhase, resetChallenge, clearRipples, setMusicPlaying]);

  // Handle challenge START
  const handleChallengeStart = useCallback(() => {
    if (!audioRef.current || !hitMap || isPlayingChallengeRef.current) return;

    // Calculate total beats for this challenge
    const startTime = hitMap.challengeConfig.startOffset;
    const endTime = startTime + hitMap.challengeConfig.duration;
    const hitsInWindow = hitMap.fullHitMap.filter(t => t >= startTime && t <= endTime).length;

    // Start challenge - resets state AND sets totalBeats in ONE atomic update
    startChallenge(hitsInWindow);
    // Also store locally to avoid async state issues
    setLocalTotalBeats(hitsInWindow);
    console.log('[Challenge] Started with', hitsInWindow, 'beats');

    isPlayingChallengeRef.current = true;
    stopIdle();
    setMusicPlaying(true);
    clearRipples();

    const startAt = Math.max(0, hitMap.challengeConfig.startOffset - 3);
    audioRef.current.src = `/music/${hitMap.track}`;
    audioRef.current.currentTime = startAt;
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(err => {
      console.error('Play failed:', err);
      isPlayingChallengeRef.current = false;
    });

    setPhase('countdown');
    setCountdown(3);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let c = 3;
    countdownTimerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setPhase('active');
        setSharedTimeLeft(hitMap.challengeConfig.duration);
      }
    }, 1000);
  }, [hitMap, stopIdle, setMusicPlaying, clearRipples, startChallenge, setPhase, setSharedTimeLeft]);

  // Track time during active challenge
  useEffect(() => {
    if (phase !== 'active' || !audioRef.current || !hitMap) return;

    const config = hitMap.challengeConfig;
    const endTime = config.startOffset + config.duration;

    const tick = () => {
      const t = audioRef.current?.currentTime || 0;
      const remaining = Math.max(0, endTime - t);
      setSharedTimeLeft(remaining);
      setAudioTime(t); // Update shared audio time for HitIndicator

      if (remaining <= 0) {
        // Finalize accuracy calculation (include missed beats)
        finalizeAccuracy();
        setPhase('results');
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setMusicPlaying(false);
        isPlayingChallengeRef.current = false;
        return;
      }

      challengeRafRef.current = requestAnimationFrame(tick);
    };

    challengeRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (challengeRafRef.current) cancelAnimationFrame(challengeRafRef.current);
    };
  }, [phase, hitMap, setMusicPlaying, setPhase, setSharedTimeLeft, finalizeAccuracy]);

  // Handle challenge click - now handled globally via window event listener
  // Keeping this for reference but not using it directly

  // Track missed beats (beats that passed without being hit)
  const lastCheckedBeatRef = useRef<number>(-1);
  
  // Check for missed beats during active challenge
  useEffect(() => {
    if (phase !== 'active' || !audioRef.current || !hitMap) return;

    const checkMissedBeats = () => {
      const currentTime = audioRef.current?.currentTime || 0;
      const tolerance = hitMap.challengeConfig.toleranceMs / 1000;
      const startTime = hitMap.challengeConfig.startOffset;

      // Find beats that have passed (beyond tolerance window) and weren't hit
      const hits = sharedHits || [];
      const hitTimesArray = hits.filter(h => h?.hit).map(h => h?.timestamp).filter((t): t is number => t !== undefined);

      let newMissed = 0;
      for (const beatTime of hitMap.fullHitMap) {
        if (beatTime < startTime) continue;
        if (beatTime > currentTime - tolerance) break; // Haven't passed yet
        if (beatTime <= lastCheckedBeatRef.current) continue; // Already counted

        // Check if this beat was hit (within tolerance)
        const wasHit = hitTimesArray.some(hitTime => Math.abs(hitTime - beatTime) <= tolerance);

        if (!wasHit) {
          newMissed++;
        }
        lastCheckedBeatRef.current = beatTime;
      }

      if (newMissed > 0) {
        for (let i = 0; i < newMissed; i++) {
          addMissedBeat();
        }
      }
    };

    const interval = setInterval(checkMissedBeats, 100);
    return () => clearInterval(interval);
  }, [phase, hitMap, sharedHits, addMissedBeat]);
  
  // Reset missed beats tracking when challenge resets
  useEffect(() => {
    if (phase === 'idle') {
      lastCheckedBeatRef.current = -1;
    }
  }, [phase]);
  
  // Use accuracy from store (calculated as hits / (hits + wrong) during challenge,
  // and hits / (hits + wrong + missed) at the end)
  const accuracy = sharedAccuracy || 0;
  const passed = accuracy >= 70;

  // Expose challenge click handler for fullscreen click area
  const isChallengeActive = mode === 'challenge' && phase === 'active';

  // Global click handler for challenge mode (attached to window)
  useEffect(() => {
    if (!isChallengeActive) return;

    const handleGlobalClick = (e: MouseEvent) => {
      if (!audioRef.current || !hitMap) return;

      const currentTime = audioRef.current.currentTime;
      const tolerance = hitMap.challengeConfig.toleranceMs / 1000;

      let closestDelta = Infinity;
      let closestIndex = -1;
      for (let i = 0; i < hitMap.fullHitMap.length; i++) {
        const delta = Math.abs(currentTime - hitMap.fullHitMap[i]);
        if (delta < closestDelta) {
          closestDelta = delta;
          closestIndex = i;
        }
      }

      const isHit = closestDelta <= tolerance;

      // Add user click to shared store (for claim validation)
      addUserClick(currentTime);

      // Add hit to shared store
      addHit({
        timestamp: currentTime,
        beatIndex: closestIndex,
        delta: closestDelta * 1000, // convert to ms
        hit: isHit
      });

      const intensity = isHit ? 0.95 : 0.7;
      addRipple(e.clientX, e.clientY, isHit, intensity);

      triggerBeat();
      updateEnergy(isHit ? 0.9 : 0.5);
      setTimeout(() => updateEnergy(0.15), 150);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isChallengeActive, hitMap, addUserClick, addRipple, triggerBeat, updateEnergy]);
  
  // Nächsten Track (stabil, damit Event-Handler sauber sind)
  const nextTrack = useCallback(async (autoplay = false) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      setCurrentTrackIndex(nextIndex);
      // Reset per-track adaptive analyzer state so sensitivities recalibrate for the new track.
      try {
        globalAnalyzer?.resetTrackAnalysis?.();
      } catch {
        // ignore
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (audioRef.current) {
        audioRef.current.src = tracks[nextIndex].src;
        audioRef.current.volume = 0.5;
        
        if (isPlaying || autoplay) {
          // Keep UI/store in sync even when autoplaying (e.g. track ended).
          setIsPlaying(true);
          setMusicPlaying(true);
          setAudioActive(true);
          audioRef.current.play().catch(() => {});

          // Ensure analyzer keeps running across track switches.
          if (isInitialized && !isAnalyzing) {
            start();
          }
        }
      }
    } catch (err) {
      // DEAKTIVIERT: Logging
      // console.error('Error switching track:', err);
    }
  }, [currentTrackIndex, isAnalyzing, isInitialized, isPlaying, setAudioActive, setMusicPlaying, start]);
  
  // Audio-Element Event Handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleEnded = () => {
      nextTrack(true);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.volume = 0.5; // Feste Lautstärke
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, nextTrack]);
  
  // AudioContext aktivieren
  const resumeAudioContext = useCallback(async () => {
    if (globalAnalyzer && globalAnalyzer.getAudioContext) {
      const audioContext = globalAnalyzer.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        // throttledLog('Resuming AudioContext', true);
        try {
          await audioContext.resume();
          
          if (!isAnalyzing && isPlaying) {
            start();
            // throttledLog('Explicitly starting audio analysis', true);
          }
          
          setAudioActive(true);
          return true;
        } catch (err) {
          // DEAKTIVIERT: Logging
          // console.error('Failed to resume AudioContext:', err);
          return false;
        }
      } else {
        return true;
      }
    }
    return false;
  }, [isAnalyzing, isPlaying, start, setAudioActive]);
  
  // Wiedergabe starten/pausieren
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      // On mobile Safari, initialization sometimes needs to happen *after* a user gesture.
      // If the auto-init failed earlier, retry here (safe: useAudioAnalyzer now allows retries).
      if (!isInitialized) {
        try {
          await initialize(audioRef.current);
        } catch {
          // If it still fails, we still allow audio playback; visuals may remain idle.
        }
      }

      await resumeAudioContext();
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        if (isAnalyzing) {
          stop();
          // throttledLog("Stopping audio analysis", true);
        }
        
        setMusicPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        
        if (isInitialized && !isAnalyzing) {
          start();
          // throttledLog("Starting audio analysis", true);
        }
        
        setMusicPlaying(true);
        // throttledLog("Music playback started", true);
      }
    } catch (err) {
      // DEAKTIVIERT: Logging
      // console.error('Error toggling playback:', err);
    }
  };

  // Vorherigen Track
  const prevTrack = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      // Reset per-track adaptive analyzer state so sensitivities recalibrate for the new track.
      try {
        globalAnalyzer?.resetTrackAnalysis?.();
      } catch {
        // ignore
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (audioRef.current) {
        audioRef.current.src = tracks[prevIndex].src;
        audioRef.current.volume = 0.5;
        
        if (isPlaying) {
          setIsPlaying(true);
          setMusicPlaying(true);
          setAudioActive(true);
          audioRef.current.play();

          if (isInitialized && !isAnalyzing) {
            start();
          }
        }
      }
    } catch (err) {
      // DEAKTIVIERT: Logging
      // console.error('Error switching track:', err);
    }
  };

  // Highlight-Animation im 2s-Takt
  const [highlightStep, setHighlightStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightStep((prev) => (prev + 1) % highlightPattern.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fortschritt ändern
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  // Visualisierungs-Balken berechnen
  const activeBars = Math.max(1, Math.floor(Math.min(1, lastEnergy * 1.8) * 8));

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ width: '100%', maxWidth: '280px' }}>
      {/* Audio-Element */}
      <audio
        ref={audioRef}
        src={tracks[currentTrackIndex].src}
        preload="metadata"
        className="hidden"
      />

      {/* Mode Switch - always visible */}
      <div className="flex items-center justify-center mb-4 w-full">
        <button
          onClick={() => setMode('music')}
          className={`px-3 py-2 text-[10px] font-press-start-2p border-2 rounded-l transition-all whitespace-nowrap ${
            mode === 'music' 
              ? 'bg-[#3EE6FF] text-black border-[#3EE6FF]' 
              : 'bg-black text-[#3EE6FF] border-[#3EE6FF]/40'
          }`}
        >
          MUSIC
        </button>
        <button
          onClick={handleChallengeClick}
          className={`px-3 py-2 text-[10px] font-press-start-2p border-2 border-l-0 rounded-r transition-all whitespace-nowrap ${
            mode === 'challenge' 
              ? 'bg-[#00FCA6] text-black border-[#00FCA6]' 
              : 'bg-black text-[#00FCA6] border-[#00FCA6]/40'
          }`}
        >
          CHALLENGE
        </button>
      </div>

      {/* MUSIC MODE */}
      {mode === 'music' && (
        <>
          {/* Player Buttons */}
          <div className="flex items-center justify-center gap-3 mb-3 w-full">
        <button
          onClick={() => prevTrack()}
          className="w-10 h-10 flex items-center justify-center rounded-[4px] border-2 border-grifter-blue font-press-start-2p bg-black relative pixel-btn transition-all duration-150 hover:bg-[#1a1a1a] hover:border-cyan-300 hover:shadow-[0_0_8px_#3EE6FF] hover:scale-105"
          style={{
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='%23000000'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%233EE6FF' fill-opacity='0.08'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23FF3EC8' fill-opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: '6px 6px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto my-auto block" style={{display:'block'}} xmlns="http://www.w3.org/2000/svg">
            <polygon points="16,6 8,12 16,18" fill="#3EE6FF" stroke="#3EE6FF" strokeWidth="2"/>
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className={`w-12 h-12 flex items-center justify-center rounded-[4px] border-2 border-grifter-blue font-press-start-2p bg-grifter-blue relative pixel-btn transition-all duration-150 hover:bg-[#5ffbf1] hover:border-cyan-300 hover:shadow-[0_0_12px_#3EE6FF] hover:scale-105 ${!isPlaying ? 'animate-glitch3' : ''}`}
          style={{
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='%2300FCA6' fill-opacity='0.12'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%233EE6FF' fill-opacity='0.12'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23FF3EC8' fill-opacity='0.12'/%3E%3C/svg%3E")`,
            backgroundSize: '6px 6px',
          }}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="mx-auto my-auto block" style={{display:'block'}} xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="5" height="16" fill="#181818" stroke="#181818" strokeWidth="2"/>
              <rect x="17" y="6" width="5" height="16" fill="#181818" stroke="#181818" strokeWidth="2"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="mx-auto my-auto block" style={{display:'block'}} xmlns="http://www.w3.org/2000/svg">
              <polygon points="8,6 22,14 8,22" fill="#181818" stroke="#181818" strokeWidth="2"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => nextTrack()}
          className="w-10 h-10 flex items-center justify-center rounded-[4px] border-2 border-grifter-blue font-press-start-2p bg-black relative pixel-btn transition-all duration-150 hover:bg-[#1a1a1a] hover:border-cyan-300 hover:shadow-[0_0_8px_#3EE6FF] hover:scale-105"
          style={{
            imageRendering: 'pixelated',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='%23000000'/%3E%3Crect x='0' y='0' width='2' height='2' fill='%233EE6FF' fill-opacity='0.08'/%3E%3Crect x='4' y='4' width='2' height='2' fill='%23FF3EC8' fill-opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: '6px 6px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto my-auto block" style={{display:'block'}} xmlns="http://www.w3.org/2000/svg">
            <polygon points="8,6 16,12 8,18" fill="#3EE6FF" stroke="#3EE6FF" strokeWidth="2"/>
          </svg>
        </button>
      </div>

      {/* Track Info */}
      <div className="mb-2 w-full justify-center hidden sm:flex">
        <div className="text-xs font-bold font-press-start-2p track-label-style sm:text-sm text-center">
          {tracks[currentTrackIndex].name.split("").map((char, i) => {
            const { idx, color } = highlightPattern[highlightStep];
            return (
              <span
                key={i}
                style={i === idx ? { color, textShadow: `0 0 2px ${color}` } : { color: swordColor, textShadow: `0 0 1px ${swordColor}` }}
              >
                {char}
              </span>
            );
          })}
        </div>
      </div>

      {/* Progress Bar direkt unter Trackname */}
      <div className="mb-3 w-full justify-center hidden sm:flex">
        <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden"
             style={{ 
               boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          <div 
            className="h-full bg-gradient-to-r from-[#3EE6FF] to-[#00FCA6] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-press-start-2p text-[#F8E16C] sm:text-sm" style={{textShadow: '0 0 1px #F8E16C', letterSpacing: '0.05em'}}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Header mit Titel und Dankness */}
      <div className="hidden sm:flex flex-col items-center mb-3 w-full">
        <div className="mb-1 text-xs font-bold font-press-start-2p text-[#3EE6FF] sm:text-sm text-center" 
             style={{ 
               textShadow: '0 0 1px #3EE6FF',
               letterSpacing: '0.05em'
             }}>
          DANKNESS
        </div>
        {/* Audio Visualizer */}
        <div className="relative h-6 w-32 border border-gray-700 bg-gray-900 overflow-hidden flex justify-center"
             style={{ 
               boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
               imageRendering: 'pixelated'
             }}>
          {isIdleActive ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs font-press-start-2p text-[#3EE6FF]">IDLE</span>
            </div>
          ) : (
            Array.from({ length: 10 }).map((_, index) => {
              const isActive = index < Math.floor(activeBars * 1.25); // Anpassung für 10 Tiles
              const tileColor = isActive ? 
                (lastEnergy > 0.7 ? 'bg-[#FF3EC8]' : lastEnergy > 0.4 ? 'bg-[#F8E16C]' : 'bg-[#3EE6FF]') : 
                'bg-gray-800';
              return (
                <div
                  key={index}
                  className={`h-full w-[10%] ${tileColor} border-r border-gray-900 last:border-r-0 transition-all duration-150`}
                  style={{
                    transform: visualBeatActive && isActive ? 'scaleY(1.2)' : 'scaleY(1)',
                    boxShadow: isActive ? 
                      (lastEnergy > 0.7 ? 'inset 0 0 3px rgba(255,62,200,0.8)' : 
                       lastEnergy > 0.4 ? 'inset 0 0 3px rgba(248,225,108,0.8)' : 
                       'inset 0 0 3px rgba(62,230,255,0.8)') : 
                      'none'
                  }}
                />
              );
            })
          )}
        </div>
      </div>
        </>
      )}

      {/* CHALLENGE MODE */}
      {mode === 'challenge' && (
        <div className="w-full flex flex-col items-center">
            {/* Idle: Show START button (disabled if already claimed) */}
          {phase === 'idle' && (
            <>
              {/* DEBUG: Track selector toggle */}
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="absolute top-2 right-2 text-xs text-gray-500 hover:text-gray-300 font-mono"
                title="Toggle debug track selector"
              >
                [DBG]
              </button>
              
              {/* DEBUG: Track selector panel */}
              {showDebugPanel && (
                <div className="mb-4 p-3 bg-black/80 border border-gray-700 rounded text-xs">
                  <div className="text-gray-400 mb-2 font-press-start-2p text-[8px]">DEBUG: SELECT TRACK</div>
                  <select
                    value={debugTrackOverride || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setDebugTrackOverride(value);
                      setHitMap(null); // Force reload hitmap
                    }}
                    className="w-full bg-gray-900 border border-gray-600 text-gray-300 px-2 py-1 rounded text-xs"
                  >
                    <option value="">Contract Default ({activeChallenge?.trackName || 'loading...'})</option>
                    {challengeTracks.map(t => (
                      <option key={t.file} value={t.file}>{t.name}</option>
                    ))}
                  </select>
                  {debugTrackOverride && (
                    <div className="mt-2 text-yellow-500 text-[8px]">
                      ⚠ Debug override active - claims disabled
                    </div>
                  )}
                  <div className="mt-2 text-gray-500 text-[8px]">
                    Contract: {activeChallenge?.trackName || 'N/A'} @ {activeChallenge?.startOffsetMs || 0}ms
                  </div>
                </div>
              )}
              
              <button
                onClick={userState !== null && userState.canClaimToday === false ? undefined : handleChallengeStart}
                disabled={userState !== null && userState.canClaimToday === false}
                className="px-6 py-3 font-press-start-2p text-xs rounded transition-opacity"
                style={{
                  backgroundColor: userState !== null && userState.canClaimToday === false ? '#1a1a1a' : '#00FCA6',
                  color: userState !== null && userState.canClaimToday === false ? '#666666' : '#000000',
                  boxShadow: userState !== null && userState.canClaimToday === false ? 'none' : '0 0 20px rgba(0,252,166,0.5)',
                  cursor: userState !== null && userState.canClaimToday === false ? 'not-allowed' : 'pointer',
                  opacity: userState !== null && userState.canClaimToday === false ? 0.6 : 1,
                }}
                title={userState !== null && userState.canClaimToday === false ? 'You already claimed today! Come back tomorrow.' : ''}
              >
                {userState !== null && userState.canClaimToday === false ? 'ALREADY CLAIMED' : 'START'}
              </button>
              
              {/* Show current track info */}
              {hitMap && (
                <div className="mt-2 text-xs text-gray-500 font-press-start-2p">
                  {hitMap.displayName} ({hitMap.fullHitMap.length} beats)
                </div>
              )}
            </>
          )}
          
          {/* Countdown */}
          {phase === 'countdown' && (
            <div 
              className="text-6xl font-press-start-2p text-grifter-green"
              style={{ textShadow: '0 0 30px #00FCA6' }}
            >
              {countdown}
            </div>
          )}
          
          {/* Active: Show stats - clicks handled globally */}
          {phase === 'active' && (
            <div className="w-full flex flex-col items-center">
              {/* Big accuracy percentage - shows "-" until first hit */}
              <div
                className="text-4xl font-press-start-2p mb-1"
                style={{
                  color: accuracy >= 70 ? '#00FCA6' : accuracy >= 50 ? '#F8E16C' : '#FF3EC8',
                  textShadow: '0 0 12px currentColor',
                }}
              >
                {effectiveTotalBeats === 0 ? '-' : `${accuracy}%`}
              </div>
              
              {/* Hit counter - shows hits, misses, and missed beats */}
              <div className="flex items-center gap-3 text-xs font-press-start-2p mb-2">
                <span className="text-grifter-green">{uniqueHits} / {effectiveTotalBeats}</span>
                {safeMissedBeats > 0 && <span className="text-grifter-orange">{safeMissedBeats} missed</span>}
                {missClicks > 0 && <span className="text-grifter-pink">{missClicks} wrong</span>}
                <span className="text-grifter-blue/60">{Math.ceil(sharedTimeLeft || 0)}s</span>
              </div>
              
              {/* Subtle tap hint */}
              <div className="text-grifter-blue/40 text-xs font-press-start-2p">
                TAP TO THE BEAT
              </div>
            </div>
          )}
          
          {/* Results */}
          {phase === 'results' && (
            <div className="w-full flex flex-col items-center gap-2">
              <div
                className="text-base font-press-start-2p"
                style={{
                  color: passed ? '#00FCA6' : '#FF3EC8',
                  textShadow: '0 0 8px currentColor',
                }}
              >
                {passed ? 'PASSED!' : 'TRY AGAIN'}
              </div>
              <div className="text-3xl font-press-start-2p text-white mb-1">
                {effectiveTotalBeats === 0 ? '-' : `${accuracy}%`}
              </div>

              {/* Claim button for passed challenges (disabled in debug mode) */}
              {passed && !hasClaimedSuccessfully && !debugTrackOverride && (
                <ClaimRewardButton 
                  onSuccess={() => {
                    setHasClaimedSuccessfully(true);
                    refetch(); // Reload aspect levels immediately
                  }} 
                />
              )}
              
              {/* Debug mode warning */}
              {passed && debugTrackOverride && (
                <div className="px-3 py-1 border border-yellow-500 text-yellow-500 font-press-start-2p text-[8px] rounded bg-yellow-500/10">
                  DEBUG MODE - Claims disabled
                </div>
              )}

              {/* Show success message if claimed */}
              {passed && hasClaimedSuccessfully && (
                <div 
                  className={`px-3 py-1 border border-grifter-green text-grifter-green font-press-start-2p text-xs rounded bg-grifter-green/20 transition-all duration-300 ${showProgressUpdate ? 'scale-110 shadow-[0_0_15px_#00FCA6]' : ''}`}
                >
                  CLAIMED! ✓
                  {showProgressUpdate && (
                    <span className="ml-2 text-grifter-cyan animate-pulse">↻</span>
                  )}
                </div>
              )}

{/* Detailed stats breakdown */}
              <div className="flex flex-col items-center gap-1 text-xs font-press-start-2p mt-2">
                <div className="flex items-center gap-4">
                  <span className="text-grifter-green">{uniqueHits} hits</span>
                  <span className="text-grifter-orange">{safeMissedBeats} missed</span>
                  <span className="text-grifter-pink">{missClicks} wrong</span>
                </div>
                <div className="text-grifter-blue/60">
                  Total: {effectiveTotalBeats} beats
                </div>
              </div>

              {/* Only show RETRY if not successfully claimed */}
              {!(passed && hasClaimedSuccessfully) && (
                <button
                  onClick={() => {
                    setPhase('idle');
                    resetChallenge();
                    lastCheckedBeatRef.current = -1;
                    clearRipples();
                    isPlayingChallengeRef.current = false;
                  }}
                  className="px-3 py-1.5 border border-grifter-blue text-grifter-blue font-press-start-2p text-xs rounded transition-all hover:bg-grifter-blue hover:text-black mt-2"
                >
                  RETRY
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .track-label-style {
          text-shadow: 0 0 1px #3EE6FF;
          letter-spacing: 0.05em;
        }
        @keyframes glitch3 {
          0% { filter: none; text-shadow: 0 0 2px #3EE6FF, 0 0 8px #FF3EC8; transform: none; }
          8% { filter: brightness(1.3) contrast(1.2); text-shadow: 2px 0 #3EE6FF, -2px 0 #FF3EC8; transform: translateY(-1px) skewX(-2deg); }
          15% { filter: hue-rotate(10deg) brightness(1.1); text-shadow: -2px 0 #3EE6FF, 2px 0 #FF3EC8; transform: translateX(1px) skewY(2deg); }
          22% { filter: none; text-shadow: 0 0 2px #3EE6FF, 0 0 8px #FF3EC8; transform: none; }
          30% { filter: brightness(1.2); text-shadow: 1px 1px #3EE6FF, -1px -1px #FF3EC8; transform: translateY(1px) skewX(2deg); }
          38% { filter: hue-rotate(-10deg); text-shadow: -1px 1px #3EE6FF, 1px -1px #FF3EC8; transform: translateX(-1px) skewY(-2deg); }
          45% { filter: none; text-shadow: 0 0 2px #3EE6FF, 0 0 8px #FF3EC8; transform: none; }
          100% { filter: none; text-shadow: 0 0 2px #3EE6FF, 0 0 8px #FF3EC8; transform: none; }
        }
        .animate-glitch3 {
          animation: glitch3 0.7s infinite steps(2, end);
        }
      `}</style>
    </div>
  );
} 