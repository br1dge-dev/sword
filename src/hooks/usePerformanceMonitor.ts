import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number | null;
  cpuUsage: number | null;
  renderTime: number;
  audioLatency: number;
  frameDrops: number;
}

interface PerformanceThresholds {
  minFps: number;
  maxMemoryUsage: number;
  maxRenderTime: number;
  maxAudioLatency: number;
}

export function usePerformanceMonitor(
  thresholds: PerformanceThresholds = {
    minFps: 30,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxRenderTime: 16, // 60fps = 16.67ms
    maxAudioLatency: 100
  }
) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: null,
    cpuUsage: null,
    renderTime: 0,
    audioLatency: 0,
    frameDrops: 0
  });
  
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const renderStartTimeRef = useRef(0);
  const audioLatencyRef = useRef(0);
  const frameDropsRef = useRef(0);
  
  // FPS-Berechnung
  const updateFps = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    if (deltaTime >= 1000) { // Jede Sekunde aktualisieren
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
      
      setMetrics(prev => ({
        ...prev,
        fps
      }));
      
      // Warnung bei niedriger FPS
      if (fps < thresholds.minFps) {
        setWarnings(prev => {
          const warning = `Low FPS: ${fps} (target: ${thresholds.minFps})`;
          return prev.includes(warning) ? prev : [...prev, warning];
        });
      }
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    frameCountRef.current++;
  }, [thresholds.minFps]);
  
  // Memory-Usage überwachen
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage
      }));
      
      // Warnung bei hohem Memory-Usage
      if (memoryUsage > thresholds.maxMemoryUsage) {
        setWarnings(prev => {
          const warning = `High memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`;
          return prev.includes(warning) ? prev : [...prev, warning];
        });
      }
    }
  }, [thresholds.maxMemoryUsage]);
  
  // Render-Zeit messen
  const startRenderTimer = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);
  
  const endRenderTimer = useCallback(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime
    }));
    
    // Warnung bei langsamer Render-Zeit
    if (renderTime > thresholds.maxRenderTime) {
      setWarnings(prev => {
        const warning = `Slow render time: ${renderTime.toFixed(2)}ms`;
        return prev.includes(warning) ? prev : [...prev, warning];
      });
    }
    
    // Frame-Drops zählen
    if (renderTime > 16.67) { // Mehr als 60fps-Zeit
      frameDropsRef.current++;
      setMetrics(prev => ({
        ...prev,
        frameDrops: frameDropsRef.current
      }));
    }
  }, [thresholds.maxRenderTime]);
  
  // Audio-Latenz messen
  const measureAudioLatency = useCallback((audioTime: number) => {
    const latency = performance.now() - audioTime;
    audioLatencyRef.current = latency;
    
    setMetrics(prev => ({
      ...prev,
      audioLatency: latency
    }));
    
    // Warnung bei hoher Audio-Latenz
    if (latency > thresholds.maxAudioLatency) {
      setWarnings(prev => {
        const warning = `High audio latency: ${latency.toFixed(2)}ms`;
        return prev.includes(warning) ? prev : [...prev, warning];
      });
    }
  }, [thresholds.maxAudioLatency]);
  
  // Monitoring starten/stoppen
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
    frameDropsRef.current = 0;
    setWarnings([]);
    
    console.log('Performance monitoring started');
  }, []);
  
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('Performance monitoring stopped');
  }, []);
  
  // Monitoring-Loop
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(() => {
      updateFps();
      updateMemoryUsage();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoring, updateFps, updateMemoryUsage]);
  
  // Performance-Report generieren
  const generateReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      warnings,
      summary: {
        performance: metrics.fps >= thresholds.minFps ? 'Good' : 'Poor',
        memory: metrics.memoryUsage && metrics.memoryUsage < thresholds.maxMemoryUsage ? 'Good' : 'Poor',
        rendering: metrics.renderTime < thresholds.maxRenderTime ? 'Good' : 'Poor',
        audio: metrics.audioLatency < thresholds.maxAudioLatency ? 'Good' : 'Poor'
      }
    };
    
    console.log('Performance Report:', report);
    return report;
  }, [metrics, warnings, thresholds]);
  
  // Automatisches Monitoring bei Komponenten-Mount
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);
  
  return {
    metrics,
    warnings,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    startRenderTimer,
    endRenderTimer,
    measureAudioLatency,
    generateReport
  };
} 