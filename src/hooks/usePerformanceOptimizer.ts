import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number | null;
  audioLatency: number;
  frameDrops: number;
  cpuUsage: number | null;
}

interface PerformanceConfig {
  targetFps: number;
  maxRenderTime: number;
  maxMemoryUsage: number;
  maxAudioLatency: number;
  adaptiveQuality: boolean;
  dynamicLod: boolean;
}

interface OptimizationLevel {
  level: 'low' | 'medium' | 'high' | 'ultra';
  effects: {
    glowIntensity: number;
    glitchFrequency: number;
    backgroundComplexity: number;
    audioAnalysisRate: number;
    canvasQuality: number;
  };
}

export function usePerformanceOptimizer(
  config: Partial<PerformanceConfig> = {}
): {
  metrics: PerformanceMetrics;
  optimizationLevel: OptimizationLevel;
  recommendations: string[];
  autoOptimize: () => void;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    memoryUsage: null,
    audioLatency: 0,
    frameDrops: 0,
    cpuUsage: null
  });
  
  const [optimizationLevel, setOptimizationLevel] = useState<OptimizationLevel>({
    level: 'high',
    effects: {
      glowIntensity: 1.0,
      glitchFrequency: 1.0,
      backgroundComplexity: 1.0,
      audioAnalysisRate: 1.0,
      canvasQuality: 1.0
    }
  });
  
  const [recommendations, setRecommendations] = useState<string[]>([]);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderStartRef = useRef(0);
  const frameDropCountRef = useRef(0);
  const audioLatencyRef = useRef(0);
  
  const defaultConfig: PerformanceConfig = {
    targetFps: 60,
    maxRenderTime: 16, // 16.67ms für 60fps
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxAudioLatency: 50,
    adaptiveQuality: true,
    dynamicLod: true
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // FPS-Berechnung
  const updateFps = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      setMetrics(prev => ({ ...prev, fps }));
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, []);
  
  // Render-Zeit messen
  const startRender = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);
  
  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartRef.current;
    setMetrics(prev => ({ ...prev, renderTime }));
    
    // Frame-Drops erkennen
    if (renderTime > finalConfig.maxRenderTime) {
      frameDropCountRef.current++;
      setMetrics(prev => ({ ...prev, frameDrops: frameDropCountRef.current }));
    }
  }, [finalConfig.maxRenderTime]);
  
  // Memory-Usage überwachen
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
        cpuUsage: memory.jsHeapSizeLimit ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : null
      }));
    }
  }, []);
  
  // Audio-Latenz messen
  const updateAudioLatency = useCallback((latency: number) => {
    audioLatencyRef.current = latency;
    setMetrics(prev => ({ ...prev, audioLatency: latency }));
  }, []);
  
  // Performance-Analyse und Empfehlungen
  const analyzePerformance = useCallback(() => {
    const newRecommendations: string[] = [];
    
    // FPS-Analyse
    if (metrics.fps < finalConfig.targetFps * 0.8) {
      newRecommendations.push(`FPS zu niedrig (${metrics.fps}). Reduziere Effekte oder erhöhe Performance.`);
    }
    
    // Render-Zeit-Analyse
    if (metrics.renderTime > finalConfig.maxRenderTime) {
      newRecommendations.push(`Render-Zeit zu hoch (${metrics.renderTime.toFixed(1)}ms). Optimiere Rendering-Pipeline.`);
    }
    
    // Memory-Analyse
    if (metrics.memoryUsage && metrics.memoryUsage > finalConfig.maxMemoryUsage) {
      newRecommendations.push(`Memory-Usage zu hoch (${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB). Bereinige nicht verwendete Ressourcen.`);
    }
    
    // Audio-Latenz-Analyse
    if (metrics.audioLatency > finalConfig.maxAudioLatency) {
      newRecommendations.push(`Audio-Latenz zu hoch (${metrics.audioLatency.toFixed(1)}ms). Verwende Web Worker für Audio-Analyse.`);
    }
    
    // Frame-Drops-Analyse
    if (metrics.frameDrops > 10) {
      newRecommendations.push(`${metrics.frameDrops} Frame-Drops erkannt. Reduziere Komplexität.`);
    }
    
    setRecommendations(newRecommendations);
  }, [metrics, finalConfig]);
  
  // Automatische Optimierung
  const autoOptimize = useCallback(() => {
    if (!finalConfig.adaptiveQuality) return;
    
    let newLevel = optimizationLevel.level;
    let newEffects = { ...optimizationLevel.effects };
    
    // Basierend auf FPS optimieren
    if (metrics.fps < 30) {
      newLevel = 'low';
      newEffects = {
        glowIntensity: 0.3,
        glitchFrequency: 0.2,
        backgroundComplexity: 0.5,
        audioAnalysisRate: 0.5,
        canvasQuality: 0.7
      };
    } else if (metrics.fps < 45) {
      newLevel = 'medium';
      newEffects = {
        glowIntensity: 0.6,
        glitchFrequency: 0.6,
        backgroundComplexity: 0.7,
        audioAnalysisRate: 0.7,
        canvasQuality: 0.8
      };
    } else if (metrics.fps < 55) {
      newLevel = 'high';
      newEffects = {
        glowIntensity: 0.8,
        glitchFrequency: 0.8,
        backgroundComplexity: 0.9,
        audioAnalysisRate: 0.9,
        canvasQuality: 0.9
      };
    } else {
      newLevel = 'ultra';
      newEffects = {
        glowIntensity: 1.0,
        glitchFrequency: 1.0,
        backgroundComplexity: 1.0,
        audioAnalysisRate: 1.0,
        canvasQuality: 1.0
      };
    }
    
    // Basierend auf Memory optimieren
    if (metrics.memoryUsage && metrics.memoryUsage > finalConfig.maxMemoryUsage * 0.8) {
      newEffects.backgroundComplexity *= 0.8;
      newEffects.glowIntensity *= 0.8;
    }
    
    // Basierend auf Render-Zeit optimieren
    if (metrics.renderTime > finalConfig.maxRenderTime * 0.8) {
      newEffects.canvasQuality *= 0.9;
      newEffects.glitchFrequency *= 0.8;
    }
    
    setOptimizationLevel({
      level: newLevel,
      effects: newEffects
    });
    
    console.log(`Performance auto-optimized to level: ${newLevel}`, newEffects);
  }, [metrics, optimizationLevel, finalConfig]);
  
  // Kontinuierliche Überwachung
  useEffect(() => {
    const interval = setInterval(() => {
      updateFps();
      updateMemoryUsage();
      analyzePerformance();
      
      if (finalConfig.adaptiveQuality) {
        autoOptimize();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [updateFps, updateMemoryUsage, analyzePerformance, autoOptimize, finalConfig.adaptiveQuality]);
  
  // Performance-Monitoring-API bereitstellen
  useEffect(() => {
    // Globale Performance-Monitoring-Funktionen verfügbar machen
    (window as any).performanceOptimizer = {
      startRender,
      endRender,
      updateAudioLatency,
      getMetrics: () => metrics,
      getOptimizationLevel: () => optimizationLevel,
      autoOptimize
    };
    
    return () => {
      delete (window as any).performanceOptimizer;
    };
  }, [startRender, endRender, updateAudioLatency, metrics, optimizationLevel, autoOptimize]);
  
  return {
    metrics,
    optimizationLevel,
    recommendations,
    autoOptimize
  };
}

// Hook für spezifische Performance-Optimierungen
export function useRenderOptimization() {
  const { metrics, optimizationLevel } = usePerformanceOptimizer({
    targetFps: 60,
    adaptiveQuality: true
  });
  
  // Optimierte Render-Einstellungen basierend auf Performance
  const renderSettings = {
    // Canvas-Qualität anpassen
    canvasScale: optimizationLevel.effects.canvasQuality,
    
    // Effekt-Intensitäten anpassen
    glowIntensity: optimizationLevel.effects.glowIntensity,
    glitchFrequency: optimizationLevel.effects.glitchFrequency,
    
    // Hintergrund-Komplexität anpassen
    backgroundDetail: optimizationLevel.effects.backgroundComplexity,
    
    // Audio-Analyse-Rate anpassen
    audioAnalysisInterval: Math.max(16, Math.floor(50 / optimizationLevel.effects.audioAnalysisRate)),
    
    // LOD (Level of Detail) anpassen
    useLod: metrics.fps < 45,
    lodDistance: metrics.fps < 30 ? 2 : 1
  };
  
  return {
    metrics,
    optimizationLevel,
    renderSettings,
    shouldOptimize: metrics.fps < 50 || metrics.renderTime > 16
  };
}

// Hook für Audio-Performance-Optimierung
export function useAudioPerformanceOptimization() {
  const { metrics, optimizationLevel } = usePerformanceOptimizer({
    maxAudioLatency: 50,
    adaptiveQuality: true
  });
  
  const audioSettings = {
    // Analyse-Intervall anpassen
    analysisInterval: Math.max(16, Math.floor(50 / optimizationLevel.effects.audioAnalysisRate)),
    
    // Web Worker verwenden wenn möglich
    useWorker: true,
    
    // Frequenz-Auflösung anpassen
    fftSize: metrics.audioLatency > 30 ? 1024 : 2048,
    
    // Smoothing anpassen
    smoothingTimeConstant: metrics.audioLatency > 40 ? 0.5 : 0.3,
    
    // Predictive Beats aktivieren
    enablePredictiveBeats: metrics.fps > 45
  };
  
  return {
    metrics,
    audioSettings,
    shouldOptimize: metrics.audioLatency > 30
  };
} 