# SwordEvolution V2 - Finale Spezifikation (Korrekt)

## Ziel-Mechanik (Verifiziert)

### Zeitplan (60 Tage)
```
Runde 1 (Level 1.0 → 2.0):
  Tag 1-10:   FORGE aktiv  → kann 1.0→2.0 werden (max +0.1/Tag)
  Tag 11-20:  CHARGE aktiv → kann 1.0→2.0 werden
  Tag 21-30:  GLITCH aktiv → kann 1.0→2.0 werden

Runde 2 (Level 2.0 → 3.0):
  Tag 31-40:  FORGE aktiv  → kann 2.0→3.0 werden
  Tag 41-50:  CHARGE aktiv → kann 2.0→3.0 werden
  Tag 51-60:  GLITCH aktiv → kann 2.0→3.0 werden
```

### Wichtige Regeln
- **Max 1 Step pro Tag** (nur wenn mind. 1 Wallet claimed)
- **Wenn keiner claimed** → Tag ist verloren, kein Progress
- **Max 10 Claims pro Tag** (global, alle Wallets zusammen)
- **Tag dauert 24h** oder bis 10 Claims voll
- **Am Ende**: Wenn alle 60 Tage erfolgreich = alle Aspekte Level 3.0

### Beispiel-Szenarien

**Szenario A: Perfekte Evolution**
```
Tag 1-10:  Jeden Tag 1+ Claims → FORGE 1.0→2.0 ✓
Tag 11-20: Jeden Tag 1+ Claims → CHARGE 1.0→2.0 ✓
Tag 21-30: Jeden Tag 1+ Claims → GLITCH 1.0→2.0 ✓
Tag 31-40: Jeden Tag 1+ Claims → FORGE 2.0→3.0 ✓
Tag 41-50: Jeden Tag 1+ Claims → CHARGE 2.0→3.0 ✓
Tag 51-60: Jeden Tag 1+ Claims → GLITCH 2.0→3.0 ✓
Ergebnis: Alle Aspekte Level 3.0 (Maximum)
```

**Szenario B: Verpasste Tage**
```
Tag 1-10:  Nur an Tag 1, 3, 5, 7, 9 claimed → FORGE 1.0→1.5 (5/10 Steps)
Tag 11-20: Jeden Tag claimed → CHARGE 1.0→2.0 ✓
Tag 21-30: Keine Claims → GLITCH bleibt 1.0 (0/10 Steps)
...
Ergebnis: Unvollständige Evolution, niedrigere Levels
```

## State-Variablen (V2 Final)

```solidity
uint256 public currentDay;          // 1-60
uint8 public claimsToday;           // 0-10
bool public stepClaimedToday;       // true = Progress schon gemacht
uint256 public dayStartTimestamp;   // Wann Tag begann

// Aspect-Levels (10 = 1.0, 20 = 2.0, 30 = 3.0)
uint8 public forgeLevel;   // 10-30
uint8 public chargeLevel;  // 10-30
uint8 public glitchLevel;  // 10-30
```

## Key Functions

### getActiveAspect()
```solidity
function getActiveAspect() public view returns (Aspect) {
    uint8 dayInCycle = uint8((currentDay - 1) % 30); // 0-29
    
    if (dayInCycle < 10) return Aspect.FORGE;      // Tage 1-10, 31-40, 51-60
    if (dayInCycle < 20) return Aspect.CHARGE;     // Tage 11-20, 41-50
    return Aspect.GLITCH;                          // Tage 21-30, 51-60
}
```

### claimWithSignature()
- Prüft: Evolution läuft, Tag nicht voll, User nicht heute geclaimed
- Verifiziert EIP-712 Signatur
- Erhöht claimsToday
- **Nur wenn !stepClaimedToday**: Erhöht aktiven Aspekt um 1
- Mintet 100 EDGE

### advanceDay()
- Kann aufgerufen werden wenn: 24h vergangen ODER 10 Claims erreicht
- Erhöht currentDay
- Reset: claimsToday = 0, stepClaimedToday = false

## Frontend-Anzeige

```
Day X of 60 | Round Y of 3
Active: FORGE (Level X.X)

FORGE  - LVL X.X [████████░░░░░░░░░░░░] X/10
CHARGE - LVL X.X [░░░░░░░░░░░░░░░░░░░░] 0/10  (inaktiv)
GLITCH - LVL X.X [░░░░░░░░░░░░░░░░░░░░] 0/10  (inaktiv)

Claims today: X/10
```

## Deployment Checkliste

- [ ] Contract V2 deployen
- [ ] Test: Tag 1, 1 Claim → FORGE 1.1
- [ ] Test: Tag 1, 2. Claim → FORGE bleibt 1.1 (nur 1x/Tag)
- [ ] Test: Tag 2, 1 Claim → FORGE 1.2
- [ ] Test: Tag 11 → CHARGE aktiv, FORGE inaktiv
- [ ] Test: 60 Tage durchspielen
