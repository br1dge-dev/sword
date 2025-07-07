/**
 * RootLayout - Main application layout
 * 
 * This is the root layout component that wraps all pages in the application.
 * It provides the HTML structure and includes global styles and metadata.
 */
'use client';

import { useEffect } from 'react';
import { Inter, Press_Start_2P } from 'next/font/google';
import { useAudioReactionStore } from '@/store/audioReactionStore';
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
  // Wir initialisieren den Fallback NICHT mehr im RootLayout, sondern überlassen das den Komponenten
  
  useEffect(() => {
    // Setze nur den Titel und die Beschreibung
    console.log('RootLayout mounted, fallback started');
    document.title = 'Griftblade - ASCII Blockchain Visualizer';
  }, []);
  
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