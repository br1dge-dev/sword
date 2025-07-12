/**
 * RootLayout - Main application layout
 * 
 * This is the root layout component that wraps all pages in the application.
 * It provides the HTML structure and includes global styles and metadata.
 */
'use client';

import { useEffect } from 'react';
import { Inter, Press_Start_2P } from 'next/font/google';
import { useAudioReactionStore, useIdleAnimation } from '@/store/audioReactionStore';
import '../styles/globals.css';

// Initialize the Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] });

// Initialize the Press Start 2P font for pixel-style text
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Idle-Animation im Layout starten, damit sie nicht bei Page-Wechseln unterbrochen wird
  const { startIdle, stopIdle } = useAudioReactionStore();
  useIdleAnimation();
  
  useEffect(() => {
    // Starte Idle-Animation beim Mount
    startIdle();
    
    // DEAKTIVIERT: Logging
    // console.log('RootLayout mounted, idle animation started');
    
    return () => {
      // Cleanup beim Unmount
      stopIdle();
    };
  }, [startIdle, stopIdle]);
  
  return (
    <html lang="en" className={`dark overflow-hidden ${pressStart2P.variable}`}>
      <head>
        <meta name="description" content="Real-time Ethereum blockchain visualization in ASCII art" />
      </head>
      <body className={`${inter.className} min-h-screen overflow-hidden horizontal-scanlines`} style={{
        backgroundColor: 'var(--color-bg-primary)',
        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
      }}>
        <div className="crt-effect crt-curve-strong vignette min-h-screen overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
} 