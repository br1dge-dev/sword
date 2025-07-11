# Audio-Analyzer Manifest

## Ziel
Bestehende visuelle Effekte der Anwendung mit Audio-Reaktivität ausstatten, ohne neue Effekte hinzuzufügen. Die Effekte sollen nicht mehr zufällig, sondern basierend auf der Musik ausgelöst werden.

## Vereinfachter Ansatz
Wir nutzen nur zwei Audio-Metriken:
1. **Energy Level** (0-1): Gesamtenergie des Audiosignals
2. **Beat Detection**: Erkennung von Beats im Audiosignal

## Komponenten

### 1. Zentraler Audio-Reaction-Store
Ein minimalistischer Store, der nur die wesentlichen Audio-Daten enthält:

```typescript
// src/store/audioReactionStore.ts
import { create } from 'zustand';

interface AudioReactionState {
  energy: number;
  beatDetected: boolean;
  lastBeatTime: number;
  
  // Aktionen
  updateEnergy: (energy: number) => void;
  triggerBeat: () => void;
}

export const useAudioReactionStore = create<AudioReactionState>((set) => ({
  energy: 0,
  beatDetected: false,
  lastBeatTime: 0,
  
  updateEnergy: (energy) => set({ energy }),
  
  triggerBeat: () => set({ 
    beatDetected: true,
    lastBeatTime: Date.now()
  }),
}));
```

### 2. Integration mit bestehendem Audio-Analyzer
Den bestehenden Audio-Analyzer mit dem Store verbinden, ohne zusätzliche Analyse:

```typescript
// Erweiterung in useAudioAnalyzer.ts
import { useAudioReactionStore } from '@/store/audioReactionStore';

export function useAudioAnalyzer(options?: UseAudioAnalyzerOptions): UseAudioAnalyzerReturn {
  // Bestehender Code...
  
  const { updateEnergy, triggerBeat } = useAudioReactionStore();
  
  // Erweiterte Optionen
  const enhancedOptions = {
    ...options,
    onBeat: (time) => {
      triggerBeat();
      options?.onBeat?.(time);
    },
    onEnergy: (e) => {
      updateEnergy(e);
      options?.onEnergy?.(e);
    }
  };
  
  // Bestehender Code mit enhancedOptions...
}
```

### 3. Beat-Reset-Mechanismus
Automatisches Zurücksetzen des Beat-Flags nach kurzer Zeit:

```typescript
// Im AudioReactionStore
useEffect(() => {
  if (beatDetected) {
    const timeout = setTimeout(() => {
      set({ beatDetected: false });
    }, 100); // Beat-Flag nach 100ms zurücksetzen
    
    return () => clearTimeout(timeout);
  }
}, [beatDetected]);
```

## Anpassung der bestehenden Effekte

### 1. Ersetzen von zufälligen Intervallen
Bestehende Intervalle in AsciiSwordModular.tsx durch Audio-reaktive useEffects ersetzen:

