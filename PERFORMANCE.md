# Performance-Analyse & Monitoring

## 📊 Übersicht

Die SWORD-Anwendung verfügt über ein umfassendes Performance-Monitoring-System, das detaillierte Metriken über die Anwendungsperformance sammelt und analysiert.

## 🚀 Performance-Monitoring aktivieren

### 1. Dashboard öffnen
- Klicke auf den "📊 Perf" Button in der oberen rechten Ecke
- Das Performance-Dashboard wird angezeigt

### 2. Monitoring starten
- Klicke auf "Start Monitoring" im Dashboard
- Das System beginnt mit der Sammlung von Performance-Daten
- Metriken werden in Echtzeit angezeigt

### 3. Daten exportieren
- Klicke auf "Export" um die Performance-Daten als JSON-Datei herunterzuladen
- Die Datei enthält alle gesammelten Metriken und eine Zusammenfassung

## 📈 Überwachte Metriken

### Performance-Metriken
- **FPS**: Frames pro Sekunde (Ziel: ≥50)
- **Memory Usage**: Speicherverbrauch in MB (Ziel: <100MB)
- **CPU Usage**: Geschätzte CPU-Auslastung
- **Render Time**: Zeit für DOM-Updates (Ziel: <16.67ms)
- **Audio Latency**: Audio-Verzögerung

### Aktivitäts-Metriken
- **Effects**: Anzahl der generierten Effekte pro Sekunde
- **Veins**: Anzahl der Vein-Updates pro Sekunde
- **Glitches**: Anzahl der Glitch-Effekte pro Sekunde
- **Background Updates**: Hintergrund-Update-Frequenz
- **Color Changes**: Farbwechsel-Frequenz
- **Beats**: Beat-Erkennungen pro Sekunde
- **Energy Updates**: Audio-Energy-Updates pro Sekunde

### System-Metriken
- **DOM Nodes**: Anzahl der DOM-Elemente
- **Event Listeners**: Geschätzte Anzahl Event-Listener
- **Timeouts**: Aktive Timeouts
- **Intervals**: Aktive Intervals
- **Animation Frames**: RequestAnimationFrame-Aufrufe

## 🔍 Performance-Analyse

### Automatische Analyse
Das System erkennt automatisch Performance-Probleme:
- FPS < 30: Kritisch
- FPS < 50: Verbesserungswürdig
- Memory > 100MB: Speicherproblem
- DOM Nodes > 1000: Zu viele DOM-Elemente
- Render Time > 16.67ms: Langsame Updates

### Performance-Score
Ein Gesamt-Score wird basierend auf folgenden Faktoren berechnet:
- **FPS-Score**: 0-100 basierend auf durchschnittlicher FPS
- **Memory-Score**: 0-100 basierend auf Speicherverbrauch
- **Stabilitäts-Score**: 0-100 basierend auf Memory-Varianz

## 📊 Performance-Analyse-Skript

### Verwendung
```bash
node scripts/analyze-performance.js <performance-data.json>
```

### Beispiel
```bash
node scripts/analyze-performance.js performance-report-1234567890.json
```

### Ausgabe
Das Skript generiert einen detaillierten Bericht mit:
- Session-Informationen
- Performance-Übersicht
- Aktivitäts-Analyse
- Detaillierte Metriken
- Empfehlungen
- Performance-Score

## 🎯 Performance-Optimierungen

### Bereits implementierte Optimierungen

#### 1. Idle-Animation
- **Sanftere Bewegungen**: Reduzierte Energy-Werte (0.05-0.25)
- **Längere Intervalle**: 6-8 Sekunden statt 2-4 Sekunden
- **Graduelle Übergänge**: Sanfte Energy-Änderungen
- **Reduzierte Frequenzen**: Weniger aggressive Effekt-Trigger

#### 2. Audio-reaktive Effekte
- **Höhere Schwellenwerte**: Weniger empfindliche Reaktionen
- **Längeres Throttling**: 50ms statt 8ms
- **Reduzierte Intensitäten**: Subtilerer Effekte
- **Längere Cooldowns**: Sanftere Übergänge

