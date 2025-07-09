'use client';

import React, { useState, useEffect } from 'react';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useOptimizedAudioAnalyzer } from '@/hooks/useOptimizedAudioAnalyzer';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { applyAudioConfig, loadAudioConfig, saveAudioConfig, AudioConfig } from '@/lib/audio/configManager';

// Verwende das AudioConfig Interface aus dem configManager

// Standard-Konfiguration
const defaultConfig: AudioConfig = {
  analyzer: {
    analyzeInterval: 50,
    energyThreshold: 0.1,
    beatSensitivity: 1.2,
    useWorker: true,
    fftSize: 1024,
    smoothingTimeConstant: 0.8,
  },
  effects: {
    color: {
      energyThreshold: 0.15,
      energySensitivity: 1.0,
      beatSensitivity: 1.0,
      cooldown: 200,
      duration: 1000,
    },
    glitch: {
      energyThreshold: 0.2,
      energySensitivity: 1.0,
      beatSensitivity: 1.0,
      cooldown: 100,
      duration: 160,
    },
    background: {
      energyThreshold: 0.15,
      energySensitivity: 0.8,
      beatSensitivity: 0.5,
      cooldown: 1500,
      duration: 0,
    },
    veins: {
      energyThreshold: 0.1,
      energySensitivity: 0.9,
      beatSensitivity: 1.0,
      cooldown: 250,
      duration: 1000,
    },
    tiles: {
      energyThreshold: 0.15,
      energySensitivity: 1.0,
      beatSensitivity: 1.0,
      cooldown: 200,
      duration: 800,
    },
  },
  visual: {
    glowIntensity: {
      min: 0.3,
      max: 1.0,
      energyMultiplier: 0.7,
    },
    colorStability: {
      min: 300,
      max: 1500,
      energyReduction: 800,
    },
    tileIntensity: {
      basePercentage: 0.05,
      energyMultiplier: 0.15,
      beatMultiplier: 0.08,
      glitchMultiplier: 0.04,
    },
    glitchFrequency: {
      baseChance: 0.3,
      energyMultiplier: 0.1,
      beatMultiplier: 0.2,
    },
    // Neue Parameter für Veins und Tiles
    veins: {
      baseCount: 10,
      energyMultiplier: 20,
      beatMultiplier: 1.5,
      maxVeins: 300,
      waveForm: true,
    },
    tiles: {
      baseCount: 5,
      energyMultiplier: 15,
      beatMultiplier: 8,
      waveForm: true,
      clusterSize: {
        min: 2,
        max: 6,
        energyMultiplier: 2,
      },
    },
  },
  performance: {
    maxAudioLatency: 50,
    adaptiveQuality: true,
    enablePredictiveBeats: true,
    workerThreads: 1,
  },
  background: {
    patternUpdateInterval: 10, // 10 Sekunden
    veinsUpdateInterval: 4,    // 4 Sekunden
    glitchPatternInterval: 5,  // 5 Sekunden
    colorChangeInterval: {
      level1: 7, // 7 Sekunden für Level 1
      level2: 5, // 5 Sekunden für Level 2
      level3: 3, // 3 Sekunden für Level 3
    },
  },
};

