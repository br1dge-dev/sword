# 🌊 Sichtbare Idle-Animation - Sanft & Smooth

## 🎯 **Problem gelöst**

Die vorherige Idle-Animation war unsichtbar:
- Energie unter 0.15 → Keine visuellen Effekte
- Zu subtile Änderungen → Nicht wahrnehmbar
- Keine sichtbare Animation → Langweilig

## ✅ **Neue sichtbare Animation**

### **useCalmIdleAnimation()** (Standard)
- **Energie-Bereich**: 0.16 - 0.22 (über Tile-Effekt-Schwelle)
- **Geschwindigkeit**: 0.0003 (sanft und sichtbar)
- **Update-Rate**: 25fps für ruhige Bewegung
- **Beat-Intervall**: 6 Sekunden (15% Chance)
- **Start-Verzögerung**: 1 Sekunde

### **Parameter im Detail**
```typescript
// Sichtbare Energie-Welle über Schwellenwert
const energy = 0.19 + Math.sin(elapsed * 0.0003) * 0.03; // 0.16 - 0.22

// Langsamere Update-Rate für ruhige Bewegung
setTimeout(() => {
  animationRef.current = requestAnimationFrame(animate);
}, 40); // ~25fps

// Beat alle 6 Sekunden
if (beatElapsed >= 6000) {
  // 15% Chance für Beat
  if (Math.random() < 0.15) {
    triggerBeat();
  }
}
```

## 🎨 **Visuelle Effekte**

### **Bei sichtbarer Idle-Animation**
- ✅ **Tile-Effekte aktiv** (Energie > 0.15)
- ✅ **Sanfte Hintergrund-Animation**
- ✅ **Gelegentliche leichte Beats** (alle 6s, 15% Chance)
- ✅ **Sichtbare, ruhige Bewegung**

### **Bei Musik**
- Idle-Animation stoppt sofort
- Normale Audio-reaktive Effekte übernehmen
- Smooth Übergang

## 📊 **Vergleich der Animationen**

| Aspekt | Vorher (unsichtbar) | Nachher (sichtbar) |
|--------|---------------------|-------------------|
| **Energie-Bereich** | 0.08 - 0.12 | 0.16 - 0.22 |
| **Update-Rate** | 30fps | 25fps |
| **Tile-Effekte** | Keine | Aktiv |
| **Beat-Häufigkeit** | Alle 8s | Alle 6s |
| **Geschwindigkeit** | Sehr langsam | Sanft |
| **Sichtbarkeit** | Unsichtbar | Sichtbar |

## 🔄 **Verfügbare Optionen**

### **1. useCalmIdleAnimation()** (Standard)
```typescript
// Sichtbare, ruhige Animation
useCalmIdleAnimation();
// Energie: 0.16 - 0.22
// Update-Rate: 25fps
// Beat alle 6s (15% Chance)
```

### **2. useSmoothIdleAnimation()**
```typescript
// Sanfte Animation mit mehr Effekten
useSmoothIdleAnimation();
// Energie: 0.18 - 0.25
// Update-Rate: 30fps
// Beat alle 5s (20% Chance)
```

### **3. useUltraCalmIdle()**
```typescript
// Ultra-ruhige Version
useUltraCalmIdle();
// Energie: 0.15 - 0.19
// Update-Rate: 20fps
// Keine Beats
```

### **4. useMinimalIdle()**
```typescript
// Minimalistische Version
useMinimalIdle();
// Konstante Energie: 0.18
// Beat alle 8s (10% Chance)
```

## 🎯 **Warum jetzt sichtbar?**

### **Benutzerfreundlichkeit**
- Sichtbare Animation → Interessanter
- Nicht ablenkend → Sanft und ruhig
- Natürlich wirkend → Wie Atmen

### **Visuelle Effekte**
- Tile-Effekte aktiv → Schwert "lebt"
- Sanfte Bewegung → Beruhigend
- Gelegentliche Beats → Dynamisch

### **Design**
- Dezent aber sichtbar
- Fokus auf die Musik bei Wiedergabe
- Elegante Übergänge

## 🔧 **Technische Details**

### **Energie-Schwellenwerte**
```typescript
// Tile-Effekte werden ausgelöst bei:
if (beatDetected || energy > 0.15) {
  // Tile-Effekte
}

// Idle-Animation über 0.15 für Sichtbarkeit
const energy = 0.19 + Math.sin(elapsed * 0.0003) * 0.03; // 0.16 - 0.22
```

### **Update-Rate-Optimierung**
```typescript
// Langsamere Updates für ruhigere Animation
setTimeout(() => {
  animationRef.current = requestAnimationFrame(animate);
}, 40); // 25fps für sanfte Bewegung
```

### **Beat-Frequenz-Optimierung**
```typescript
// Gelegentliche Beats für Dynamik
if (beatElapsed >= 6000) { // 6 Sekunden
  if (Math.random() < 0.15) { // 15% Chance
    triggerBeat();
  }
}
```

## 🎉 **Ergebnis**

Die Idle-Animation ist jetzt:
- ✅ **Sichtbar und interessant**
- ✅ **Sanft und ruhig**
- ✅ **Nicht ablenkend**
- ✅ **Performance-optimiert**
- ✅ **Natürlich wirkend**

Die Animation fühlt sich jetzt wie ein **sanftes Atmen** an - sichtbar, ruhig, gleichmäßig und beruhigend! 🌊✨

## 🎵 **Musik-Integration**

### **Smooth Übergang**
- Idle-Animation stoppt sofort bei Musik
- Audio-reaktive Effekte übernehmen
- Keine Konflikte zwischen Animationen

### **Fallback-System**
- Wenn keine Musik läuft → Idle-Animation
- Wenn Musik läuft → Audio-reaktive Effekte
- Automatischer Wechsel 