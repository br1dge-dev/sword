"use client";

/**
 * PresetSelector.tsx
 * 
 * Komponente zur Auswahl von vordefinierten Konfigurationen für verschiedene Musikstile
 */
import { useState } from 'react';
import { useEffectsStore } from '@/store/effectsReducer';
import { TileEffectConfig } from '@/components/ascii/sword-modules/effects/tileEffects';
import { GlitchEffectConfig } from '@/components/ascii/sword-modules/effects/glitchEffects';
import { ColorEffectConfig } from '@/components/ascii/sword-modules/effects/colorEffects';

// Vordefinierte Konfigurationen für verschiedene Musikstile
const presets: {
  [key: string]: {
    name: string;
    description: string;
    tile: Partial<TileEffectConfig>;
    glitch: Partial<GlitchEffectConfig>;
    color: Partial<ColorEffectConfig>;
  }
} = {
  electronic: {
    name: 'Elektronisch',
    description: 'Dynamische Tiles und Glitches, die stark auf den Beat reagieren',
    tile: {
      minCount: 3,
      maxPercent: 0.4,
      energyCurve: 1.8,
      beatBoost: 2.0,
      waveForm: true,
      clusterSize: {
        min: 2,
        max: 8,
        energyMultiplier: 2.0
      }
    },
    glitch: {
      minCount: 2,
      maxPercent: 0.25,
      energyCurve: 1.5,
      beatBoost: 2.5,
      glitchIntensity: 1.2,
      duration: {
        min: 80,
        max: 250,
        energyMultiplier: 1.8
      }
    },
    color: {
      baseIntensity: 0.7,
      energyMultiplier: 2.2,
      beatBoost: 1.8,
      pulseSpeed: 5,
      colorShift: true,
      hueShift: 0.35
    }
  },
  ambient: {
    name: 'Ambient',
    description: 'Sanfte, fließende Animationen mit subtilen Farbübergängen',
    tile: {
      minCount: 2,
      maxPercent: 0.25,
      energyCurve: 1.2,
      beatBoost: 1.3,
      waveForm: true,
      clusterSize: {
        min: 3,
        max: 6,
        energyMultiplier: 1.5
      }
    },
    glitch: {
      minCount: 1,
      maxPercent: 0.1,
      energyCurve: 1.0,
      beatBoost: 1.2,
      glitchIntensity: 0.7,
      duration: {
        min: 120,
        max: 350,
        energyMultiplier: 1.2
      }
    },
    color: {
      baseIntensity: 0.5,
      energyMultiplier: 1.5,
      beatBoost: 1.2,
      pulseSpeed: 2,
      colorShift: true,
      hueShift: 0.2
    }
  },
  rock: {
    name: 'Rock',
    description: 'Intensive Glitches und kräftige Farbwechsel bei Beats',
    tile: {
      minCount: 4,
      maxPercent: 0.45,
      energyCurve: 2.0,
      beatBoost: 1.8,
      waveForm: false,
      clusterSize: {
        min: 2,
        max: 10,
        energyMultiplier: 2.2
      }
    },
    glitch: {
      minCount: 3,
      maxPercent: 0.3,
      energyCurve: 1.8,
      beatBoost: 2.0,
      glitchIntensity: 1.5,
      duration: {
        min: 60,
        max: 200,
        energyMultiplier: 1.5
      }
    },
    color: {
      baseIntensity: 0.8,
      energyMultiplier: 2.0,
      beatBoost: 2.0,
      pulseSpeed: 6,
      colorShift: true,
      hueShift: 0.4
    }
  },
  hiphop: {
    name: 'Hip-Hop',
    description: 'Rhythmische Tile-Muster mit starker Beat-Reaktion',
    tile: {
      minCount: 3,
      maxPercent: 0.35,
      energyCurve: 1.5,
      beatBoost: 2.2,
      waveForm: true,
      clusterSize: {
        min: 2,
        max: 7,
        energyMultiplier: 1.8
      }
    },
    glitch: {
      minCount: 2,
      maxPercent: 0.2,
      energyCurve: 1.3,
      beatBoost: 2.2,
      glitchIntensity: 1.3,
      duration: {
        min: 70,
        max: 220,
        energyMultiplier: 1.6
      }
    },
    color: {
      baseIntensity: 0.7,
      energyMultiplier: 1.8,
      beatBoost: 2.0,
      pulseSpeed: 4,
      colorShift: true,
      hueShift: 0.3
    }
  },
  jazz: {
    name: 'Jazz',
    description: 'Komplexe, fließende Muster mit subtilen Glitches',
    tile: {
      minCount: 2,
      maxPercent: 0.3,
      energyCurve: 1.3,
      beatBoost: 1.5,
      waveForm: true,
      clusterSize: {
        min: 3,
        max: 8,
        energyMultiplier: 1.7
      }
    },
    glitch: {
      minCount: 1,
      maxPercent: 0.15,
      energyCurve: 1.2,
      beatBoost: 1.6,
      glitchIntensity: 0.9,
      duration: {
        min: 100,
        max: 300,
        energyMultiplier: 1.4
      }
    },
    color: {
      baseIntensity: 0.6,
      energyMultiplier: 1.7,
      beatBoost: 1.5,
      pulseSpeed: 3,
      colorShift: true,
      hueShift: 0.25
    }
  }
};

export default function PresetSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { updateAllConfigs } = useEffectsStore();
  
  // Dropdown öffnen/schließen
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Preset anwenden
  const applyPreset = (presetKey: string) => {
    const preset = presets[presetKey];
    if (preset) {
      updateAllConfigs({
        tile: preset.tile,
        glitch: preset.glitch,
        color: preset.color
      });
      setIsOpen(false);
    }
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg flex items-center justify-center"
          title="Musikstil-Preset wählen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-gray-900 border border-purple-500 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-700 bg-purple-900/30">
              <h3 className="text-white text-sm font-medium">Musikstil wählen</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {Object.keys(presets).map((key) => (
                <button
                  key={key}
                  className="w-full text-left p-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                  onClick={() => applyPreset(key)}
                >
                  <div className="text-white font-medium">{presets[key].name}</div>
                  <div className="text-gray-400 text-xs mt-1">{presets[key].description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 