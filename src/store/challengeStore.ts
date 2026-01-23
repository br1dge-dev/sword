/**
 * Challenge Store - Type definitions for rhythm challenge mode
 */

// Hit-map structure from recorded JSON
export interface HitMap {
  track: string;
  displayName: string;
  fullHitMap: number[];
  challengeConfig: {
    startOffset: number;
    duration: number;
    toleranceMs: number;
  };
  difficulty: string;
  totalDuration: number;
}
