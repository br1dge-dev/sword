/**
 * HomePage - Main application page
 * 
 * This component renders the main page of the SWORD application,
 * featuring the central ASCII sword and blockchain visualization.
 */
"use client";

import AsciiSword from '@/components/ascii/AsciiSword';
import SideButtons from '@/components/ui/SideButtons';
import MusicPlayer from '@/components/ui/MusicPlayer';
import { usePowerUpStore } from '@/store/powerUpStore';
import { useEffect } from "react";

export default function HomePage() {
  // Base level setting (will be overridden by PowerUp)
  const baseSwordLevel = 1;
  
  // Add effect logging
  useEffect(() => {
    // Store original methods
    const originalSetInterval = window.setInterval;
    const originalClearInterval = window.clearInterval;
    const originalSetTimeout = window.setTimeout;
    
    // Tracking objects for all effects
    const effectIntervals: Record<string, { id: number, timing: number, description: string, category: string }> = {};
    const effectTimeouts: Record<string, { id: number, timing: number, description: string, category: string }> = {};
    
    // Effect categories with color codes
    const effectCategories = {
      background: { name: "BACKGROUND", color: "#00AA55" },
      sword: { name: "SWORD", color: "#00FCA6" },
      veins: { name: "VEINS", color: "#44AAFF" },
      charge: { name: "CHARGE", color: "#FFFF00" },
      glitch: { name: "GLITCH", color: "#FF3EC8" },
      vibration: { name: "VIBRATION", color: "#FF8800" }
    };
    
    // Counter for effect occurrences
    const effectCounts: Record<string, number> = {};
    
    // Helper function for logging
    const logEffect = (type: string, category: string, description: string, timing: number) => {
      // Skip veins logs
      if (category === effectCategories.veins.name) return;
      
      // Increase counter
      const effectKey = `${category}-${description}`;
      effectCounts[effectKey] = (effectCounts[effectKey] || 0) + 1;
      
      // Determine color code
      let colorCode = "#FFFFFF";
      Object.values(effectCategories).forEach(cat => {
        if (cat.name === category) colorCode = cat.color;
      });
      
      console.log(`%c[${category}] ${description} (${timing}ms) #${effectCounts[effectKey]}`, 
                 `color: ${colorCode}; font-weight: bold;`);
    };
    
    // setInterval overriden
    window.setInterval = function(callback: TimerHandler, timeout?: number, ...args: any[]): number {
      // Original-Interval erstellen
      const intervalId = originalSetInterval(callback, timeout, ...args);
      
      // Stack-Trace analysieren, um Quelle zu identifizieren
      const stackTrace = new Error().stack || "";
      let effectType = "Unbekannter Effekt";
      let category = "";
      
      if (stackTrace.includes("AsciiSword")) {
        if (timeout && timeout >= 3000) {
          effectType = "Background regeneration";
          category = effectCategories.background.name;
        } else if (stackTrace.includes("veins") || (timeout && timeout >= 1700 && timeout <= 2000)) {
          effectType = "Veins glitch effect";
          category = effectCategories.veins.name;
        } else if (stackTrace.includes("glow") || (timeout && timeout >= 100 && timeout <= 200 && !stackTrace.includes("edge"))) {
          effectType = "Sword glow pulsation";
          category = effectCategories.sword.name;
        } else if (stackTrace.includes("colorChange") || (timeout && timeout >= 100 && timeout <= 150)) {
          effectType = "Sword color change";
          category = effectCategories.sword.name;
        } else if (stackTrace.includes("edge") || (timeout && timeout >= 100 && timeout <= 200)) {
          effectType = "Edge vibration/glitch";
          category = effectCategories.vibration.name;
        } else if (stackTrace.includes("glitch") && !stackTrace.includes("unicodeGlitch") || (timeout && timeout >= 200 && timeout <= 400)) {
          effectType = "Sword glitch effects";
          category = effectCategories.glitch.name;
        } else if (stackTrace.includes("unicodeGlitch") || (timeout && timeout >= 350 && timeout <= 500)) {
          effectType = "Unicode glitch effects";
          category = effectCategories.glitch.name;
        } else if (stackTrace.includes("skew") || (timeout === 300)) {
          effectType = "Skew effects";
          category = effectCategories.glitch.name;
        } else if (stackTrace.includes("faded") || (timeout === 400)) {
          effectType = "Opacity effects";
          category = effectCategories.glitch.name;
        } else if (stackTrace.includes("blur") || (timeout === 350)) {
          effectType = "Blur effects";
          category = effectCategories.glitch.name;
        } else if (stackTrace.includes("background") || stackTrace.includes("Background")) {
          effectType = "Background effect";
          category = effectCategories.background.name;
        }
      }
      
      // Store effect in tracking object
      effectIntervals[intervalId] = {
        id: intervalId,
        timing: timeout || 0,
        description: effectType,
        category: category
      };
      
      // Output to console (only if not veins)
      if (category !== effectCategories.veins.name) {
        logEffect("START", category, effectType, timeout || 0);
      }
      
      return intervalId;
    } as typeof window.setInterval;
    
    // clearInterval overriden - no logs anymore for the end
    window.clearInterval = function(intervalId: number | undefined): void {
      return originalClearInterval(intervalId);
    } as typeof window.clearInterval;
    
    // setTimeout overriden
    window.setTimeout = function(callback: TimerHandler, timeout?: number, ...args: any[]): number {
      // Original-Timeout erstellen
      const timeoutId = originalSetTimeout(callback, timeout, ...args);
      
      // Stack-Trace analysieren, um Quelle zu identifizieren
      const stackTrace = new Error().stack || "";
      let effectType = "Unbekannter Effekt";
      let category = "";
      
      if (stackTrace.includes("AsciiSword")) {
        if (stackTrace.includes("veins") || timeout === 100) {
          effectType = "Veins reset";
          category = effectCategories.veins.name;
        } else if (stackTrace.includes("edge") && timeout && timeout < 100) {
          effectType = "Edge flicker reset";
          category = effectCategories.vibration.name;
        } else if (stackTrace.includes("colorChange") || stackTrace.includes("baseColor")) {
          effectType = "Color change update";
          category = effectCategories.sword.name;
        } else if (stackTrace.includes("background") || stackTrace.includes("Background")) {
          effectType = "Background update";
          category = effectCategories.background.name;
        } else if (stackTrace.includes("unicodeGlitch") || (timeout && timeout >= 100 && timeout <= 160)) {
          effectType = "Unicode glitch reset";
          category = effectCategories.glitch.name;
        }
      }
      
      // Only track relevant timeouts
      if (category && category !== effectCategories.veins.name) {
        effectTimeouts[timeoutId] = {
          id: timeoutId,
          timing: timeout || 0,
          description: effectType,
          category: category
        };
        
        logEffect("TIMEOUT", category, effectType, timeout || 0);
      }
      
      return timeoutId;
    } as typeof window.setTimeout;
    
    // Override console.log for special debug logs
    const originalConsoleLog = console.log;
    console.log = function(...args: any[]) {
      // Check if this is a call from our own logging function to avoid recursion
      const stack = new Error().stack || "";
      if (stack.includes('logEffect')) {
        // Call original log directly to avoid recursion
        return originalConsoleLog.apply(console, args);
      }
      
      // Call original log
      originalConsoleLog.apply(console, args);
      
      // Check if it's a debug log
      if (args.length >= 2 && typeof args[0] === 'string') {
        const logMessage = args[0];
        
        if (logMessage.includes('[COLOR_CHANGE]')) {
          // Extract the color
          const colorMatch = logMessage.match(/New color: (#[0-9A-Fa-f]{6})/);
          if (colorMatch && colorMatch[1]) {
            logEffect("DEBUG", effectCategories.sword.name, `Color change: ${colorMatch[1]}`, 0);
          }
        } else if (logMessage.includes('[BACKGROUND]')) {
          logEffect("DEBUG", effectCategories.background.name, "Background updated", 0);
        } else if (logMessage.includes('[GLITCH]')) {
          // Extract number of glitches
          const glitchMatch = logMessage.match(/Unicode glitches: (\d+)/);
          if (glitchMatch && glitchMatch[1]) {
            logEffect("DEBUG", effectCategories.glitch.name, `Unicode glitches: ${glitchMatch[1]}`, 0);
          }
        }
      }
    };
    
    // Output summary of effects after 2 seconds
    originalSetTimeout(() => {
      console.log("%c=== EFFECTS OVERVIEW ===", "color: white; background: #222; font-size: 16px; font-weight: bold; padding: 5px 10px;");
      
      // Group by category
      const categorizedEffects: Record<string, { description: string, timing: number, count: number }[]> = {};
      
      // Group intervals
      Object.values(effectIntervals).forEach(effect => {
        if (effect.category === effectCategories.veins.name) return;
        
        if (!categorizedEffects[effect.category]) {
          categorizedEffects[effect.category] = [];
        }
        
        const effectKey = `${effect.category}-${effect.description}`;
        const count = effectCounts[effectKey] || 0;
        
        // Check if this effect has already been added
        const existingEffect = categorizedEffects[effect.category].find(e => e.description === effect.description);
        if (!existingEffect) {
          categorizedEffects[effect.category].push({
            description: effect.description,
            timing: effect.timing,
            count: count
          });
        } else {
          // Update the counter
          existingEffect.count = count;
        }
      });
      
      // Output by category
      Object.keys(categorizedEffects).forEach(category => {
        let colorCode = "#FFFFFF";
        Object.values(effectCategories).forEach(cat => {
          if (cat.name === category) colorCode = cat.color;
        });
        
        console.log(`%c${category}:`, `color: ${colorCode}; font-weight: bold;`);
        categorizedEffects[category].forEach(effect => {
          console.log(`  - ${effect.description}: ${effect.timing}ms (occurred ${effect.count}x)`);
        });
      });
      
      // Cleanup of console.log override
      console.log = originalConsoleLog;
    }, 2000);
    
    // Cleanup
    return () => {
      window.setInterval = originalSetInterval;
      window.clearInterval = originalClearInterval;
      window.setTimeout = originalSetTimeout;
      console.log = originalConsoleLog;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-2 px-4 overflow-hidden bg-black">
      <div className="flex-grow flex items-center justify-center w-full h-full">
        <div className="w-full h-full flex items-center justify-center">
          <AsciiSword level={baseSwordLevel} />
        </div>
      </div>
      
      {/* Seitliche Buttons und Progress Bars */}
      <SideButtons />
      
      {/* Music Player (oben rechts, exakt auf gleicher Höhe wie der CLEANSE-Button) */}
      <div className="fixed right-[12%] top-1/2 -translate-y-1/2 z-10">
        <MusicPlayer />
      </div>
    </main>
  );
} 