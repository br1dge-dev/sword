import { useAudioReactionStore } from '@/store/audioReactionStore';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function useSwordPowerUpState() {
  return usePowerUpStore(
    useShallow((s) => ({
      currentLevel: s.currentLevel,
      chargeLevel: s.chargeLevel,
      glitchLevel: s.glitchLevel,
      shootingStarEnabled: s.shootingStarEnabled,
      setShootingStarEnabled: s.setShootingStarEnabled,
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

  // Compute a stable boolean so consumers can safely put it in dependency arrays.
  const idle = useMemo(
    () => (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive),
    [isIdleActive],
  );

  return { energy, beatDetected, isMusicPlaying, idle };
}


