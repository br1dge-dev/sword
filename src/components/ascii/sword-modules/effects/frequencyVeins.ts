export type FrequencyVein = { x: number; y: number; color: string };

export type FrequencyVeinInput = {
  frequencyData: Uint8Array;
  bgWidth: number;
  bgHeight: number;
  nowMs: number;
  beatDetected: boolean;
  gridPhase01?: number;
  gridBpm?: number;
};

export function generateFrequencyVeins(opts: FrequencyVeinInput): FrequencyVein[] {
  const { frequencyData, bgWidth, bgHeight, nowMs, beatDetected, gridPhase01, gridBpm } = opts;

  // Frequenzbereiche bestimmen
  const bassEnd = Math.floor(frequencyData.length * 0.2);
  const midEnd = Math.floor(frequencyData.length * 0.6);

  // Mittelwerte für Bass, Mid, High
  const bass = frequencyData.slice(0, bassEnd).reduce((a, b) => a + b, 0) / bassEnd;
  const mid = frequencyData.slice(bassEnd, midEnd).reduce((a, b) => a + b, 0) / (midEnd - bassEnd);
  const high = frequencyData.slice(midEnd).reduce((a, b) => a + b, 0) / (frequencyData.length - midEnd);

  // Cluster-Parameter
  const clusterBase = 8;
  const bassCluster = Math.floor(clusterBase + (bass / 255) * 18);
  const midCluster = Math.floor(clusterBase + (mid / 255) * 18);
  const highCluster = Math.floor(clusterBase + (high / 255) * 18);

  // Beat-Pulsieren
  const pulse = beatDetected ? 1.5 : 1.0;

  // BPM-synced phase for animations
  const hasBpmSync = gridBpm && gridBpm > 0 && typeof gridPhase01 === 'number';
  const phase = hasBpmSync ? gridPhase01 : nowMs / 1000;

  // Cluster-Positionen (unten, mitte, oben)
  const clusters = [
    { y: Math.floor(bgHeight * 0.8), count: bassCluster, color: '#3EE6FF' },
    { y: Math.floor(bgHeight * 0.5), count: midCluster, color: '#FFD600' },
    { y: Math.floor(bgHeight * 0.2), count: highCluster, color: '#FF3EC9' },
  ];

  // Generiere Veins für jede Cluster-Gruppe
  const veins: FrequencyVein[] = [];

  clusters.forEach((cluster, i) => {
    for (let c = 0; c < cluster.count; c++) {
      // BPM-synced animation: uses gridPhase01 * 2π for true musical sync
      const spread = Math.floor(bgWidth * 0.3 + Math.sin(phase * Math.PI * 2 + i) * 10);
      const centerX = Math.floor(bgWidth / 2 + Math.sin(phase * Math.PI * 2 * 2 + i * 2) * (bgWidth / 4));
      const angle = (c / cluster.count) * Math.PI * 2;
      const radius = (pulse * 8) + Math.sin(phase * Math.PI * 2 * 4 + c) * 4;
      const x = Math.floor(centerX + Math.cos(angle) * spread + Math.random() * 2);
      const y = Math.floor(cluster.y + Math.sin(angle) * radius + Math.random() * 2);
      veins.push({ x, y, color: cluster.color });
    }
  });

  return veins;
}


