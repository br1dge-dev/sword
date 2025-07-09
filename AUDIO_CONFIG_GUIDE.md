# Audio-Konfigurations-System

## Übersicht

Das Audio-Konfigurations-System ermöglicht es, alle Audio-reaktiven Elemente der SWORD-Anwendung über ein vollständiges Modal zu konfigurieren. Du kannst Häufigkeit, Intensität, Empfindlichkeit und weitere wichtige Einstellungen für alle Effekte anpassen.

## Zugriff auf das Konfigurations-Modal

### Desktop
- Klicke auf den **Zahnrad-Button** (⚙️) in der unteren Mitte des Bildschirms
- Das Modal öffnet sich mit allen verfügbaren Einstellungen

### Mobile
- Das Modal ist derzeit nur auf Desktop verfügbar
- Verwende die Export/Import-Funktion für mobile Konfiguration

## Konfigurationsbereiche

### 1. Audio Analyzer
**Grundlegende Audio-Analyse-Einstellungen**

- **Analyse-Intervall**: Wie oft die Audio-Analyse durchgeführt wird (16-100ms)
- **Energie-Schwellenwert**: Mindestenergie für Beat-Erkennung (0.01-0.5)
- **Beat-Sensitivität**: Empfindlichkeit der Beat-Erkennung (0.5-3.0)
- **FFT-Größe**: Auflösung der Frequenzanalyse (512-4096)
- **Smoothing-Konstante**: Glättung der Audio-Daten (0.1-0.9)
- **Web Worker**: Verwendung von Hintergrund-Threads für bessere Performance

### 2. Effekt-Reaktivität
**Einstellungen für verschiedene Effekttypen**

#### Color-Effekte
- **Energie-Schwellenwert**: Wann Farbänderungen ausgelöst werden
- **Energie-Sensitivität**: Wie stark auf Energieänderungen reagiert wird
- **Beat-Sensitivität**: Wie stark auf Beats reagiert wird
- **Cooldown**: Mindestzeit zwischen Effekten
- **Dauer**: Wie lange Effekte anhalten

#### Glitch-Effekte
- Ähnliche Einstellungen wie Color-Effekte, aber für Glitch-Phänomene
- Kürzere Cooldowns für aggressivere Effekte

#### Background-Effekte
- Einstellungen für Hintergrund-Animationen
- Längere Cooldowns für subtilere Effekte

#### Veins-Effekte
- Einstellungen für die Äderchen-Animationen
- Mittlere Reaktivität

#### Tile-Effekte
- Einstellungen für farbige Kacheln auf dem Schwert
- Schnelle Reaktion auf Audio

### 3. Visuelle Effekte
**Detaillierte Einstellungen für visuelle Darstellung**

#### Glow-Effekt
- **Minimale Intensität**: Mindesthelligkeit des Glows
- **Maximale Intensität**: Maximale Helligkeit des Glows
- **Energie-Multiplikator**: Wie stark Energie den Glow beeinflusst

#### Tile-Intensität
- **Basis-Prozentsatz**: Grundanzahl der farbigen Tiles
- **Energie-Multiplikator**: Zusätzliche Tiles basierend auf Energie
- **Beat-Multiplikator**: Zusätzliche Tiles bei Beat-Erkennung
- **Glitch-Multiplikator**: Zusätzliche Tiles bei Glitch-Level

#### Glitch-Frequenz
- **Basis-Chance**: Grundwahrscheinlichkeit für Glitches
- **Energie-Multiplikator**: Erhöhte Glitch-Chance bei hoher Energie
- **Beat-Multiplikator**: Erhöhte Glitch-Chance bei Beat-Erkennung

### 4. Performance
**Performance-Optimierungseinstellungen**

- **Maximale Audio-Latenz**: Akzeptable Verzögerung (20-100ms)
- **Adaptive Qualität**: Automatische Qualitätsanpassung
- **Predictive Beats**: Vorhersage von Beats für bessere Performance
- **Worker-Threads**: Anzahl der Hintergrund-Threads

