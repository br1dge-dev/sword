"use client";

/**
 * AsciiSword - ASCII Art Sword Component Wrapper
 * 
 * Diese Komponente ist ein Wrapper für die modulare AsciiSwordModular-Komponente.
 * Sie behält die gleiche Schnittstelle bei, verwendet aber intern die neu strukturierte Version.
 */
import { AsciiSwordProps } from './sword-modules/types/swordTypes';
import AsciiSwordModular from './sword-modules/AsciiSwordModular';
import { useAudioReactionStore } from '@/store/audioReactionStore';

export default function AsciiSword({ level = 1 }: Omit<AsciiSwordProps, 'directEnergy' | 'directBeat'>) {
  const { energy, beatDetected } = useAudioReactionStore();
  
  return <AsciiSwordModular 
    level={level} 
    directEnergy={energy} 
    directBeat={beatDetected}
  />;
} 