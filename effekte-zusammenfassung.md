# Effekte-Zusammenfassung

Dieses Dokument bietet einen Überblick über alle visuellen Effekte in der Schwert-Anwendung und deren Timing-Werte.

## Hintergrund-Effekte

- **Hintergrund-Muster-Aktualisierung**: Ändert sich alle 2 Sekunden mit 50% Chance (reduziert von 3 Sekunden)
- **Äderchen-Effekt**: Aktualisiert alle 1500ms - (glitchLevel * 300ms)
  - Glitch-Chance steigt mit glitchLevel: 30%, 40%, 50%, 60% (erhöht)
  - Kurzer Blitz-Effekt dauert 100ms

## Farb-Effekte

- **Basis-Farbwechsel**:
  - Aktualisiert alle 80-160ms (extrem häufig)
  - Farbwechsel-Wahrscheinlichkeit basierend auf glitchLevel: 85%, 88%, 91%, 94% (extrem hohe Chance)
  - Farben bleiben für 0,5-2 Sekunden stabil (gesteuert durch colorStability, stark verkürzt)
  - Verwendet harmonische Farbpaare mit 4 verschiedenen Harmonie-Typen:
    1. Komplementär mit Variation
    2. Dunklere Version der Komplementärfarbe
    3. Analogfarbe (verschoben auf dem Farbrad)
    4. Kontrastierende Akzentfarbe

- **Farbige Kacheln**:
  - Aktualisiert alle 80-140ms (extrem häufig)
  - Anzahl der Cluster basierend auf glitchLevel: 2, 4, 7, 10 (deutlich erhöht)
  - Clustergröße: 2-6 Kacheln, größer bei höherem glitchLevel

## Leucht-Effekt

- **Puls-Effekt**: Aktualisiert alle 100-200ms
- **Intensität**: Zufällig zwischen 0,3 und 1,0

## Glitch-Effekte

- **DOS-Style Glitches**:
  - Aktualisiert alle 200-400ms mit 50% Chance
  - 2-8 Glitches gleichzeitig
  - Dauer: 80ms (verkürzt für aggressiveren Effekt)

- **Unicode-Glitches**:
  - Frequenz: 500ms - (glitchLevel * 50ms)
  - Chance steigt mit glitchLevel: 30%, 40%, 50%, 60%
  - Anzahl der Glitches: glitchLevel * 3 + glitchLevel
  - Dauer: 100ms + (glitchLevel * 20ms)

- **Unschärfe-Effekt**:
  - Prozentsatz unscharfer Zeichen basierend auf glitchLevel: 1%, 2%, 3%
  - Aktualisiert alle 500ms

- **Verzerrungseffekt (Skew)**:
  - Aktiv ab glitchLevel 2
  - Prozentsatz verzerrter Zeichen: 0,5% * glitchLevel
  - Winkel: -5° bis +5°
  - Aktualisiert alle 300ms

- **Transparenz-Effekt**:
  - Aktiv ab glitchLevel 3
  - Prozentsatz transparenter Zeichen: 0,3% * glitchLevel
  - Transparenz: 70-100%
  - Aktualisiert alle 400ms

## Auflade-Effekte

- **Kanten-Effekte** (für dünne Linien):
  - Aktualisierungsfrequenz basierend auf chargeLevel:
    - Level 1: 200ms
    - Level 2: 120ms (verbessert von 150ms auf 120ms, dann auf 70ms)
    - Level 3: 100ms
  
  - Vibrations-Intensität nach chargeLevel:
    - Level 1: 0,2 (20% Chance)
    - Level 2: 0,6 (60% Chance, verbessert von 0,5)
    - Level 3: 0,8 (80% Chance)
  
  - Glitch-Häufigkeit nach chargeLevel:
    - Level 1: 0,1 (10% Chance)
    - Level 2: 0,25 (25% Chance, 37,5% mit Multiplikator)
    - Level 3: 0,4 (40% Chance)
  
  - Farbeffekt-Häufigkeit nach chargeLevel:
    - Level 1: 0,15 (15% Chance)
    - Level 2: 0,25 (25% Chance)
    - Level 3: 0,4 (40% Chance)

  - Flacker-Verhalten nach chargeLevel:
    - Level 1: Vollständiger Reset
    - Level 2: Teilweiser Reset (behält 30-70% der Effekte) + 3-7 neue Effekte
    - Level 3: Komplexe Muster (50% Chance) oder vollständiger Reset

## Aktuelle Verbesserungen

1. **Auflade-Effekte auf Level 2**:
   - Konsistente Vibration mit variabler Intensität hinzugefügt
   - Glitch-Wahrscheinlichkeit um 50% erhöht
   - Sichergestellt, dass mindestens ein Effekt immer angewendet wird
   - Teilweiser Reset mit 30-70% Beibehaltung der Effekte implementiert
   - 3-7 neue Effekte während jedes Flacker-Zyklus hinzugefügt
   - Aktualisierungsintervall von 150ms auf 70ms reduziert

2. **Farb-System**:
   - Farb-Stabilitätssystem hinzugefügt (0,5-2 Sekunden, stark verkürzt)
   - 4 verschiedene Farbharmonie-Typen implementiert
   - Sofortige Farb-Umkehrung verhindert
   - Farb-Dauer von 250-400ms auf 80-160ms reduziert für extremere Effekte
   - 5 neue Basisfarben für mehr Vielfalt hinzugefügt
   - Beziehung zwischen Hintergrund- und Schwertfarbe verbessert

3. **Hintergrund-Aktualisierungen**:
   - Aktualisierungschance von 40% auf 50% erhöht
   - Aktualisierungsintervall von 3 auf 2 Sekunden reduziert

4. **Kachel-Farbeffekte**:
   - Separater Timer für Kachel-Umfärbungen hinzugefügt
   - Aktualisierungsintervall auf 80-140ms reduziert für extreme Häufigkeit
   - Clustergröße auf 2-6 zusammenhängende Kacheln erhöht
   - Anzahl der Cluster deutlich erhöht (3-7 Basis + glitchLevel-abhängige Zusätze) 