### 5. Hintergrund-Timing
**Einstellungen für Hintergrund-Animationen**

- **Hintergrund-Muster-Update**: Sekunden zwischen Musterwechseln (5-30s)
- **Veins-Update**: Sekunden zwischen Äderchen-Updates (2-15s)
- **Glitch-Muster-Update**: Sekunden zwischen Glitch-Musterwechseln (3-20s)
- **Farbwechsel-Intervalle**: Separate Einstellungen für Level 1-3 (1-15s)

### 6. Intensitäts-Skalierung
**Dynamische Skalierung basierend auf Audio-Intensität**

#### Veins (Äderchen)
- **Basis-Anzahl**: Grundanzahl der Veins (5-50)
- **Energie-Multiplikator**: Zusätzliche Veins pro Energie-Einheit (5-50)
- **Beat-Multiplikator**: Multiplikator bei Beat-Erkennung (0.5-3.0x)
- **Maximale Veins**: Obergrenze für Veins (100-500)
- **Wellenform-Animation**: Aktiviert wellenförmige Animation

#### Tiles (Farbige Kacheln)
- **Basis-Anzahl**: Grundanzahl der Tiles (2-20)
- **Energie-Multiplikator**: Zusätzliche Tiles pro Energie-Einheit (5-30)
- **Beat-Multiplikator**: Zusätzliche Tiles bei Beat-Erkennung (2-15)
- **Wellenform-Animation**: Aktiviert wellenförmige Animation
- **Cluster-Größe**: 
  - Minimale Größe (1-5 Tiles)
  - Maximale Größe (3-10 Tiles)
  - Energie-Multiplikator (0.5-3.0x)

## Speichern und Anwenden

### Speichern
- Klicke auf **"Speichern"** im Modal
- Die Konfiguration wird sofort angewendet und in localStorage gespeichert
- Alle Audio-Analyzer und Effekte werden mit den neuen Einstellungen aktualisiert

### Exportieren/Importieren
- Klicke auf **"Exportieren"** für eine JSON-Konfiguration
- Kopiere die JSON-Daten in die Zwischenablage
- Teile die Konfiguration mit anderen oder sichere sie
- Füge JSON-Daten in das Import-Feld ein und klicke außerhalb zum Importieren

## Beispiel-Konfigurationen

### Aggressive Reaktion
```json
{
  "analyzer": {
    "analyzeInterval": 16,
    "energyThreshold": 0.05,
    "beatSensitivity": 2.5
  },
  "effects": {
    "glitch": {
      "energyThreshold": 0.1,
      "cooldown": 50,
      "duration": 100
    }
  },
  "visual": {
    "veins": {
      "baseCount": 30,
      "energyMultiplier": 40,
      "beatMultiplier": 2.5,
      "maxVeins": 400,
      "waveForm": true
    },
    "tiles": {
      "baseCount": 15,
      "energyMultiplier": 25,
      "beatMultiplier": 12,
      "waveForm": true,
      "clusterSize": {
        "min": 3,
        "max": 8,
        "energyMultiplier": 2.5
      }
    }
  },
  "background": {
    "patternUpdateInterval": 5,
    "veinsUpdateInterval": 2,
    "glitchPatternInterval": 3,
    "colorChangeInterval": {
      "level1": 3,
      "level2": 2,
      "level3": 1
    }
  }
}
```