interface AudioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Hilfsfunktion für tiefes Merge
function deepMerge<T>(target: T, source: Partial<T>): T {
  if (typeof target !== 'object' || target === null) return target;
  const output = { ...target } as any;
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      output[key] = deepMerge(target[key] as any, source[key] as any);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

export default function AudioConfigModal({ isOpen, onClose }: AudioConfigModalProps) {
  const [config, setConfig] = useState<AudioConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'analyzer' | 'effects' | 'visual' | 'performance' | 'background' | 'intensity'>('analyzer');
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState('');
  
  const { energy, beatDetected } = useAudioReactionStore();
  
  // Lade gespeicherte Konfiguration beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const savedConfig = loadAudioConfig();
      if (savedConfig) {
        setConfig(deepMerge(defaultConfig, savedConfig));
      }
    }
  }, [isOpen]);
  
  // Speichere Konfiguration
  const saveConfig = () => {
    try {
      // Wende Konfiguration an und speichere sie
      applyAudioConfig(config);
      alert('Konfiguration gespeichert und angewendet!');
    } catch (error) {
      console.error('Fehler beim Speichern der Konfiguration:', error);
      alert('Fehler beim Speichern der Konfiguration!');
    }
  };
  
  // Exportiere Konfiguration
  const exportConfig = () => {
    const exportConfig = {
      ...config,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const jsonString = JSON.stringify(exportConfig, null, 2);
    setExportData(jsonString);
    setShowExport(true);
  };
  
  // Importiere Konfiguration
  const importConfig = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const imported = JSON.parse(event.target.value);
      setConfig({ ...defaultConfig, ...imported });
      alert('Konfiguration importiert!');
    } catch (error) {
      alert('Ungültiges JSON-Format!');
    }
  };
  
  // Update-Funktionen für verschiedene Konfigurationsbereiche
  const updateAnalyzerConfig = (key: keyof AudioConfig['analyzer'], value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      analyzer: {
        ...prev.analyzer,
        [key]: value,
      },
    }));
  };
  
  const updateEffectConfig = (effectType: keyof AudioConfig['effects'], key: keyof AudioConfig['effects']['color'], value: number) => {
    setConfig(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effectType]: {
          ...prev.effects[effectType],
          [key]: value,
        },
      },
    }));
  };
  
  const updateVisualConfig = (section: keyof AudioConfig['visual'], key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      visual: {
        ...prev.visual,
        [section]: {
          ...prev.visual[section],
          [key]: value,
        },
      },
    }));
  };
  
  const updatePerformanceConfig = (key: keyof AudioConfig['performance'], value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        [key]: value,
      },
    }));
  };
  
  const updateBackgroundConfig = (key: keyof AudioConfig['background'], value: number) => {
    setConfig(prev => ({
      ...prev,
      background: {
        ...prev.background,
        [key]: value,
      },
    }));
  };
  
  const updateBackgroundColorConfig = (level: 'level1' | 'level2' | 'level3', value: number) => {
    setConfig(prev => ({
      ...prev,
      background: {
        ...prev.background,
        colorChangeInterval: {
          ...prev.background.colorChangeInterval,
          [level]: value,
        },
      },
    }));
  };
  
  const updateVeinsConfig = (key: keyof AudioConfig['visual']['veins'], value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      visual: {
        ...prev.visual,
        veins: {
          ...prev.visual.veins,
          [key]: value,
        },
      },
    }));
  };
  
  const updateTilesConfig = (key: keyof AudioConfig['visual']['tiles'], value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      visual: {
        ...prev.visual,
        tiles: {
          ...prev.visual.tiles,
          [key]: value,
        },
      },
    }));
  };
  
  const updateTilesClusterConfig = (key: keyof AudioConfig['visual']['tiles']['clusterSize'], value: number) => {
    setConfig(prev => ({
      ...prev,
      visual: {
        ...prev.visual,
        tiles: {
          ...prev.visual.tiles,
          clusterSize: {
            ...prev.visual.tiles.clusterSize,
            [key]: value,
          },
        },
      },
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Audio-Reaktive Konfiguration</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Live-Daten */}
          <div className="mt-2 flex gap-4 text-sm">
            <span>Energie: <span className="text-green-400">{energy.toFixed(3)}</span></span>
            <span>Beat: <span className={beatDetected ? 'text-red-400' : 'text-gray-400'}>{beatDetected ? 'ERKANNT' : 'Nein'}</span></span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {(['analyzer', 'effects', 'visual', 'performance', 'background', 'intensity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab === 'analyzer' && 'Audio Analyzer'}
              {tab === 'effects' && 'Effekt-Reaktivität'}
              {tab === 'visual' && 'Visuelle Effekte'}
              {tab === 'performance' && 'Performance'}
              {tab === 'background' && 'Hintergrund-Timing'}
              {tab === 'intensity' && 'Intensitäts-Skalierung'}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'analyzer' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Audio Analyzer Einstellungen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Analyse-Intervall (ms)
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="100"
                    step="1"
                    value={config.analyzer.analyzeInterval}
                    onChange={(e) => updateAnalyzerConfig('analyzeInterval', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.analyzer.analyzeInterval}ms
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Energie-Schwellenwert
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={config.analyzer.energyThreshold}
                    onChange={(e) => updateAnalyzerConfig('energyThreshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.analyzer.energyThreshold.toFixed(2)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Beat-Sensitivität
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={config.analyzer.beatSensitivity}
                    onChange={(e) => updateAnalyzerConfig('beatSensitivity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.analyzer.beatSensitivity.toFixed(1)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    FFT-Größe
                  </label>
                  <select
                    value={config.analyzer.fftSize}
                    onChange={(e) => updateAnalyzerConfig('fftSize', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value={512}>512 (Schnell)</option>
                    <option value={1024}>1024 (Standard)</option>
                    <option value={2048}>2048 (Hochauflösend)</option>
                    <option value={4096}>4096 (Maximal)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Smoothing-Konstante
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={config.analyzer.smoothingTimeConstant}
                    onChange={(e) => updateAnalyzerConfig('smoothingTimeConstant', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.analyzer.smoothingTimeConstant.toFixed(1)}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useWorker"
                    checked={config.analyzer.useWorker}
                    onChange={(e) => updateAnalyzerConfig('useWorker', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="useWorker" className="text-sm font-medium">
                    Web Worker verwenden
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'effects' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Effekt-Reaktivität</h3>
              
              {(['color', 'glitch', 'background', 'veins', 'tiles'] as const).map((effectType) => (
                <div key={effectType} className="border border-gray-700 rounded-lg p-4">
                  <h4 className="text-md font-medium mb-3 capitalize">{effectType} Effekte</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Energie-Schwellenwert
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={config.effects[effectType].energyThreshold}
                        onChange={(e) => updateEffectConfig(effectType, 'energyThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        {config.effects[effectType].energyThreshold.toFixed(2)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Energie-Sensitivität
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={config.effects[effectType].energySensitivity}
                        onChange={(e) => updateEffectConfig(effectType, 'energySensitivity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        {config.effects[effectType].energySensitivity.toFixed(1)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Beat-Sensitivität
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={config.effects[effectType].beatSensitivity}
                        onChange={(e) => updateEffectConfig(effectType, 'beatSensitivity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        {config.effects[effectType].beatSensitivity.toFixed(1)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cooldown (ms)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="2000"
                        step="50"
                        value={config.effects[effectType].cooldown}
                        onChange={(e) => updateEffectConfig(effectType, 'cooldown', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        {config.effects[effectType].cooldown}ms
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Dauer (ms)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="50"
                        value={config.effects[effectType].duration}
                        onChange={(e) => updateEffectConfig(effectType, 'duration', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">
                        {config.effects[effectType].duration}ms
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'visual' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Visuelle Effekte</h3>
              
              {/* Glow-Intensität */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Glow-Effekt</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimale Intensität</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.1"
                      value={config.visual.glowIntensity.min}
                      onChange={(e) => updateVisualConfig('glowIntensity', 'min', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.glowIntensity.min.toFixed(1)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Maximale Intensität</label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={config.visual.glowIntensity.max}
                      onChange={(e) => updateVisualConfig('glowIntensity', 'max', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.glowIntensity.max.toFixed(1)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={config.visual.glowIntensity.energyMultiplier}
                      onChange={(e) => updateVisualConfig('glowIntensity', 'energyMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.glowIntensity.energyMultiplier.toFixed(1)}</div>
                  </div>
                </div>
              </div>
              
              {/* Tile-Intensität */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Tile-Effekte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Basis-Prozentsatz</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.2"
                      step="0.01"
                      value={config.visual.tileIntensity.basePercentage}
                      onChange={(e) => updateVisualConfig('tileIntensity', 'basePercentage', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{(config.visual.tileIntensity.basePercentage * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.3"
                      step="0.01"
                      value={config.visual.tileIntensity.energyMultiplier}
                      onChange={(e) => updateVisualConfig('tileIntensity', 'energyMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.tileIntensity.energyMultiplier.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Beat-Multiplikator</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.2"
                      step="0.01"
                      value={config.visual.tileIntensity.beatMultiplier}
                      onChange={(e) => updateVisualConfig('tileIntensity', 'beatMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.tileIntensity.beatMultiplier.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Glitch-Multiplikator</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.1"
                      step="0.01"
                      value={config.visual.tileIntensity.glitchMultiplier}
                      onChange={(e) => updateVisualConfig('tileIntensity', 'glitchMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.tileIntensity.glitchMultiplier.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              {/* Glitch-Frequenz */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Glitch-Frequenz</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Basis-Chance</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.1"
                      value={config.visual.glitchFrequency.baseChance}
                      onChange={(e) => updateVisualConfig('glitchFrequency', 'baseChance', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{(config.visual.glitchFrequency.baseChance * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.3"
                      step="0.01"
                      value={config.visual.glitchFrequency.energyMultiplier}
                      onChange={(e) => updateVisualConfig('glitchFrequency', 'energyMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.glitchFrequency.energyMultiplier.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Beat-Multiplikator</label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={config.visual.glitchFrequency.beatMultiplier}
                      onChange={(e) => updateVisualConfig('glitchFrequency', 'beatMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.glitchFrequency.beatMultiplier.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Performance Einstellungen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximale Audio-Latenz (ms)
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={config.performance.maxAudioLatency}
                    onChange={(e) => updatePerformanceConfig('maxAudioLatency', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.performance.maxAudioLatency}ms
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Worker-Threads
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={config.performance.workerThreads}
                    onChange={(e) => updatePerformanceConfig('workerThreads', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.performance.workerThreads} Thread(s)
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="adaptiveQuality"
                    checked={config.performance.adaptiveQuality}
                    onChange={(e) => updatePerformanceConfig('adaptiveQuality', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="adaptiveQuality" className="text-sm font-medium">
                    Adaptive Qualität
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enablePredictiveBeats"
                    checked={config.performance.enablePredictiveBeats}
                    onChange={(e) => updatePerformanceConfig('enablePredictiveBeats', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="enablePredictiveBeats" className="text-sm font-medium">
                    Predictive Beats aktivieren
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'background' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Hintergrund-Timing Einstellungen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hintergrund-Muster-Update (Sekunden)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={config.background.patternUpdateInterval}
                    onChange={(e) => updateBackgroundConfig('patternUpdateInterval', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.background.patternUpdateInterval}s
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Veins-Update (Sekunden)
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={config.background.veinsUpdateInterval}
                    onChange={(e) => updateBackgroundConfig('veinsUpdateInterval', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.background.veinsUpdateInterval}s
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Glitch-Muster-Update (Sekunden)
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="1"
                    value={config.background.glitchPatternInterval}
                    onChange={(e) => updateBackgroundConfig('glitchPatternInterval', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {config.background.glitchPatternInterval}s
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Farbwechsel-Intervalle nach Level</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Level 1 (Sekunden)</label>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="1"
                      value={config.background.colorChangeInterval.level1}
                      onChange={(e) => updateBackgroundColorConfig('level1', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      {config.background.colorChangeInterval.level1}s
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Level 2 (Sekunden)</label>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      step="1"
                      value={config.background.colorChangeInterval.level2}
                      onChange={(e) => updateBackgroundColorConfig('level2', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      {config.background.colorChangeInterval.level2}s
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Level 3 (Sekunden)</label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={config.background.colorChangeInterval.level3}
                      onChange={(e) => updateBackgroundColorConfig('level3', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">
                      {config.background.colorChangeInterval.level3}s
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'intensity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Intensitäts-basierte Skalierung</h3>
              
              {/* Veins-Intensität */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Veins (Äderchen)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Basis-Anzahl</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="1"
                      value={config.visual.veins.baseCount}
                      onChange={(e) => updateVeinsConfig('baseCount', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.veins.baseCount} Veins</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="1"
                      value={config.visual.veins.energyMultiplier}
                      onChange={(e) => updateVeinsConfig('energyMultiplier', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">+{config.visual.veins.energyMultiplier} pro Energie</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Beat-Multiplikator</label>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={config.visual.veins.beatMultiplier}
                      onChange={(e) => updateVeinsConfig('beatMultiplier', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.veins.beatMultiplier.toFixed(1)}x bei Beat</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Maximale Veins</label>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="10"
                      value={config.visual.veins.maxVeins}
                      onChange={(e) => updateVeinsConfig('maxVeins', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.veins.maxVeins} max</div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="veinsWaveForm"
                      checked={config.visual.veins.waveForm}
                      onChange={(e) => updateVeinsConfig('waveForm', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="veinsWaveForm" className="text-sm font-medium">
                      Wellenform-Animation
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Tiles-Intensität */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="text-md font-medium mb-3">Tiles (Farbige Kacheln)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Basis-Anzahl</label>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="1"
                      value={config.visual.tiles.baseCount}
                      onChange={(e) => updateTilesConfig('baseCount', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">{config.visual.tiles.baseCount} Tiles</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={config.visual.tiles.energyMultiplier}
                      onChange={(e) => updateTilesConfig('energyMultiplier', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">+{config.visual.tiles.energyMultiplier} pro Energie</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Beat-Multiplikator</label>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      step="1"
                      value={config.visual.tiles.beatMultiplier}
                      onChange={(e) => updateTilesConfig('beatMultiplier', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-400 mt-1">+{config.visual.tiles.beatMultiplier} bei Beat</div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tilesWaveForm"
                      checked={config.visual.tiles.waveForm}
                      onChange={(e) => updateTilesConfig('waveForm', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="tilesWaveForm" className="text-sm font-medium">
                      Wellenform-Animation
                    </label>
                  </div>
                </div>
                
                {/* Cluster-Größe */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h5 className="text-sm font-medium mb-3">Cluster-Größe</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Minimale Größe</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={config.visual.tiles.clusterSize.min}
                        onChange={(e) => updateTilesClusterConfig('min', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">{config.visual.tiles.clusterSize.min} Tiles</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Maximale Größe</label>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        step="1"
                        value={config.visual.tiles.clusterSize.max}
                        onChange={(e) => updateTilesClusterConfig('max', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">{config.visual.tiles.clusterSize.max} Tiles</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Energie-Multiplikator</label>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={config.visual.tiles.clusterSize.energyMultiplier}
                        onChange={(e) => updateTilesClusterConfig('energyMultiplier', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-400 mt-1">{config.visual.tiles.clusterSize.energyMultiplier.toFixed(1)}x bei Energie</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={saveConfig}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Speichern
            </button>
            <button
              onClick={exportConfig}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Exportieren
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
      
      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-gray-900 text-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Konfiguration Exportieren/Importieren</h3>
                <button
                  onClick={() => setShowExport(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Exportierte Konfiguration:</label>
                <textarea
                  value={exportData}
                  readOnly
                  className="w-full h-64 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Konfiguration importieren:</label>
                <textarea
                  placeholder="Füge hier deine JSON-Konfiguration ein..."
                  onChange={importConfig}
                  className="w-full h-32 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(exportData)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  In Zwischenablage kopieren
                </button>
                <button
                  onClick={() => setShowExport(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 