```typescript
// In AsciiSwordModular.tsx
import { useAudioReactionStore } from '@/store/audioReactionStore';

export default function AsciiSwordModular({ level = 1 }: AsciiSwordProps) {
  // Bestehender Code...
  
  // Audio-Reaktionsdaten abrufen
  const { energy, beatDetected } = useAudioReactionStore();
  
  // Audio-reaktive Glow-Effekte (ersetzt intervalsRef.current.glow)
  useEffect(() => {
    if (beatDetected) {
      // Bestehende Glow-Logik bei Beat-Erkennung auslösen
      const randomIntensity = Math.random() * 0.7 + 0.3;
      setGlowIntensity(randomIntensity);
    }
  }, [beatDetected]);
  
  // Audio-reaktive Farb-Effekte (ersetzt intervalsRef.current.colorChange)
  useEffect(() => {
    // Bei hoher Energie oder Beat Farbwechsel auslösen
    if (energy > 0.6 || beatDetected) {
      const now = Date.now();
      const timeSinceLastChange = now - lastColorChangeTime;
      
      // Nur Farbwechsel erlauben, wenn die minimale Stabilitätszeit überschritten ist
      if (timeSinceLastChange >= colorStability) {
        // Erzeuge eine harmonische Farbkombination
        const { swordColor, bgColor: newBgColor } = generateHarmonicColorPair();
        
        // Setze die neuen Farben
        setBaseColor(swordColor);
        setBgColor(newBgColor);
        
        // Aktualisiere den Zeitstempel für den letzten Farbwechsel
        setLastColorChangeTime(now);
        
        // Setze eine neue zufällige Stabilitätszeit
        setColorStability(Math.floor(Math.random() * 1200) + 300);
      }
    }
  }, [energy, beatDetected, lastColorChangeTime, colorStability]);
  
  // Audio-reaktive Glitch-Effekte (ersetzt intervalsRef.current.glitch)
  useEffect(() => {
    if (beatDetected || energy > 0.5) {
      // Generiere Glitch-Zeichen
      const swordPositions = getSwordPositions();
      const newGlitches: Array<{x: number, y: number, char: string}> = [];
      // Anzahl der Glitches basierend auf Energie
      const numGlitches = Math.floor(Math.random() * 9) + 2;
      
      for (let i = 0; i < numGlitches; i++) {
        // Wähle eine zufällige Position aus den Schwert-Positionen
        if (swordPositions.length === 0) continue;
        
        const randomPosIndex = Math.floor(Math.random() * swordPositions.length);
        const pos = swordPositions[randomPosIndex];
        
        newGlitches.push({
          x: pos.x,
          y: pos.y,
          char: glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)]
        });
      }
      
      setGlitchChars(newGlitches);
      
      // Glitches nach kurzer Zeit zurücksetzen
      setTimeout(() => {
        setGlitchChars([]);
      }, 80);
    }
  }, [beatDetected, energy]);
  
  // Audio-reaktive Edge-Effekte (ersetzt intervalsRef.current.edge)
  useEffect(() => {
    if (beatDetected || energy > 0.4) {
      // Wenn keine Kanten vorhanden sind, nichts tun
      const edgePositions = getEdgePositions();
      if (edgePositions.length === 0) return;
      
      // Neue Edge-Effekte basierend auf chargeLevel
      const newEdgeEffects: Array<{x: number, y: number, char?: string, color?: string, offset?: {x: number, y: number}}> = [];
      
      // Intensität basierend auf chargeLevel
      const vibrationChance = vibrationIntensity[chargeLevel as keyof typeof vibrationIntensity] || 0.2;
      const glitchChance = glitchFrequency[chargeLevel as keyof typeof glitchFrequency] || 0.1;
      const colorChance = colorEffectFrequency[chargeLevel as keyof typeof colorEffectFrequency] || 0.15;
      
      // Multiplier für Level 2 (erhöht die Chance um 50%)
      const glitchMultiplier = chargeLevel === 2 ? 1.5 : 1;
      
      // Durchlaufe alle Kantenpositionen
      edgePositions.forEach(pos => {
        // Vibrations-Effekt (Verschiebung)
        if (Math.random() < vibrationChance) {
          const offsetX = Math.random() < 0.5 ? -1 : 1;
          const offsetY = Math.random() < 0.5 ? -1 : 1;
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            offset: { x: offsetX, y: offsetY }
          });
        }
        
        // Glitch-Effekt (Zeichenersetzung)
        if (Math.random() < glitchChance * glitchMultiplier) {
          // Korrekte Typbehandlung für edgeGlitchChars
          const glitchCharSet = Math.floor(Math.random() * edgeGlitchChars[1].length);
          const glitchChar = edgeGlitchChars[1][glitchCharSet];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            char: glitchChar
          });
        }
        
        // Farb-Effekt
        if (Math.random() < colorChance) {
          const colorIndex = Math.floor(Math.random() * accentColors.length);
          const edgeColor = accentColors[colorIndex];
          
          newEdgeEffects.push({
            x: pos.x,
            y: pos.y,
            color: edgeColor
          });
        }
      });
      
      // Setze die neuen Edge-Effekte
      setEdgeEffects(newEdgeEffects);
      
      // Zurücksetzen nach kurzer Zeit
      setTimeout(() => {
        setEdgeEffects([]);
      }, 100);
    }
  }, [beatDetected, energy, chargeLevel]);
  
  // Audio-reaktive Unicode-Glitch-Effekte (ersetzt intervalsRef.current.unicodeGlitch)
  useEffect(() => {
    if (beatDetected || energy > 0.7) {
      // Wahrscheinlichkeit für Unicode-Glitches basierend auf glitchLevel
      const glitchChance = 0.3 + (glitchLevel * 0.1); // 30%, 40%, 50%, 60%
      
      if (Math.random() < glitchChance) {
        // Anzahl der Glitches basierend auf glitchLevel
        const numGlitches = glitchLevel * 3 + glitchLevel; // 4, 8, 12
        
        // Generiere Unicode-Glitches
        const swordPositions = getSwordPositions();
        const newUnicodeGlitches = generateUnicodeGlitches(
          swordPositions,
          numGlitches
        );
        
        setUnicodeGlitches(newUnicodeGlitches);
        
        // Zurücksetzen nach kurzer Zeit
        setTimeout(() => {
          setUnicodeGlitches([]);
        }, 100 + (glitchLevel * 20)); // Längere Dauer bei höherem glitchLevel
      }
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // Audio-reaktive Hintergrund-Effekte (ersetzt intervalsRef.current.background)
  useEffect(() => {
    if (beatDetected) {
      // Größe für den Hintergrund bestimmen
      const bgWidth = 120;
      const bgHeight = 80;
      
      // Generiere den Höhlenhintergrund
      setCaveBackground(generateCaveBackground(bgWidth, bgHeight));
    }
  }, [beatDetected]);
  
  // Audio-reaktive Adern-Effekte (ersetzt intervalsRef.current.veins)
  useEffect(() => {
    if (beatDetected || energy > 0.6) {
      // Größe für den Hintergrund bestimmen
      const bgWidth = 120;
      const bgHeight = 80;
      
      // Generiere farbige Äderchen basierend auf glitchLevel
      const veinMultiplier = veinIntensity[glitchLevel as keyof typeof veinIntensity] || 1;
      const numVeins = Math.floor((bgWidth * bgHeight) / (300 / veinMultiplier));
      setColoredVeins(generateColoredVeins(bgWidth, bgHeight, numVeins));
    }
  }, [beatDetected, energy, glitchLevel]);
  
  // Bestehender Code...
}
```