### Subtile Reaktion
```json
{
  "analyzer": {
    "analyzeInterval": 100,
    "energyThreshold": 0.3,
    "beatSensitivity": 0.8
  },
  "effects": {
    "glitch": {
      "energyThreshold": 0.4,
      "cooldown": 500,
      "duration": 300
    }
  },
  "visual": {
    "veins": {
      "baseCount": 5,
      "energyMultiplier": 10,
      "beatMultiplier": 1.2,
      "maxVeins": 150,
      "waveForm": false
    },
    "tiles": {
      "baseCount": 2,
      "energyMultiplier": 8,
      "beatMultiplier": 3,
      "waveForm": false,
      "clusterSize": {
        "min": 1,
        "max": 3,
        "energyMultiplier": 1.0
      }
    }
  },
  "background": {
    "patternUpdateInterval": 20,
    "veinsUpdateInterval": 8,
    "glitchPatternInterval": 15,
    "colorChangeInterval": {
      "level1": 12,
      "level2": 8,
      "level3": 5
    }
  }
}
```

### Performance-Optimiert
```json
{
  "analyzer": {
    "useWorker": true,
    "fftSize": 512
  },
  "performance": {
    "maxAudioLatency": 30,
    "adaptiveQuality": true,
    "workerThreads": 2
  }
}
```

## Technische Details

### Speicherort
- Konfigurationen werden in `localStorage` unter dem Schlüssel `audioConfig` gespeichert
- Automatisches Laden beim Start der Anwendung
- Persistenz zwischen Browser-Sessions

### Integration
- **ConfigManager**: Zentrale Verwaltung aller Konfigurationen
- **Audio-Analyzer**: Automatische Anwendung der Analyzer-Einstellungen
- **Effekt-System**: Dynamische Anpassung der Reaktivität
- **Event-System**: Benachrichtigung aller Komponenten bei Änderungen

### Debugging
- Alle Konfigurationsänderungen werden in der Browser-Konsole geloggt
- Event `audioConfigChanged` wird bei Änderungen ausgelöst
- Fehler beim Laden/Anwenden werden angezeigt

## Troubleshooting

### Konfiguration wird nicht angewendet
1. Prüfe die Browser-Konsole auf Fehler
2. Stelle sicher, dass Audio abgespielt wird
3. Versuche die Standard-Konfiguration zu laden

### Performance-Probleme
1. Erhöhe das Analyse-Intervall
2. Reduziere die FFT-Größe
3. Deaktiviere Web Worker
4. Reduziere die Anzahl der Worker-Threads

### Zu aggressive Effekte
1. Erhöhe Energie-Schwellenwerte
2. Reduziere Beat-Sensitivität
3. Erhöhe Cooldown-Zeiten
4. Reduziere Effekt-Dauer

### Zu subtile Effekte
1. Reduziere Energie-Schwellenwerte
2. Erhöhe Beat-Sensitivität
3. Reduziere Cooldown-Zeiten
4. Erhöhe Effekt-Dauer

## Erweiterte Nutzung

### Manuelle Konfiguration
Du kannst die Konfiguration auch manuell in der Browser-Konsole ändern:

```javascript
// Konfiguration laden
const config = JSON.parse(localStorage.getItem('audioConfig'));

// Änderungen vornehmen
config.analyzer.energyThreshold = 0.2;

// Konfiguration anwenden
localStorage.setItem('audioConfig', JSON.stringify(config));
window.dispatchEvent(new CustomEvent('audioConfigChanged', { detail: config }));
```

### Automatische Anpassung
Das System kann automatisch die Konfiguration basierend auf der Performance anpassen:

```javascript
// Performance-basierte Anpassung
if (performance.now() - lastFrameTime > 16) {
  // Reduziere Qualität bei niedriger FPS
  config.analyzer.analyzeInterval = Math.min(100, config.analyzer.analyzeInterval + 10);
  applyAudioConfig(config);
}
```

## Support

Bei Problemen oder Fragen zur Konfiguration:
1. Prüfe die Browser-Konsole auf Fehlermeldungen
2. Versuche die Standard-Konfiguration wiederherzustellen
3. Exportiere deine aktuelle Konfiguration für Backup-Zwecke
4. Erstelle ein Issue mit der exportierten Konfiguration 