/**
 * configManager.ts
 * 
 * Manager für Audio-Konfigurationen.
 * Überträgt Einstellungen aus dem Modal in die verschiedenen Audio-Komponenten.
 */

import { useState, useEffect } from 'react';

// Konfigurations-Interface (identisch mit dem Modal)
export interface AudioConfig {
  analyzer: {
    analyzeInterval: number;
    energyThreshold: number;
    beatSensitivity: number;
    useWorker: boolean;
    fftSize: number;
    smoothingTimeConstant: number;
  };
  
  effects: {
    color: {
      energyThreshold: number;
      energySensitivity: number;
      beatSensitivity: number;
      cooldown: number;
      duration: number;
    };
    glitch: {
      energyThreshold: number;
      energySensitivity: number;
      beatSensitivity: number;
      cooldown: number;
      duration: number;
    };
    background: {
      energyThreshold: number;
      energySensitivity: number;
      beatSensitivity: number;
      cooldown: number;
      duration: number;
    };
    veins: {
      energyThreshold: number;
      energySensitivity: number;
      beatSensitivity: number;
      cooldown: number;
      duration: number;
    };
    tiles: {
      energyThreshold: number;
      energySensitivity: number;
      beatSensitivity: number;
      cooldown: number;
      duration: number;
    };
  };
  
  visual: {
    glowIntensity: {
      min: number;
      max: number;
      energyMultiplier: number;
    };
    colorStability: {
      min: number;
      max: number;
      energyReduction: number;
    };
    tileIntensity: {
      basePercentage: number;
      energyMultiplier: number;
      beatMultiplier: number;
      glitchMultiplier: number;
    };
    glitchFrequency: {
      baseChance: number;
      energyMultiplier: number;
      beatMultiplier: number;
    };
    // Neue Parameter für Veins und Tiles
    veins: {
      baseCount: number;
      energyMultiplier: number;
      beatMultiplier: number;
      maxVeins: number;
      waveForm: boolean;
    };
    tiles: {
      baseCount: number;
      energyMultiplier: number;
      beatMultiplier: number;
      waveForm: boolean;
      clusterSize: {
        min: number;
        max: number;
        energyMultiplier: number;
      };
    };
  };
  
  performance: {
    maxAudioLatency: number;
    adaptiveQuality: boolean;
    enablePredictiveBeats: boolean;
    workerThreads: number;
  };
  
  // Hintergrund-Timing Einstellungen
  background: {
    patternUpdateInterval: number; // Sekunden zwischen Hintergrund-Musterwechseln
    veinsUpdateInterval: number;   // Sekunden zwischen Veins-Updates
    glitchPatternInterval: number; // Sekunden zwischen Glitch-Musterwechseln
    colorChangeInterval: {
      level1: number; // Sekunden für Level 1
      level2: number; // Sekunden für Level 2
      level3: number; // Sekunden für Level 3
    };
  };
}

// Globale Referenzen auf Audio-Analyzer
let globalAudioAnalyzer: any = null;
let globalOptimizedAnalyzer: any = null;

// Registriere Audio-Analyzer für Konfigurations-Updates
export function registerAudioAnalyzer(analyzer: any, type: 'standard' | 'optimized') {
  if (type === 'standard') {
    globalAudioAnalyzer = analyzer;
  } else {
    globalOptimizedAnalyzer = analyzer;
  }
}

// Entferne Audio-Analyzer-Referenzen
export function unregisterAudioAnalyzer(type: 'standard' | 'optimized') {
  if (type === 'standard') {
    globalAudioAnalyzer = null;
  } else {
    globalOptimizedAnalyzer = null;
  }
}

// Lade gespeicherte Konfiguration
export function loadAudioConfig(): AudioConfig | null {
  try {
    const savedConfig = localStorage.getItem('audioConfig');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
  } catch (error) {
    console.error('Fehler beim Laden der Audio-Konfiguration:', error);
  }
  return null;
}

