/**
 * HomePage - Main application page
 * 
 * This component renders the main page of the SWORD application,
 * featuring the central ASCII sword and blockchain visualization.
 */
import AsciiSword from '@/components/ascii/AsciiSword';
import AsciiTitle from '@/components/ascii/AsciiTitle';
import SideButtons from '@/components/ui/SideButtons';
import { usePowerUpStore } from '@/store/powerUpStore';

export default function HomePage() {
  // Die Basis-Level-Einstellung (wird durch PowerUp überschrieben)
  const baseSwordLevel = 1;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between py-2 px-4 overflow-hidden">
      <div className="w-full flex-none pt-2">
        <AsciiTitle />
      </div>
      
      <div className="flex-grow flex items-center justify-center w-full my-2 relative">
        <div className="w-full max-w-md h-full flex items-center justify-center">
          <AsciiSword level={baseSwordLevel} />
        </div>
      </div>

      {/* Seitliche Buttons */}
      <SideButtons />
    </main>
  );
} 