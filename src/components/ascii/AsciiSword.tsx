"use client";

/**
 * AsciiSword - ASCII Art Sword Component Wrapper
 * 
 * Diese Komponente ist ein Wrapper für die modulare AsciiSwordModular-Komponente.
 * Sie behält die gleiche Schnittstelle bei, verwendet aber intern die neu strukturierte Version.
 */
import { AsciiSwordProps } from './sword-modules/types/swordTypes';
import AsciiSwordModular from './sword-modules/AsciiSwordModular';

export default function AsciiSword({ level = 1, directEnergy, directBeat }: AsciiSwordProps) {
  return <AsciiSwordModular 
    level={level} 
    directEnergy={directEnergy} 
    directBeat={directBeat}
  />;
} 