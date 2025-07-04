/**
 * RootLayout - Main application layout
 * 
 * This is the root layout component that wraps all pages in the application.
 * It provides the HTML structure and includes global styles and metadata.
 */
import type { Metadata } from 'next';
import { Inter, Press_Start_2P } from 'next/font/google';
import '../styles/globals.css';
import FlashWrapper from '@/components/layout/FlashWrapper';

// Initialize the Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] });

// Initialize the Press Start 2P font for pixel-style text
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
});

// Metadata for the application
export const metadata: Metadata = {
  title: 'Griftblade - ASCII Blockchain Visualizer',
  description: 'Real-time Ethereum blockchain visualization in ASCII art',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark overflow-hidden ${pressStart2P.variable}`}>
      <body className={`${inter.className} min-h-screen overflow-hidden horizontal-scanlines`} style={{
        backgroundColor: 'var(--color-bg-primary)',
        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
      }}>
        <FlashWrapper>
          <div className="crt-effect crt-curve-strong vignette min-h-screen overflow-hidden">
            {children}
          </div>
        </FlashWrapper>
      </body>
    </html>
  );
} 