### 2. Aufräumen der alten Intervalle
Entfernen der nicht mehr benötigten Intervalle:

```typescript
// In AsciiSwordModular.tsx
useEffect(() => {
  // Aufräumen beim Unmounten
  return () => {
    clearAllIntervals();
  };
}, []);
```

## Implementierungsplan

1. **Phase 1**: Audio-Reaction-Store erstellen
   - Minimalen Store mit energy und beatDetected implementieren
   - Beat-Reset-Mechanismus hinzufügen

2. **Phase 2**: Audio-Analyzer mit Store verbinden
   - useAudioAnalyzer Hook erweitern, um mit Store zu kommunizieren
   - Sicherstellen, dass die Verbindung zwischen MusicPlayer und Store funktioniert

3. **Phase 3**: Effekte umstellen
   - Zufällige Intervalle durch Audio-reaktive useEffects ersetzen
   - Bestehende Effektlogik beibehalten, aber durch Audio-Events auslösen
   - Intervalle entfernen, die durch Audio-Reaktivität ersetzt wurden

4. **Phase 4**: Testen und Feinabstimmung
   - Schwellenwerte für energy anpassen
   - Timing der Effekte optimieren
   - Performance überprüfen

## Vorteile dieses Ansatzes

1. **Einfachheit**: Nur zwei Audio-Metriken (energy und beatDetected)
2. **Keine neuen Effekte**: Ausschließliche Verwendung bestehender visueller Effekte
3. **Minimale Änderungen**: Beibehaltung der bestehenden Effektlogik
4. **Robustheit**: Weniger Komplexität bedeutet weniger potenzielle Fehler
5. **Performance**: Geringere Rechenleistung durch Verzicht auf erweiterte Audio-Analyse 