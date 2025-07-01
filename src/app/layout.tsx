/**
 * RootLayout - Main application layout
 * 
 * This is the root layout component that wraps all pages in the application.
 * It provides the HTML structure and includes global styles and metadata.
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import FlashWrapper from '@/components/layout/FlashWrapper';

// Initialize the Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" className="dark overflow-hidden">
      <body className={`${inter.className} min-h-screen overflow-hidden`} style={{
        backgroundColor: 'var(--color-bg-primary)',
        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
      }}>
        <FlashWrapper>
          <div className="crt-effect scanlines-subtle crt-curve-subtle min-h-screen overflow-hidden">
            {children}
          </div>
        </FlashWrapper>
      </body>
    </html>
  );
} 