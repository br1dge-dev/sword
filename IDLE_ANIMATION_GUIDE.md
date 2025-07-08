# 🌊 Super Simple Idle-Animation Guide

## 🎯 **Was ist die Idle-Animation?**

Die Idle-Animation sorgt dafür, dass das Schwert auch dann "lebt", wenn keine Musik läuft. Sie ist **maximal einfach** und **super smooth**.

## ✨ **Features**

### **Ultra-Einfach**
- Nur eine sanfte Sinus-Welle für die Energie
- Gelegentliche Beats (nur 25% Chance alle 4 Sekunden)
- Keine komplexe Logik oder viele Effekte

### **Smooth**
- 200ms Update-Intervall für flüssige Animation
- Sanfte Energie-Übergänge zwischen 0.10 und 0.22
- Automatischer Start nach 800ms Page Load

### **Intelligent**
- Stoppt automatisch wenn Musik läuft
- Startet automatisch wenn Musik pausiert wird
- Keine Performance-Probleme

## 🔧 **Verwendung**

### **1. In der Hauptkomponente (bereits implementiert)**
```typescript
import { useUltraSimpleIdle } from '@/hooks/useUltraSimpleIdle';

function HomePage() {
  // Super einfache Idle-Animation aktivieren
  useUltraSimpleIdle();
  
  // ... Rest der Komponente
}
```

### **2. Alternative: Nur Welle ohne Beats**
```typescript
import { useMinimalWaveIdle } from '@/hooks/useUltraSimpleIdle';

function HomePage() {
  // Nur sanfte Welle, keine Beats
  useMinimalWaveIdle();
}
```

### **3. Mit Wrapper-Komponente**
```typescript
import AsciiSwordIdle from '@/components/ascii/sword-modules/AsciiSwordIdle';

function HomePage() {
  return (
    <AsciiSwordIdle enabled={true}>
      <AsciiSword level={1} />
    </AsciiSwordIdle>
  );
}
```

## 📊 **Animation-Parameter**

### **Energie-Welle**
- **Bereich**: 0.10 - 0.22 (sehr sanft)
- **Geschwindigkeit**: 0.0008 (langsame Welle)
- **Update-Rate**: 200ms

### **Beats**
- **Häufigkeit**: Alle ~4 Sekunden
- **Chance**: 25% pro Intervall
- **Dauer**: 120ms

### **Timing**
- **Start-Verzögerung**: 800ms nach Page Load
- **Pause-Verzögerung**: 1000ms nach Musik-Stopp

## 🎨 **Visuelle Effekte**

### **Bei Idle-Animation**
- Sanfte Glow-Effekte basierend auf Energie
- Gelegentliche leichte Glitch-Effekte bei Beats
- Hintergrund bleibt ruhig

### **Bei Musik**
- Idle-Animation stoppt sofort
- Normale Audio-reaktive Effekte übernehmen
- Smooth Übergang

## 🔄 **Verfügbare Hooks**

### **1. useUltraSimpleIdle()**
```typescript
// Vollständige Idle-Animation mit Beats
useUltraSimpleIdle();
```

### **2. useMinimalWaveIdle()**
```typescript
// Nur sanfte Welle, keine Beats
useMinimalWaveIdle();
```

### **3. useSimpleIdleAnimation(config)**
```typescript
// Konfigurierbare Version
useSimpleIdleAnimation({
  energyRange: [0.15, 0.35],
  energySpeed: 2000,
  beatChance: 0.08,
  beatInterval: 4000
});
```

### **4. useMinimalIdleAnimation()**
```typescript
// Einfache Version mit manueller Steuerung
const { startMinimalAnimation, stopMinimalAnimation } = useMinimalIdleAnimation();
```

## 🎯 **Warum so einfach?**

### **Performance**
- Minimale CPU-Last
- Keine komplexen Berechnungen
- Smooth 60fps möglich

### **Benutzerfreundlichkeit**
- Nicht ablenkend
- Natürlich wirkend
- Beruhigend

### **Wartbarkeit**
- Einfacher Code
- Wenige Abhängigkeiten
- Leicht zu verstehen

## 🚀 **Erweiterte Nutzung**

### **Custom Energie-Bereich**
```typescript
// Eigene Hook mit angepassten Parametern
function useCustomIdle() {
  const { updateEnergy, isMusicPlaying } = useAudioReactionStore();
  
  useEffect(() => {
    if (isMusicPlaying) return;
    
    const interval = setInterval(() => {
      const time = Date.now() * 0.001;
      const energy = 0.2 + Math.sin(time * 0.5) * 0.05; // 0.15 - 0.25
      updateEnergy(energy);
    }, 150);
    
    return () => clearInterval(interval);
  }, [isMusicPlaying, updateEnergy]);
}
```

### **Mit Performance-Monitoring**
```typescript
import { usePerformanceOptimizer } from '@/hooks/usePerformanceOptimizer';

function HomePage() {
  const { metrics } = usePerformanceOptimizer();
  const { useUltraSimpleIdle } = useUltraSimpleIdle();
  
  // Idle-Animation nur bei guter Performance
  if (metrics.fps > 45) {
    useUltraSimpleIdle();
  }
}
```

## 🎉 **Fazit**

Die Idle-Animation ist **super einfach**, **smooth** und **performant**. Sie sorgt dafür, dass das Schwert immer "lebt", ohne die Performance zu beeinträchtigen oder ablenkend zu wirken.

**Perfekt für**: Page Load, Musik-Pausen, ruhige Momente
**Nicht für**: Komplexe Animationen, viele Effekte, hohe Performance-Last 