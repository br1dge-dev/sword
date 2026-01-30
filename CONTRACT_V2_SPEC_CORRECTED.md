# SwordEvolution V2 - Korrigierte Spezifikation

## Gewünschte Mechanik (Korrigiert)

### Globaler Progress
- **60 Steps total** (3 Aspekte × 20 Steps je Aspekt)
- **Level 1.0** = 0 Steps (Start)
- **Level 3.0** = 20 Steps (Maximum)
- Reihenfolge: Alle 3 Aspekte steigen GLEICHZEITIG

### Tages-Mechanik
- **Max 1 Step pro Tag** (egal wie viele Claims, mind. 1 nötig)
- **Max 10 Claims pro Tag** (global)
- **Tag dauert 24h** oder bis 10 Claims voll
- **Kein Auto-Advance** → nächster Tag erst nach 24h ODER manuellem Advance

### Beispiel-Verlauf
```
Tag 1: 1 Claim → Progress 1/60 → Alle Aspekte: Level 1.1
Tag 2: 5 Claims → Progress 2/60 → Alle Aspekte: Level 1.2
Tag 3: 0 Claims → Progress bleibt 2/60 → Kein Level-Up
Tag 4: 10 Claims → Progress 3/60 → Alle Aspekte: Level 1.3
...
Tag 60: Progress 60/60 → Alle Aspekte: Level 3.0 (Complete)
```

## State-Variablen (V2 Korrigiert)

```solidity
// Globaler Fortschritt (0-60)
uint8 public globalProgress;

// Aktueller Tag (1-60)
uint256 public currentDay;

// Claims heute (0-10)
uint8 public claimsToday;

// Wurde heute schon ein Step gemacht?
bool public stepClaimedToday;

// Timestamp wann Tag gestartet
uint256 public dayStartTimestamp;

// User-Tracking
mapping(address => uint256) public userLastClaimDay;
mapping(address => uint256) public userTotalClaims;
mapping(address => uint256) public userTotalMinted;
```

## Neue Funktionen (V2 Korrigiert)

### claimWithSignature()
```solidity
function claimWithSignature(...) external {
    // 1. Checks: Evolution nicht complete, Tag nicht voll, User nicht heute geclaimed
    
    // 2. Verify Signature (EIP-712)
    
    // 3. Update User
    userLastClaimDay[msg.sender] = currentDay;
    userTotalClaims[msg.sender]++;
    
    // 4. Update Global
    claimsToday++;
    
    // 5. NEU: Step erhöhen (nur 1x pro Tag!)
    if (!stepClaimedToday) {
        globalProgress++;
        stepClaimedToday = true;
        emit GlobalProgressIncreased(globalProgress);
    }
    
    // 6. Mint 100 EDGE
    
    // 7. Tag voll? → Auto-Advance (optional, nur wenn 10/10)
    if (claimsToday >= MAX_CLAIMS_PER_DAY) {
        _advanceDay();
    }
}
```

### getAspectLevels()
```solidity
function getAspectLevels() external view returns (
    uint8 forgeLevel,      // 10-30 (1.0-3.0)
    uint8 chargeLevel,     // 10-30
    uint8 glitchLevel,     // 10-30
    uint8 forgeProgress,   // 0-9 (im aktuellen Level)
    uint8 chargeProgress,  // 0-9
    uint8 glitchProgress   // 0-9
) {
    // Alle Aspekte haben gleichen Level!
    uint8 baseLevel = 10 + (globalProgress / 10) * 10;  // 10, 20, 30
    uint8 progress = globalProgress % 10;  // 0-9
    
    forgeLevel = baseLevel;
    chargeLevel = baseLevel;
    glitchLevel = baseLevel;
    forgeProgress = progress;
    chargeProgress = progress;
    glitchProgress = progress;
}
```

### _advanceDay()
```solidity
function _advanceDay() internal {
    require(currentDay < TOTAL_DAYS, "Evolution complete");
    
    currentDay++;
    claimsToday = 0;
    stepClaimedToday = false;  // NEU: Reset für nächsten Tag
    dayStartTimestamp = block.timestamp;
    
    emit DayAdvanced(currentDay, globalProgress);
}
```

### advanceDay() (manuel)
```solidity
function advanceDay() external {
    // Nur wenn 24h vergangen ODER 10 Claims voll
    require(
        block.timestamp >= dayStartTimestamp + 1 days || 
        claimsToday >= MAX_CLAIMS_PER_DAY,
        "Too early"
    );
    _advanceDay();
}
```

## Frontend-Integration (V2 Korrigiert)

### Progress-Anzeige
```
Day X of 60
Progress: X/60

FORGE  - LVL X.X [████████░░░░░░░░░░░░] X/10
CHARGE - LVL X.X [████████░░░░░░░░░░░░] X/10
GLITCH - LVL X.X [████████░░░░░░░░░░░░] X/10
```

### Wichtige Unterschiede zu V1
1. **60 Steps** (nicht 180)
2. **Alle Aspekte steigen gleich** (nicht nacheinander)
3. **Max 1 Step pro Tag** (nicht pro Claim)
4. **60 Tage fix** (nicht 6 Zyklen)
5. **Kein Auto-Advance** (nur manuell oder nach 24h)

## Deployment Checkliste

- [ ] Contract V2 deployen
- [ ] Test: 1 Claim → Progress +1
- [ ] Test: 2. Claim am selben Tag → Progress bleibt
- [ ] Test: Nächster Tag → Progress +1
- [ ] Test: 60 Tage → Alle Level 3.0
