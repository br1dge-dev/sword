"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioReactionStore } from "@/store/audioReactionStore";
import type { ChoreoTrack } from "@/lib/choreo/choreoTypes";
import { sampleChoreo, type ChoreoSample } from "@/lib/choreo/choreoRuntime";

export function useChoreoTrack() {
  const { currentTrackName, currentTrackSrc, currentTimeSec } = useAudioReactionStore((s) => ({
    currentTrackName: s.currentTrackName,
    currentTrackSrc: s.currentTrackSrc,
    currentTimeSec: s.currentTimeSec,
  }));

  const isDr4gonsword = currentTrackName === "DR4GONSWORD";
  const choreoUrl = useMemo(() => {
    if (!isDr4gonsword) return null;
    return "/choreo/DR4GONSWORD.v1.json";
  }, [isDr4gonsword]);

  const [track, setTrack] = useState<ChoreoTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<ChoreoTrack | null>(null);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    if (!choreoUrl) {
      setTrack(null);
      setError(null);
      return;
    }
    let cancelled = false;
    fetch(choreoUrl, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ChoreoTrack) => {
        if (cancelled) return;
        setTrack(data);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setTrack(null);
        setError(`Missing choreo file for ${currentTrackName ?? "unknown"} (${String(e)})`);
      });
    return () => {
      cancelled = true;
    };
  }, [choreoUrl, currentTrackName]);

  const sample: ChoreoSample | null = useMemo(() => {
    if (!track) return null;
    return sampleChoreo(track, currentTimeSec, 120);
  }, [track, currentTimeSec]);

  return {
    enabled: isDr4gonsword && !!track && track.trackName === "DR4GONSWORD",
    trackName: currentTrackName,
    src: currentTrackSrc,
    timeSec: currentTimeSec,
    sample,
    error,
  };
}


