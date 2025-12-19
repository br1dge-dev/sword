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

  // store exposes a function today; keep compatibility if this ever changes
  const isIdle = () => (typeof isIdleActive === 'function' ? isIdleActive() : isIdleActive);

  return { energy, beatDetected, isMusicPlaying, isIdleActive, isIdle };
}


