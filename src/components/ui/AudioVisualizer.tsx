"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAudioReactionStore } from '@/store/audioReactionStore';

interface AudioVisualizerProps {
  energy: number;
  beatDetected: boolean;
  className?: string;
}

export default function AudioVisualizer({ energy, beatDetected, className = '' }: AudioVisualizerProps) {
  const [visualBeatActive, setVisualBeatActive] = useState(false);
  const lastEnergyRef = useRef(energy);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(0);
  
  // Zugriff auf den Fallback-Status
  const isFallbackActive = useAudioReactionStore(state => state.isFallbackActive());
  
  // OPTIMIERT: Reaktive Update-Frequenz für visuellen Impact
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // OPTIMIERT: Throttling auf 30fps für besseren visuellen Impact
    if (timeSinceLastUpdate < 33) { // 33ms = ~30fps (zurück von 67ms für bessere Reaktivität)
      return;
    }
    
    // OPTIMIERT: Empfindlichere Updates für visuellen Impact
    if (Math.abs(energy - lastEnergyRef.current) > 0.02) { // Zurück zu 0.02 für empfindlichere Updates
      lastEnergyRef.current = energy;
      lastUpdateTimeRef.current = now;
    }
  }, [energy]);
  
  // OPTIMIERT: Effizientere Beat-Animation
  useEffect(() => {
    if (beatDetected) {
      setVisualBeatActive(true);
      const timeout = setTimeout(() => {
        setVisualBeatActive(false);
      }, 150); // Animation für 150ms
      
      return () => clearTimeout(timeout);
    }
  }, [beatDetected]);
  
  // OPTIMIERT: Memoisierte Berechnung für bessere Performance
  const activeBars = useMemo(() => {
    const maxBars = 16;
    // Verstärke den Energiewert, um die Visualisierung empfindlicher zu machen
    const amplifiedEnergy = Math.min(1, lastEnergyRef.current * 1.8);
    return Math.max(1, Math.floor(amplifiedEnergy * maxBars));
  }, [lastEnergyRef.current]);
  
  // OPTIMIERT: Memoisierte Styles für bessere Performance
  const containerStyle = useMemo(() => ({
    transform: visualBeatActive ? 'scale(1.1)' : 'scale(1)',
    transition: 'transform 0.15s ease-out'
  }), [visualBeatActive]);
  
  const barStyle = useMemo(() => ({
    transition: 'all 0.1s ease-out',
    backgroundColor: visualBeatActive ? 'var(--color-neon-pink)' : 'var(--color-neon-green)',
    boxShadow: visualBeatActive 
      ? '0 0 10px var(--color-neon-pink), 0 0 20px var(--color-neon-pink)' 
      : '0 0 5px var(--color-neon-green)'
  }), [visualBeatActive]);
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="text-xs font-bold font-press-start-2p text-[#3EE6FF] mb-1">
        AUDIO SYNC
      </div>
      
      {/* Visualisierungs-Container */}
      <div 
        className="h-6 border border-gray-700 bg-gray-900 flex items-end p-0.5 overflow-hidden"
        style={{ 
          boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.2)',
          transition: 'box-shadow 0.1s ease-out',
          width: '100%', // Volle Breite des Containers
          maxWidth: '200px' // Maximale Breite begrenzen
        }}
      >
        {isFallbackActive ? (
          // IDLE-Anzeige für Fallback-Modus
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs font-press-start-2p text-[#3EE6FF]">IDLE</span>
          </div>
        ) : (
          // Normale Visualisierungs-Balken
          Array.from({ length: 12 }).map((_, index) => {
            const isActive = index < Math.ceil(activeBars / 16 * 12);
            const height = 20 - Math.abs(index - 6) * 1.2; // Höhere Balken in der Mitte
            
            return (
              <div
                key={index}
                className={`flex-1 mx-[1px] transition-all duration-150 ${isActive ? 'bg-[#3EE6FF]' : 'bg-gray-800'}`}
                style={{
                  height: `${Math.max(3, (height / 20) * 100)}%`,
                  transform: visualBeatActive && isActive ? 'scaleY(1.4)' : 'scaleY(1)',
                  boxShadow: isActive 
                    ? 'inset 0 0 3px rgba(62,230,255,0.8)' 
                    : 'none'
                }}
              />
            );
          })
        )}
      </div>
      
      {/* Beat-Indikator */}
      <div className="flex justify-between w-full mt-1">
        <div 
          className={`w-2 h-2 rounded-full transition-all duration-150 ${visualBeatActive ? 'bg-[#3EE6FF]' : 'bg-gray-700'}`}
          style={{
            boxShadow: visualBeatActive 
              ? '0 0 8px rgba(62,230,255,0.8)' 
              : 'none'
          }}
        />
        <div className="text-[8px] font-mono text-gray-500">
          {isFallbackActive ? "IDLE" : `E: ${(lastEnergyRef.current * 1.8).toFixed(2)}`}
        </div>
      </div>
    </div>
  );
} 