"use client";

import React, { useEffect, useMemo, useState } from "react";

type BuildInfo = {
  timestamp?: string;
  nodeEnv?: string | null;
  vercel?: {
    env?: string | null;
    url?: string | null;
    deploymentId?: string | null;
    region?: string | null;
    git?: {
      commitSha?: string | null;
      commitRef?: string | null;
      commitMessage?: string | null;
      repoSlug?: string | null;
      repoOwner?: string | null;
      provider?: string | null;
    };
  };
};

export default function BuildBadge() {
  const [info, setInfo] = useState<BuildInfo | null>(null);

  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get("debug") === "1";
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/build", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({});
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  const sha = info?.vercel?.git?.commitSha ?? null;
  const ref = info?.vercel?.git?.commitRef ?? null;
  const env = info?.vercel?.env ?? null;
  const deploymentId = info?.vercel?.deploymentId ?? null;

  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] rounded border border-grifter-blue bg-black/80 px-3 py-2 text-[10px] font-mono text-grifter-blue"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="font-bold">BUILD</div>
      <div>env: {env ?? "unknown"}</div>
      <div>ref: {ref ?? "unknown"}</div>
      <div>sha: {sha ? sha.slice(0, 7) : "unknown"}</div>
      <div>deploy: {deploymentId ? deploymentId.slice(0, 10) : "unknown"}</div>
    </div>
  );
}
