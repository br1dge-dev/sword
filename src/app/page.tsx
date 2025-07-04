/**
 * HomePage - Main application page
 * 
 * This component renders the main page of the SWORD application,
 * featuring the central ASCII sword and blockchain visualization.
 */
import AsciiSword from '@/components/ascii/AsciiSword';
import SideButtons from '@/components/ui/SideButtons';
import MusicPlayer from '@/components/ui/MusicPlayer';
import { usePowerUpStore } from '@/store/powerUpStore';

export default function HomePage() {
  // Die Basis-Level-Einstellung (wird durch PowerUp überschrieben)
  const baseSwordLevel = 1;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-2 px-4 overflow-hidden bg-black">
      <div className="flex-grow flex items-center justify-center w-full h-full">
        <div className="w-full h-full flex items-center justify-center">
          <AsciiSword level={baseSwordLevel} />
        </div>
      </div>
      
      {/* Seitliche Buttons */}
      <SideButtons />
      
      {/* Music Player (unten rechts) */}
      <div className="fixed right-[12%] bottom-8 z-10">
        <MusicPlayer />
      </div>
    </main>
  );
} 