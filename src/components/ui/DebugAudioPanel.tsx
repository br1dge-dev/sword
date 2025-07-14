import React, { useEffect, useState } from 'react';
import { globalAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';

const PARAMS = [
  { key: 'energyThreshold', label: 'energyThreshold', min: 0.005, max: 0.05, step: 0.001 },
  { key: 'beatSensitivity', label: 'beatSensitivity', min: 0.5, max: 2.0, step: 0.01 },
  { key: 'analyzeInterval', label: 'analyzeInterval (ms)', min: 20, max: 100, step: 1 },
  { key: 'smoothingTimeConstant', label: 'smoothingTimeConstant', min: 0.5, max: 0.95, step: 0.01 },
  { key: 'adaptiveThreshold', label: 'adaptiveThreshold', min: 0.005, max: 0.1, step: 0.001 },
  { key: 'adaptiveSensitivity', label: 'adaptiveSensitivity', min: 0.5, max: 3.0, step: 0.01 },
  { key: 'minBeatInterval', label: 'minBeatInterval (ms)', min: 60, max: 200, step: 1 },
  { key: 'bassWeight', label: 'Bass-Weight', min: 0.5, max: 3.0, step: 0.01 },
  { key: 'midWeight', label: 'Mid-Weight', min: 0.5, max: 3.0, step: 0.01 },
  { key: 'highWeight', label: 'High-Weight', min: 0.5, max: 3.0, step: 0.01 },
];

export default function DebugAudioPanel() {
  const energy = useAudioReactionStore(s => s.energy);
  const beatDetected = useAudioReactionStore(s => s.beatDetected);

  const [params, setParams] = useState<Record<string, number>>({
    energyThreshold: 0.02,
    beatSensitivity: 1.0,
    analyzeInterval: 50,
    smoothingTimeConstant: 0.8,
    adaptiveThreshold: 0.04,
    adaptiveSensitivity: 1.0,
    minBeatInterval: 120,
    bassWeight: 2.0,
    midWeight: 1.5,
    highWeight: 0.8,
  });

  const handleParamChange = (key: string, value: string | number) => {
    const numValue = typeof value === 'number' ? value : Number(value);
    setParams(prev => ({ ...prev, [key]: numValue }));
    if (!globalAnalyzer) return;
    switch (key) {
      case 'energyThreshold':
        globalAnalyzer.setEnergyThreshold(numValue);
        break;
      case 'beatSensitivity':
        globalAnalyzer.setBeatSensitivity(numValue);
        break;
      case 'analyzeInterval':
        globalAnalyzer.setAnalyzeInterval(numValue);
        break;
      case 'smoothingTimeConstant':
        globalAnalyzer.setSmoothingTimeConstant(numValue);
        break;
      case 'adaptiveThreshold':
        globalAnalyzer.setAdaptiveThreshold(numValue);
        break;
      case 'adaptiveSensitivity':
        globalAnalyzer.setAdaptiveSensitivity(numValue);
        break;
      case 'minBeatInterval':
        globalAnalyzer.setMinBeatInterval(numValue);
        break;
      case 'bassWeight':
        globalAnalyzer.setBassWeight(numValue);
        break;
      case 'midWeight':
        globalAnalyzer.setMidWeight(numValue);
        break;
      case 'highWeight':
        globalAnalyzer.setHighWeight(numValue);
        break;
      default:
        break;
    }
  };

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      width: '100vw',
      height: 140,
      background: 'rgba(20,20,30,0.98)',
      zIndex: 1000,
      borderBottom: '2px solid #444',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '8px 16px 4px 16px',
      boxSizing: 'border-box',
      fontFamily: 'monospace',
      fontSize: 14,
      gap: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ minWidth: 120, marginRight: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#00FCA6', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{energy.toFixed(4)}</span>
          <span style={{ color: beatDetected ? '#FF3EC8' : '#888', fontWeight: 700, fontSize: 15, lineHeight: 1 }}>{beatDetected ? 'Beat' : 'No Beat'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end', width: '100%' }}>
          {PARAMS.map(param => (
            <div key={param.key} style={{ display: 'flex', flexDirection: 'column', minWidth: 110, alignItems: 'flex-start', gap: 2 }}>
              <label style={{ color: '#fff', fontSize: 12, marginBottom: 2 }}>{param.label}</label>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={Number(params[param.key])}
                onChange={e => handleParamChange(param.key, Number(e.target.value))}
                style={{ width: 90 }}
              />
              <input
                type="number"
                min={param.min}
                max={param.max}
                step={param.step}
                value={Number(params[param.key])}
                onChange={e => handleParamChange(param.key, Number(e.target.value))}
                style={{ width: 54, fontSize: 15, marginTop: 1, color: '#00FCA6', background: 'transparent', border: '1px solid #333', borderRadius: 3, padding: '1px 4px' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 