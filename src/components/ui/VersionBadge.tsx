"use client";

import React, { useEffect, useMemo, useState } from "react";
import pkg from "../../../package.json";

type BuildInfo = {
  vercel?: {
    git?: {
      commitSha?: string | null;
    };
  };
};

export default function VersionBadge() {
  const baseVersion = useMemo(() => `v${pkg.version}`, []);
  const [sha7, setSha7] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/build", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: BuildInfo) => {
        const sha = data?.vercel?.git?.commitSha ?? null;
        const s = sha && sha.length >= 7 ? sha.slice(0, 7) : null;
        if (!cancelled) setSha7(s);
      })
      .catch(() => {
        if (!cancelled) setSha7(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const text = sha7 ? `${baseVersion}-${sha7}` : baseVersion;

  return (
    <div
      className="fixed bottom-2 right-2 z-[9998] rounded border border-grifter-blue bg-black/70 px-2 py-1 text-[10px] font-mono text-grifter-blue ui-caps"
      style={{ backdropFilter: "blur(6px)" }}
      aria-label="Version"
      title={text}
    >
      {text}
    </div>
  );
}


