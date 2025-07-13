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
        <title>GR1FTSWORD – ASCII Art & Music Experience</title>
        <meta name="description" content="GR1FTSWORD brings ASCII art and music together. Created by br1dge, with a lot of help from Cursor AI and Suno." />
        <meta name="author" content="br1dge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="GR1FTSWORD – ASCII Art & Music Experience" />
        <meta property="og:description" content="GR1FTSWORD brings ASCII art and music together. Created by br1dge, with a lot of help from Cursor AI and Suno." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://sword.br1dge.xyz/og-image.jpg" />
        <meta property="og:url" content="https://sword.br1dge.xyz/" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="GR1FTSWORD – ASCII Art & Music Experience" />
        <meta name="twitter:description" content="GR1FTSWORD brings ASCII art and music together. Created by br1dge, with a lot of help from Cursor AI and Suno." />
        <meta name="twitter:image" content="https://sword.br1dge.xyz/og-image.jpg" />
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/icons/site.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/android-chrome-512x512.png" />
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