// Speichere Konfiguration
export function saveAudioConfig(config: AudioConfig): boolean {
  try {
    localStorage.setItem('audioConfig', JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Audio-Konfiguration:', error);
    return false;
  }
}

// Wende Konfiguration auf Audio-Analyzer an
export function applyAudioConfig(config: AudioConfig): void {
  console.log('Wende Audio-Konfiguration an:', config);
  
  // Wende Konfiguration auf Standard-Analyzer an
  if (globalAudioAnalyzer) {
    try {
      // Update Analyzer-Optionen
      if (globalAudioAnalyzer.options) {
        globalAudioAnalyzer.options.analyzeInterval = config.analyzer.analyzeInterval;
        globalAudioAnalyzer.options.energyThreshold = config.analyzer.energyThreshold;
        globalAudioAnalyzer.options.beatSensitivity = config.analyzer.beatSensitivity;
      }
      
      // Update Analyzer-Nodes wenn verfügbar
      if (globalAudioAnalyzer.analyser) {
        globalAudioAnalyzer.analyser.fftSize = config.analyzer.fftSize;
        globalAudioAnalyzer.analyser.smoothingTimeConstant = config.analyzer.smoothingTimeConstant;
      }
      
      console.log('Standard-Analyzer-Konfiguration angewendet');
    } catch (error) {
      console.error('Fehler beim Anwenden der Konfiguration auf Standard-Analyzer:', error);
    }
  }
  
  // Wende Konfiguration auf optimierten Analyzer an
  if (globalOptimizedAnalyzer) {
    try {
      // Update Analyzer-Optionen
      if (globalOptimizedAnalyzer.options) {
        globalOptimizedAnalyzer.options.analyzeInterval = config.analyzer.analyzeInterval;
        globalOptimizedAnalyzer.options.energyThreshold = config.analyzer.energyThreshold;
        globalOptimizedAnalyzer.options.beatSensitivity = config.analyzer.beatSensitivity;
        globalOptimizedAnalyzer.options.useWorker = config.analyzer.useWorker;
      }
      
      // Update Analyzer-Nodes wenn verfügbar
      if (globalOptimizedAnalyzer.analyser) {
        globalOptimizedAnalyzer.analyser.fftSize = config.analyzer.fftSize;
        globalOptimizedAnalyzer.analyser.smoothingTimeConstant = config.analyzer.smoothingTimeConstant;
      }
      
      console.log('Optimierter Analyzer-Konfiguration angewendet');
    } catch (error) {
      console.error('Fehler beim Anwenden der Konfiguration auf optimierten Analyzer:', error);
    }
  }
  
  // Speichere Konfiguration in localStorage
  saveAudioConfig(config);
  
  // Emittiere Custom Event für andere Komponenten
  window.dispatchEvent(new CustomEvent('audioConfigChanged', { detail: config }));
}

// Export-Funktion für manuelle Konfiguration
export function exportAudioConfig(): string {
  const config = loadAudioConfig();
  if (config) {
    return JSON.stringify(config, null, 2);
  }
  return '';
}

// Import-Funktion für manuelle Konfiguration
export function importAudioConfig(configString: string): boolean {
  try {
    const config = JSON.parse(configString);
    applyAudioConfig(config);
    return true;
  } catch (error) {
    console.error('Fehler beim Importieren der Audio-Konfiguration:', error);
    return false;
  }
}

// Hook für Konfigurations-Updates
export function useAudioConfig() {
  const [config, setConfig] = useState<AudioConfig | null>(null);
  
  useEffect(() => {
    // Lade initiale Konfiguration
    const savedConfig = loadAudioConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
    
    // Event-Listener für Konfigurations-Änderungen
    const handleConfigChange = (event: CustomEvent) => {
      setConfig(event.detail);
    };
    
    window.addEventListener('audioConfigChanged', handleConfigChange as EventListener);
    
    return () => {
      window.removeEventListener('audioConfigChanged', handleConfigChange as EventListener);
    };
  }, []);
  
  return config;
}

// Utility-Funktionen für spezifische Konfigurationswerte
export function getAnalyzerConfig() {
  const config = loadAudioConfig();
  return config?.analyzer || null;
}

export function getEffectsConfig() {
  const config = loadAudioConfig();
  return config?.effects || null;
}

export function getVisualConfig() {
  const config = loadAudioConfig();
  return config?.visual || null;
}

export function getPerformanceConfig() {
  const config = loadAudioConfig();
  return config?.performance || null;
} 