#### 3. Memory-Management
- **Vein-Cleanup**: Nur 5% der ältesten Veins entfernen
- **Cache-Bereinigung**: Automatische Cache-Bereinigung
- **Timeout-Management**: Sauberes Cleanup aller Timeouts
- **Lazy-Rendering**: Nur sichtbare Bereiche rendern

#### 4. Rendering-Optimierungen
- **30fps Update-Rate**: Reduzierte Animation-Frame-Rate
- **Batch-Updates**: Effizientere State-Updates
- **Memoization**: Caching von Berechnungen
- **Early Exit**: Früher Exit bei inaktiven Effekten

### Empfohlene weitere Optimierungen

#### Bei niedrigen FPS (<50):
1. **Effekt-Frequenz reduzieren**
   - Erhöhe Schwellenwerte für Effekt-Trigger
   - Reduziere Beat-Reaktionswahrscheinlichkeit
   - Implementiere stärkeres Throttling

2. **Vein-Optimierung**
   - Reduziere maximale Vein-Anzahl
   - Erhöhe Cleanup-Frequenz
   - Implementiere Viewport-basiertes Rendering

3. **Background-Optimierung**
   - Reduziere Background-Update-Frequenz
   - Implementiere Lazy-Loading für Hintergründe
   - Verwende einfachere Zeichensätze

#### Bei hohem Speicherverbrauch (>100MB):
1. **Memory-Cleanup verstärken**
   - Häufigere Garbage Collection
   - Stärkere Vein-Bereinigung
   - Timeout-Reduzierung

2. **DOM-Optimierung**
   - Reduziere DOM-Nodes
   - Implementiere Virtual Scrolling
   - Verwende Document Fragments

3. **Cache-Optimierung**
   - Reduziere Cache-Größe
   - Kürzere Cache-TTL
   - Selektives Caching

## 🔧 Debugging

### Performance-Probleme identifizieren

1. **FPS-Probleme**
   - Überprüfe Effekt-Frequenz im Dashboard
   - Reduziere Animation-Komplexität
   - Implementiere Frame-Skipping

2. **Memory-Leaks**
   - Überwache Memory-Trend im Dashboard
   - Überprüfe Cleanup-Funktionen
   - Verwende Chrome DevTools Memory-Profiler

3. **Audio-Latenz**
   - Überprüfe Audio-Analyzer-Performance
   - Reduziere Analyse-Frequenz
   - Optimiere FFT-Parameter

### Debug-Modi aktivieren

```javascript
// Im Browser-Console
localStorage.setItem('debugPerformance', 'true');
```

## 📋 Checkliste für Performance-Tests

### Vor dem Test
- [ ] Browser-Cache leeren
- [ ] Andere Tabs schließen
- [ ] Performance-Monitoring starten
- [ ] Baseline-Metriken aufzeichnen

### Während des Tests
- [ ] Idle-Modus für 2-3 Minuten
- [ ] Musik abspielen für 2-3 Minuten
- [ ] Verschiedene PowerUp-Level testen
- [ ] Browser-Tab wechseln und zurück

### Nach dem Test
- [ ] Performance-Daten exportieren
- [ ] Analyse-Skript ausführen
- [ ] Performance-Score bewerten
- [ ] Optimierungen implementieren

## 🎯 Performance-Ziele

### Optimal
- **FPS**: ≥55
- **Memory**: <50MB
- **Render Time**: <8ms
- **DOM Nodes**: <500
- **Performance-Score**: ≥80

### Akzeptabel
- **FPS**: ≥30
- **Memory**: <100MB
- **Render Time**: <16.67ms
- **DOM Nodes**: <1000
- **Performance-Score**: ≥60

### Kritisch
- **FPS**: <30
- **Memory**: >100MB
- **Render Time**: >16.67ms
- **DOM Nodes**: >1000
- **Performance-Score**: <60

## 📞 Support

Bei Performance-Problemen:
1. Sammle Performance-Daten mit dem Dashboard
2. Führe das Analyse-Skript aus
3. Dokumentiere die Ergebnisse
4. Implementiere die empfohlenen Optimierungen
5. Teste erneut und vergleiche die Ergebnisse 