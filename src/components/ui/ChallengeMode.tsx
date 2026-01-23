"use client";

/**
 * ChallengeMode - Rhythm challenge modal
 * Minimal UI that keeps the sword visible
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { HitMap } from '@/store/challengeStore';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface ChallengeModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeMode({ isOpen, onClose }: ChallengeModeProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hitMap, setHitMap] = useState<HitMap | null>(null);
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'active' | 'results'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
  const [hits, setHits] = useState<{time: number; hit: boolean}[]>([]);
  const [combo, setCombo] = useState(0);
  
  const rafRef = useRef<number | undefined>(undefined);
  const isPlayingRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { triggerBeat, updateEnergy, setMusicPlaying, stopIdle, addRipple, clearRipples } = useAudioReactionStore();
  
  // Load hitmap when opened
  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setPhase('idle');
    setHits([]);
    setCombo(0);
    clearRipples(); // Clear any existing background ripples
    isPlayingRef.current = false;
    
    fetch('/hitmaps/gr1ftsword.json')
      .then(res => res.json())
      .then((data: HitMap) => {
        setHitMap(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load hitmap:', err);
        setIsLoading(false);
      });
  }, [isOpen]);
  
  // Setup audio when hitmap loaded
  useEffect(() => {
    if (!hitMap || !audioRef.current) return;
    
    const audio = audioRef.current;
    audio.src = `/music/${hitMap.track}`;
    audio.volume = 0.3;
    audio.load();
  }, [hitMap]);
  
  // Handle START
  const handleStart = useCallback(() => {
    if (!audioRef.current || !hitMap || isPlayingRef.current) return;
    
    isPlayingRef.current = true;
    stopIdle();
    setMusicPlaying(true);
    
    const startAt = Math.max(0, hitMap.challengeConfig.startOffset - 3);
    audioRef.current.currentTime = startAt;
    audioRef.current.play().catch(err => {
      console.error('Play failed:', err);
      isPlayingRef.current = false;
    });
    
    setPhase('countdown');
    setCountdown(3);
    
    // Clear any existing countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    // Countdown
    let c = 3;
    countdownTimerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setPhase('active');
        setTimeLeft(hitMap.challengeConfig.duration);
      }
    }, 1000);
  }, [hitMap, stopIdle, setMusicPlaying]);
  
  // Track time during active phase
  useEffect(() => {
    if (phase !== 'active' || !audioRef.current || !hitMap) return;
    
    const config = hitMap.challengeConfig;
    const endTime = config.startOffset + config.duration;
    
    const tick = () => {
      const t = audioRef.current?.currentTime || 0;
      const remaining = Math.max(0, endTime - t);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setPhase('results');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setMusicPlaying(false);
        isPlayingRef.current = false;
        return;
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };
    
    rafRef.current = requestAnimationFrame(tick);
    return () => { 
      if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };
  }, [phase, hitMap, setMusicPlaying]);
  
  // Handle click during active phase
  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'active' || !audioRef.current || !hitMap) return;
    
    e.preventDefault();
    
    // Get coordinates
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      const touchEvent = e as React.TouchEvent;
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    const currentTime = audioRef.current.currentTime;
    const tolerance = hitMap.challengeConfig.toleranceMs / 1000;
    
    // Find closest beat
    let closestDelta = Infinity;
    for (const beatTime of hitMap.fullHitMap) {
      const delta = Math.abs(currentTime - beatTime);
      if (delta < closestDelta) closestDelta = delta;
    }
    
    const isHit = closestDelta <= tolerance;
    
    setHits(prev => [...prev, { time: currentTime, hit: isHit }]);
    setCombo(prev => isHit ? prev + 1 : 0);
    
    // Use viewport coordinates directly - the canvas will convert them
    // clientX/Y are already in viewport coordinates
    
    // Intensity scales with combo - higher combo = brighter ripples
    const intensity = isHit ? 0.95 + Math.min(combo * 0.03, 0.2) : 0.7;
    addRipple(clientX, clientY, isHit, intensity);
    
    // Trigger visual feedback on the sword
    triggerBeat();
    updateEnergy(isHit ? 0.9 : 0.5);
    setTimeout(() => updateEnergy(0.15), 150);
  }, [phase, hitMap, combo, triggerBeat, updateEnergy, addRipple]);
  
  // Handle close
  const handleClose = useCallback(() => {
    // Clear countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    // Clear RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setMusicPlaying(false);
    setPhase('idle');
    setHits([]);
    clearRipples(); // Clear background ripples
    isPlayingRef.current = false;
    onClose();
  }, [onClose, setMusicPlaying, clearRipples]);
  
  // Calculate accuracy
  const successfulHits = hits.filter(h => h.hit).length;
  const accuracy = hits.length > 0 ? (successfulHits / hits.length) * 100 : 0;
  const passed = accuracy >= 90;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <audio ref={audioRef} preload="auto" />
      
      {/* Ripple effects now rendered in AsciiBackgroundCanvas via store */}
      
      {/* START Screen */}
      {phase === 'idle' && !isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-auto">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-[#00FCA6] text-black font-press-start-2p text-sm rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(0,252,166,0.6)]"
              style={{ textShadow: 'none' }}
            >
              START CHALLENGE
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2 text-gray-400 hover:text-white font-press-start-2p text-xs transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110]">
          <div className="text-[#3EE6FF]/70 font-press-start-2p text-xs animate-pulse">
            LOADING...
          </div>
        </div>
      )}
      
      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-start justify-center z-[110] pt-20 pointer-events-none">
          <div 
            className="text-8xl font-press-start-2p text-[#00FCA6]"
            style={{
              textShadow: '0 0 40px #00FCA6, 0 0 80px #00FCA6',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          >
            {countdown}
          </div>
        </div>
      )}
      
      {/* Active */}
      {phase === 'active' && (
        <>
          {/* Click area */}
          <div 
            className="absolute inset-0 z-[120] cursor-crosshair pointer-events-auto"
            onClick={handleClick}
            onTouchStart={handleClick}
            style={{ touchAction: 'none' }}
          />
          
          {/* Stats */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
            <div className="flex flex-col items-center gap-1">
              <div 
                className="text-4xl font-press-start-2p"
                style={{ 
                  color: accuracy >= 90 ? '#00FCA6' : accuracy >= 70 ? '#F8E16C' : '#FF3EC8',
                  textShadow: '0 0 15px currentColor',
                }}
              >
                {accuracy.toFixed(0)}%
              </div>
              {combo > 1 && (
                <div className="text-[#00FCA6] font-press-start-2p text-xs" style={{ textShadow: '0 0 10px #00FCA6' }}>
                  {combo}x COMBO
                </div>
              )}
              <div className="text-[#3EE6FF]/70 text-xs font-mono">
                {successfulHits} hits • {Math.ceil(timeLeft)}s
              </div>
            </div>
          </div>
          
          {/* Hint */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
            <div className="text-[#00FCA6]/60 font-press-start-2p text-xs animate-pulse" style={{ textShadow: '0 0 10px rgba(0,252,166,0.5)' }}>
              TAP IN THE BEAT
            </div>
          </div>
        </>
      )}
      
      {/* Results */}
      {phase === 'results' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-sm border border-[#3EE6FF] rounded-lg p-6 text-center max-w-sm">
            <div 
              className="text-xl font-press-start-2p mb-3"
              style={{ 
                color: passed ? '#00FCA6' : '#FF3EC8',
                textShadow: '0 0 15px currentColor',
              }}
            >
              {passed ? 'NAILED IT!' : 'NOT QUITE'}
            </div>
            
            <div className="text-5xl font-press-start-2p text-white mb-3">
              {accuracy.toFixed(1)}%
            </div>
            
            <div className="text-[#3EE6FF]/80 text-sm mb-4">
              {successfulHits} / {hits.length} hits
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  // Reset state for retry
                  setPhase('idle');
                  setHits([]);
                  setCombo(0);
                  clearRipples(); // Clear background ripples
                  isPlayingRef.current = false;
                  // Reset audio
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                }}
                className="px-5 py-2 border border-[#3EE6FF] text-[#3EE6FF] font-press-start-2p text-xs rounded hover:bg-[#3EE6FF] hover:text-black transition-colors"
              >
                RETRY
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 bg-[#00FCA6] text-black font-press-start-2p text-xs rounded"
              >
                {passed ? 'CLAIM' : 'CLOSE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
