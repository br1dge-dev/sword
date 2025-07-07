/**
 * Home Page Component
 * 
 * This is the main page of the application, displaying the ASCII sword visualization.
 * It uses dynamic imports for better performance and code splitting.
 */
"use client";

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import AsciiFrame from '@/components/layout/AsciiFrame';
import MusicPlayer from '@/components/ui/MusicPlayer';
import SideButtons from '@/components/ui/SideButtons';
import MobileControlsOverlay from '@/components/ui/MobileControlsOverlay';
import { useAudioReactionStore } from '@/store/audioReactionStore';
import { usePowerUpStore } from '@/store/powerUpStore';

// Dynamischer Import der großen AsciiSwordModular-Komponente
// Dies verbessert die initiale Ladezeit durch Code-Splitting
const AsciiSwordModular = dynamic(
  () => import('@/components/ascii/sword-modules/AsciiSwordModular'),
  {
    ssr: false, // Deaktiviere serverseitiges Rendering für diese Komponente
    loading: () => (
      <div className="flex items-center justify-center w-full h-full text-cyan-500 font-mono">
        Loading sword...
      </div>
    )
  }
);

// Haupt-Komponente für die Homepage
export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const { energy, beatDetected } = useAudioReactionStore();
  const { currentLevel } = usePowerUpStore();
  
  // Erkennung von mobilen Geräten
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 overflow-hidden relative">
      <AsciiFrame>
        <Suspense fallback={<div className="text-cyan-500 font-mono">Loading...</div>}>
          <AsciiSwordModular 
            directEnergy={energy} 
            directBeat={beatDetected}
            level={currentLevel || 1}
          />
        </Suspense>
      </AsciiFrame>
      
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <MusicPlayer 
          onEnergyChange={(energy) => {}}
          onBeat={() => {}}
        />
      </div>
      
      <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-20">
        <SideButtons />
      </div>
      
      {isMobile && <MobileControlsOverlay />}
    </main>
  );
} 