"use client";

import { useState, useEffect, useRef } from 'react';

interface PerformanceMonitorProps {
  className?: string;
}

export default function PerformanceMonitor({ className = '' }: PerformanceMonitorProps) {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [isHighLoad, setIsHighLoad] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const measurePerformance = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      
      if (deltaTime >= 1000) { // Jede Sekunde messen
        const fps = (frameCountRef.current * 1000) / deltaTime;
        const estimatedCpuUsage = Math.min(100, Math.max(0, (60 - fps) / 60 * 100));
        
        setCpuUsage(estimatedCpuUsage);
        setIsHighLoad(estimatedCpuUsage > 50);
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      frameCountRef.current++;
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameRef.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isHighLoad) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 bg-red-900 border border-red-500 rounded p-2 text-xs ${className}`}>
      <div className="text-red-200 font-bold">⚠️ HIGH CPU USAGE</div>
      <div className="text-red-300">{cpuUsage.toFixed(1)}%</div>
    </div>
  );
} 