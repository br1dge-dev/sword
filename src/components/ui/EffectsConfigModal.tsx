"use client";

/**
 * EffectsConfigModal.tsx
 * 
 * Konfigurationsmodal für die Anpassung der Effekte des ASCII-Schwerts
 */
import { useState, useEffect } from 'react';
import { TileEffectConfig, defaultTileConfig } from '../ascii/sword-modules/effects/tileEffects';
import { GlitchEffectConfig, defaultGlitchConfig } from '../ascii/sword-modules/effects/glitchEffects';
import { ColorEffectConfig, defaultColorConfig } from '../ascii/sword-modules/effects/colorEffects';

interface EffectsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: {
    tile: TileEffectConfig;
    glitch: GlitchEffectConfig;
    color: ColorEffectConfig;
  }) => void;
  initialConfig?: {
    tile?: Partial<TileEffectConfig>;
    glitch?: Partial<GlitchEffectConfig>;
    color?: Partial<ColorEffectConfig>;
  };
}

export default function EffectsConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig = {}
}: EffectsConfigModalProps) {
  // Konfigurationszustände
  const [tileConfig, setTileConfig] = useState<TileEffectConfig>({
    ...defaultTileConfig,
    ...(initialConfig.tile || {})
  });
  
  const [glitchConfig, setGlitchConfig] = useState<GlitchEffectConfig>({
    ...defaultGlitchConfig,
    ...(initialConfig.glitch || {})
  });
  
  const [colorConfig, setColorConfig] = useState<ColorEffectConfig>({
    ...defaultColorConfig,
    ...(initialConfig.color || {})
  });
  
  // Aktiver Tab
  const [activeTab, setActiveTab] = useState<'tile' | 'glitch' | 'color'>('tile');
  
  // Konfigurationen zurücksetzen
  const resetConfigs = () => {
    setTileConfig({...defaultTileConfig});
    setGlitchConfig({...defaultGlitchConfig});
    setColorConfig({...defaultColorConfig});
  };
  
  // Konfigurationen speichern
  const handleSave = () => {
    onSave({
      tile: tileConfig,
      glitch: glitchConfig,
      color: colorConfig
    });
    onClose();
  };
  
  // Wenn das Modal geschlossen wird, ohne zu speichern
  const handleClose = () => {
    // Optional: Konfigurationen zurücksetzen
    onClose();
  };
  
  // Wenn das Modal nicht geöffnet ist, nichts rendern
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 border border-cyan-500 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400">Effekt-Konfiguration</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex mb-4 border-b border-gray-700">
          <button
            className={`px-4 py-2 ${activeTab === 'tile' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('tile')}
          >
            Tiles
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'glitch' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('glitch')}
          >
            Glitches
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'color' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('color')}
          >
            Farben
          </button>
        </div>
        
        {/* Tab-Inhalte */}
        <div className="mb-6">
          {activeTab === 'tile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Minimale Anzahl Tiles
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={tileConfig.minCount}
                  onChange={(e) => setTileConfig({...tileConfig, minCount: parseInt(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>1</span>
                  <span>{tileConfig.minCount}</span>
                  <span>10</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Maximaler Prozentsatz (%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={tileConfig.maxPercent}
                  onChange={(e) => setTileConfig({...tileConfig, maxPercent: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>10%</span>
                  <span>{Math.round(tileConfig.maxPercent * 100)}%</span>
                  <span>80%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Energie-Kurve
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={tileConfig.energyCurve}
                  onChange={(e) => setTileConfig({...tileConfig, energyCurve: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Linear (0.5)</span>
                  <span>{tileConfig.energyCurve.toFixed(1)}</span>
                  <span>Exponentiell (3.0)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Beat-Boost
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={tileConfig.beatBoost}
                  onChange={(e) => setTileConfig({...tileConfig, beatBoost: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Kein Boost (1.0)</span>
                  <span>{tileConfig.beatBoost.toFixed(1)}</span>
                  <span>Stark (3.0)</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="waveForm"
                  checked={tileConfig.waveForm}
                  onChange={(e) => setTileConfig({...tileConfig, waveForm: e.target.checked})}
                  className="mr-2 accent-cyan-500"
                />
                <label htmlFor="waveForm" className="text-sm font-medium text-gray-300">
                  Wellenform-Animation aktivieren
                </label>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Cluster-Größe</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Minimum</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={tileConfig.clusterSize.min}
                      onChange={(e) => setTileConfig({
                        ...tileConfig, 
                        clusterSize: {
                          ...tileConfig.clusterSize,
                          min: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1</span>
                      <span>{tileConfig.clusterSize.min}</span>
                      <span>5</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Maximum</label>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="1"
                      value={tileConfig.clusterSize.max}
                      onChange={(e) => setTileConfig({
                        ...tileConfig, 
                        clusterSize: {
                          ...tileConfig.clusterSize,
                          max: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>3</span>
                      <span>{tileConfig.clusterSize.max}</span>
                      <span>12</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'glitch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Minimale Anzahl Glitches
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={glitchConfig.minCount}
                  onChange={(e) => setGlitchConfig({...glitchConfig, minCount: parseInt(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>{glitchConfig.minCount}</span>
                  <span>5</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Maximaler Prozentsatz (%)
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={glitchConfig.maxPercent}
                  onChange={(e) => setGlitchConfig({...glitchConfig, maxPercent: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5%</span>
                  <span>{Math.round(glitchConfig.maxPercent * 100)}%</span>
                  <span>50%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Energie-Kurve
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={glitchConfig.energyCurve}
                  onChange={(e) => setGlitchConfig({...glitchConfig, energyCurve: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Linear (0.5)</span>
                  <span>{glitchConfig.energyCurve.toFixed(1)}</span>
                  <span>Exponentiell (3.0)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Beat-Boost
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={glitchConfig.beatBoost}
                  onChange={(e) => setGlitchConfig({...glitchConfig, beatBoost: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Kein Boost (1.0)</span>
                  <span>{glitchConfig.beatBoost.toFixed(1)}</span>
                  <span>Stark (3.0)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Glitch-Intensität
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={glitchConfig.glitchIntensity}
                  onChange={(e) => setGlitchConfig({...glitchConfig, glitchIntensity: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Subtil (0.5)</span>
                  <span>{glitchConfig.glitchIntensity.toFixed(1)}</span>
                  <span>Intensiv (2.0)</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Glitch-Dauer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Minimum (ms)</label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={glitchConfig.duration.min}
                      onChange={(e) => setGlitchConfig({
                        ...glitchConfig, 
                        duration: {
                          ...glitchConfig.duration,
                          min: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>50ms</span>
                      <span>{glitchConfig.duration.min}ms</span>
                      <span>200ms</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Maximum (ms)</label>
                    <input
                      type="range"
                      min="150"
                      max="500"
                      step="50"
                      value={glitchConfig.duration.max}
                      onChange={(e) => setGlitchConfig({
                        ...glitchConfig, 
                        duration: {
                          ...glitchConfig.duration,
                          max: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>150ms</span>
                      <span>{glitchConfig.duration.max}ms</span>
                      <span>500ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'color' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Basis-Intensität
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.1"
                  value={colorConfig.baseIntensity}
                  onChange={(e) => setColorConfig({...colorConfig, baseIntensity: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Dunkel (0.2)</span>
                  <span>{colorConfig.baseIntensity.toFixed(1)}</span>
                  <span>Hell (1.0)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Energie-Multiplikator
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={colorConfig.energyMultiplier}
                  onChange={(e) => setColorConfig({...colorConfig, energyMultiplier: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Schwach (0.5)</span>
                  <span>{colorConfig.energyMultiplier.toFixed(1)}</span>
                  <span>Stark (3.0)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Beat-Boost
                </label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={colorConfig.beatBoost}
                  onChange={(e) => setColorConfig({...colorConfig, beatBoost: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Kein Boost (1.0)</span>
                  <span>{colorConfig.beatBoost.toFixed(1)}</span>
                  <span>Stark (2.5)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Pulsgeschwindigkeit
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={colorConfig.pulseSpeed}
                  onChange={(e) => setColorConfig({...colorConfig, pulseSpeed: parseInt(e.target.value)})}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Langsam (1)</span>
                  <span>{colorConfig.pulseSpeed}</span>
                  <span>Schnell (10)</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="colorShift"
                  checked={colorConfig.colorShift}
                  onChange={(e) => setColorConfig({...colorConfig, colorShift: e.target.checked})}
                  className="mr-2 accent-cyan-500"
                />
                <label htmlFor="colorShift" className="text-sm font-medium text-gray-300">
                  Farbverschiebung bei hoher Energie
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Farbverschiebungs-Stärke
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={colorConfig.hueShift}
                  onChange={(e) => setColorConfig({...colorConfig, hueShift: parseFloat(e.target.value)})}
                  className="w-full accent-cyan-500"
                  disabled={!colorConfig.colorShift}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Subtil (0.1)</span>
                  <span>{colorConfig.hueShift.toFixed(2)}</span>
                  <span>Stark (0.5)</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Aktionen */}
        <div className="flex justify-between">
          <button
            onClick={resetConfigs}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Zurücksetzen
          </button>
          <div className="space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 