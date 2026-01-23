# $EDGE - Proof of Rhythm Free Mint

## Konzept-Dokument v1.0
## Erstellt: 21. Januar 2026

---

## TL;DR

100 Tage lang können täglich 10 User je 100 $EDGE claimen, indem sie eine 45-sekündige Rhythm-Challenge bestehen (≥90% Accuracy). Erfolgreiche Claims treiben die Evolution eines globalen Schwertes voran. Kein Team Reserve - unclaimed $EDGE bleibt in Treasury.

---

## Kernmechanik

### Daily Flow

1. Track startet (aus rotierendem Pool)
2. Nach 10-40s (random): 45s Challenge-Window
3. User tappt Beat auf das Schwert (curated Hit-Map)
4. ≥90% Accuracy = Erfolg
5. Erfolg = Claim 100 $EDGE (on-chain, server-signiert)
6. Max 10 Claims pro Tag, danach Faucet zu
7. 1 Claim pro Wallet pro Tag, 3 Versuche bei Fail

### Tokenomics

| Parameter | Wert |
|-----------|------|
| Token Name | $EDGE |
| Max Supply | 100,000 $EDGE |
| Daily Emission | 1,000 $EDGE (10 × 100) |
| Duration | 100 Tage |
| Cost | Gas only |
| Team Reserve | 0% |
| Unclaimed | Treasury |

---

## Globale Schwert-Progression

### Schedule (60 Schritte über ~60 Tage)

| Phase | Tage | Progression |
|-------|------|-------------|
| FORGE | 1-20 | Lvl 1→2 (10d), Lvl 2→3 (10d) |
| CHARGE | 21-40 | Lvl 1→2 (10d), Lvl 2→3 (10d) |
| GLITCH | 41-60 | Lvl 1→2 (10d), Lvl 2→3 (10d) |
| BONUS | 61-100 | Reiner $EDGE Mint / Failed Day Buffer |

### Fortschritt pro Tag

- Mind. 1 erfolgreicher Claim = 1 Minischritt freigeschaltet
- 0 Claims = Tag failed

### Failed Days Policy

- Jeder failed Tag wird 1x wiederholt (am Ende der Phase)
- Max 20 failed Days recoverable
- Danach: permanent verpasst, Schwert bleibt unfertig

---

## Anti-Bot / Proof of Ohrwurm

### Challenge-basiert

- 45s Echtzeit-Tapping (nicht skippbar)
- Random Start-Offset (10-40s in Track)
- Curated Hit-Map pro Track (~50-60 Hits)
- Timing-Toleranz: ±150ms
- Timing-Varianz Check (zu perfekt = rejected)

### Server-Signed Claims

```
Frontend → Challenge absolviert → Backend validiert → Signatur
→ Contract verifiziert Signatur → Mint $EDGE
```

Direct Contract Calls ohne gültige Signatur = rejected.

### Rate Limits

- 1 erfolgreicher Claim pro Wallet pro Tag
- 3 Versuche pro Tag (bei Fail)
- 10 Claims pro Tag global

---

## Track-System

### Pool

- Start mit 3-5 Tracks
- Rotation: Sequenziell durch Pool
- Neue Tracks werden ans Ende hinzugefügt

### Hit-Maps

- Manuell erstellt (Timestamps Array)
- Format: [0.42, 0.87, 1.24, 1.68, ...] (Sekunden)
- ~50-60 Hits pro 45s Challenge
- Tool: Mini-App zum Recorden der Klicks

---

## On-Chain State

### EdgeToken.sol (ERC-20)

- MAX_SUPPLY: 100,000 $EDGE
- mint(): nur durch EdgeController
- Standard ERC-20 (tradeable)

### EdgeController.sol

- signer: Backend Public Key für Signatur-Verifikation
- currentDay: uint256
- dailyClaims[day]: uint256 (0-10)
- hasClaimed[day][wallet]: bool
- swordState: (forgeLevel, chargeLevel, glitchLevel)
- swordProgress: (forgeSteps, chargeSteps, glitchSteps)

### Functions

- claim(day, trackId, accuracy, signature): Mint $EDGE + Update State
- getSwordState(): View aktuellen Schwert-Status
- getDailyStatus(): View Claims heute

---

## Frontend Integration

### Neuer Challenge-Mode

Bestehendes Schwert wird klickbar während Challenge. Visual Feedback: Pulsieren im Beat, Hit/Miss Indikator. Live Stats: Accuracy %, Combo, Hits/Total.

### Screens

1. **Landing**: Day X/100, Claims heute, Schwert-Status
2. **Pre-Challenge**: Track läuft, Countdown bis Challenge
3. **Challenge Active**: 45s Tapping, Live Stats
4. **Result Success**: Accuracy, +100 $EDGE, Claim Button
5. **Result Fail**: Accuracy, Attempts remaining, Retry Button

---

## Endresultat-Szenarien

| Szenario | Beschreibung |
|----------|--------------|
| Best Case | 60/60 Schritte, Schwert voll evolved, 40 Bonus-Tage |
| Realistic | ~55/60 Schritte, "Community schaffte 92%" |
| Worst Case | Viele Fails, Schwert bleibt unfertig |

---

## Nächste Schritte

### Phase 1: Frontend Prototyp

1. [ ] Hit-Map Recording Tool bauen
2. [ ] Challenge-Mode ins Schwert integrieren
3. [ ] Testen ob 45s + 90% Threshold gut spielbar ist
4. [ ] Erste Hit-Maps für 3 Tracks erstellen

### Phase 2: Backend

1. [ ] Challenge-Validierung Endpoint
2. [ ] Signatur-Generierung
3. [ ] Session Management
4. [ ] Daily State Tracking

### Phase 3: Smart Contracts

1. [ ] EdgeToken.sol
2. [ ] EdgeController.sol
3. [ ] Tests
4. [ ] Testnet Deploy (Base Sepolia)

### Phase 4: Launch

1. [ ] Mainnet Deploy
2. [ ] Frontend Live
3. [ ] Tag 1 beginnt

---

## Offene Fragen

- [ ] Tolerance für Hits: ±100ms oder ±150ms?
- [ ] Wie viele Tracks zum Launch?
- [ ] Domain für Backend?
- [ ] Treasury Wallet für unclaimed $EDGE?