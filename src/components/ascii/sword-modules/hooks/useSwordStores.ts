import { useAudioReactionStore } from '@/store/audioReactionStore';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useShallow } from 'zustand/react/shallow';

export function useSwordPowerUpState() {
  return usePowerUpStore(
    useShallow((s) => ({
      currentLevel: s.currentLevel,
      chargeLevel: s.chargeLevel,
      glitchLevel: s.glitchLevel,
    })),
  );
}

export function useSwordAudioState() {
  const { energy, beatDetected, isMusicPlaying, isIdleActive } = useAudioReactionStore(
    useShallow((s) => ({
      energy: s.energy,
      beatDetected: s.beatDetected,
      isMusicPlaying: s.isMusicPlaying,
      isIdleActive: s.isIdleActive,
    })),
  );

  // IMPORTANT: do NOT memoize this against the function reference; it will freeze idle state.
  // We want the latest idle flag whenever the component re-renders (energy/beat updates cause rerenders).
  const idle = typeof isIdleActive === 'function' ? isIdleActive() : !!isIdleActive;

  return { energy, beatDetected, isMusicPlaying, idle };
}


