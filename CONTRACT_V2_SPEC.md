# SwordEvolution V2 - Contract Specification

## Aktuelle Probleme (V1)

1. **Level-Berechnung falsch**: `_triggerLevelUp` nutzt `claimsToday / 10`, aber das ist nur am Tag mit 10 Claims > 0
2. **24h-Lock**: `advanceDay()` blockiert 24h, aber wir wollen sofortigen Progress
3. **Kein globaler Progress**: Es gibt keine Variable die den Gesamtfortschritt trackt
4. **User-Levels sind irrelevant**: Die `levelForge/Charge/Glitch` im UserState werden nie erhöht

## Gewünschte Mechanik (V2)

### Globaler Progress (Sword-Evolution)
- **180 Steps total** (6 Zyklen × 3 Aspects × 10 Steps)
- Jeder erfolgreiche Claim = +1 Step
- Reihenfolge: Forge 1.0→3.0 → Charge 1.0→3.0 → Glitch 1.0→3.0 → Forge 4.0→6.0 etc.
- Max Level: 6.0 pro Aspect (nach 180 Steps)

### Tageslimit
- Max 10 Claims pro Tag (global)
- Wenn Tag voll (10/10) → nächster Tag beginnt automatisch
- Kein 24h-Lock mehr

### User-Belohnungen
- 100 EDGE pro Claim (max 60,000 EDGE total)
- User kann nur 1x pro Tag claimen
- Score ≥ 70% required

## Neue State-Variablen (V2)

```solidity
// Globaler Fortschritt (0-180)
uint8 public globalProgress;

// Aktueller Tag (1-60)
uint256 public currentDay;

// Claims heute (0-10)
uint8 public claimsToday;

// User-Tracking
mapping(address => uint256) public userLastClaimDay;
mapping(address => uint256) public userTotalClaims;
mapping(address => uint256) public userTotalMinted;

// Aspect-Levels (werden aus globalProgress berechnet)
// Forge: 10-60, Charge: 10-60, Glitch: 10-60
```

## Neue Funktionen (V2)

### claimWithSignature()
```solidity
function claimWithSignature(
    uint8 score,
    uint256 startOffsetMs,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external {
    // 1. Checks: Evolution nicht complete, Tag nicht voll, User nicht heute geclaimed
    // 2. Verify Signature (EIP-712)
    // 3. Update User: lastClaimDay, totalClaims, totalMinted
    // 4. Update Global: claimsToday++, globalProgress++
    // 5. Mint 100 EDGE
    // 6. Emit Claimed
    
    // 7. NEU: Wenn claimsToday == 10 → auto-advance day
    if (claimsToday >= MAX_CLAIMS_PER_DAY) {
        _advanceDay();
    }
}
```

### getAspectLevels()
```solidity
function getAspectLevels() external view returns (
    uint8 forgeLevel,      // 10-60 (1.0-6.0)
    uint8 chargeLevel,     // 10-60
    uint8 glitchLevel,     // 10-60
    uint8 forgeProgress,   // 0-9 (steps in current level)
    uint8 chargeProgress,  // 0-9
    uint8 glitchProgress   // 0-9
) {
    // Berechne aus globalProgress
    uint8 cycle = globalProgress / 30;        // 0-5
    uint8 stepInCycle = globalProgress % 30;  // 0-29
    
    // Base level für diesen Cycle (10, 20, 30, 40, 50, 60)
    uint8 baseLevel = 10 + (cycle * 10);
    
    // Forge: Steps 0-9
    if (stepInCycle < 10) {
        forgeLevel = baseLevel;
        forgeProgress = stepInCycle;
        chargeLevel = baseLevel - 10;  // Noch im vorherigen Cycle
        chargeProgress = 9;
        glitchLevel = baseLevel - 10;
        glitchProgress = 9;
    }
    // Charge: Steps 10-19
    else if (stepInCycle < 20) {
        forgeLevel = baseLevel + 10;  // Forge ist schon fertig
        forgeProgress = 9;
        chargeLevel = baseLevel;
        chargeProgress = stepInCycle - 10;
        glitchLevel = baseLevel - 10;
        glitchProgress = 9;
    }
    // Glitch: Steps 20-29
    else {
        forgeLevel = baseLevel + 10;
        forgeProgress = 9;
        chargeLevel = baseLevel + 10;
        chargeProgress = 9;
        glitchLevel = baseLevel;
        glitchProgress = stepInCycle - 20;
    }
}
```

### getUserState()
```solidity
function getUserState(address user) external view returns (
    uint256 totalClaims,
    uint256 totalMinted,
    bool canClaimToday,
    uint256 lastClaimDay
) {
    return (
        userTotalClaims[user],
        userTotalMinted[user],
        userLastClaimDay[user] != currentDay && claimsToday < MAX_CLAIMS_PER_DAY,
        userLastClaimDay[user]
    );
}
```

### _advanceDay() (internal)
```solidity
function _advanceDay() internal {
    require(currentDay < TOTAL_DAYS, "Evolution complete");
    currentDay++;
    claimsToday = 0;
    emit DayAdvanced(currentDay, globalProgress);
}
```

## Frontend-Integration (V2)

### Hook: useSwordEvolutionV2
```typescript
const { 
  globalProgress,      // 0-180
  currentDay,          // 1-60
  claimsToday,         // 0-10
  aspectLevels,        // { forge, charge, glitch, forgeProgress, ... }
  userState,           // { totalClaims, totalMinted, canClaimToday }
  claim 
} = useSwordEvolutionV2();
```

### UI-Updates
- Progress Bars zeigen `aspectLevels.forgeProgress` etc.
- "Day X of 60" zeigt `currentDay`
- "Claims today: X/10" zeigt `claimsToday`
- Nach Claim: Auto-refresh nach 2 Sekunden

## Deployment Plan

1. **Contract V2 deployen** (Base Sepolia)
2. **Frontend anpassen** (neue ABI, neue Hook-Logik)
3. **Testen**: 
   - 10 Claims am Tag → Auto-Day-Advance
   - Levels steigen korrekt
   - Max 180 Steps
4. **Mainnet deploy** (wenn alles passt)

## Migration (optional)
- V1 Token können geburnt werden
- V2 fresh start (keine Migration nötig, da keine echten User)

## Files zu ändern

### Contract
- `contracts/SwordEvolutionV2.sol` (neu)

### Frontend
- `src/lib/contracts/swordEvolution.ts` (neue ABI)
- `src/hooks/useSwordEvolution.ts` (neue Logik)
- `src/components/ui/AudioControlPanel.tsx` (Progress-Anzeige)
- `src/components/ui/ClaimRewardButton.tsx` (neue Contract-Adresse)
