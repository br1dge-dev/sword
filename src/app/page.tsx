/**
 * HomePage - Hauptseite der SWORD-App
 * 
 * Diese Komponente enthält das ASCII-Schwert und alle UI-Elemente.
 */
"use client";

import { useState, useEffect } from 'react';
import AsciiSword from '@/components/ascii/AsciiSword';
import MusicPlayer from '@/components/ui/MusicPlayer';
import ConfigButton from '@/components/ui/ConfigButton';
import PresetSelector from '@/components/ui/PresetSelector';
import AudioVisualizer from '@/components/ui/AudioVisualizer';
import SideButtons from '@/components/ui/SideButtons';
import { useAudioReactionStore } from '@/store/audioReactionStore';

export default function Home() {
  // Audio-Reaktionsdaten abrufen
  const { energy, beatDetected } = useAudioReactionStore();
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">
      <div className="z-10 w-full max-w-5xl flex flex-col items-center justify-center">
        <AsciiSword />
      </div>
      
      <MusicPlayer />
      <SideButtons />
      <AudioVisualizer energy={energy} beatDetected={beatDetected} />
      <ConfigButton />
      <PresetSelector />
    </main>
  );
} 