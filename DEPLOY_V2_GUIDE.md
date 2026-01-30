# SwordEvolutionV2 Deployment Guide

## Voraussetzungen

1. **Foundry installiert**: `forge --version`
2. **Cast installiert**: `cast --version`
3. **Base Sepolia ETH**: Mindestens 0.01 ETH für Gas
   - Faucet: https://www.alchemy.com/faucets/base-sepolia
4. **Private Key**: Deployer-Wallet mit Base Sepolia ETH

## Schritt-für-Schritt Deployment

### 1. Environment vorbereiten

```bash
# In .env.local (im Projekt-Root)
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

**WICHTIG**: 
- Nutze ein dediziertes Deployer-Wallet (nicht dein Main-Wallet!)
- PRIVATE_KEY niemals committen!
- `.env.local` ist in `.gitignore`

### 2. Balance check

```bash
# Prüfe ob genug ETH auf Base Sepolia
cast wallet address --private-key $PRIVATE_KEY
cast balance <DEPLOYER_ADDRESS> --rpc-url https://sepolia.base.org
```

### 3. Deployment ausführen

```bash
# Variante A: Mit dem Skript (empfohlen)
./scripts/deploy.sh

# Variante B: Manuell mit forge
source .env.local
cd contracts
forge script script/DeployV2.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify
```

### 4. Contract-Adresse speichern

Nach dem Deploy findest du die Adresse in:
- Terminal-Output
- `deployment.log` (im Projekt-Root)

Füge sie zu `.env.local` hinzu:
```bash
CONTRACT_ADDRESS_BASE_SEPOLIA=0x...
NEXT_PUBLIC_CONTRACT_ADDRESS_V2=0x...
```

### 5. Ersten Track hinzufügen

```bash
# Füge GR1FTSWORD Track hinzu
cast send $CONTRACT_ADDRESS_BASE_SEPOLIA \
    "addTrack(string,uint256)" \
    "GR1FTSWORD" \
    139880 \
    --rpc-url https://sepolia.base.org \
    --private-key $PRIVATE_KEY
```

### 6. Frontend aktualisieren

In `src/lib/contracts/swordEvolutionV2.ts`:
```typescript
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  84532: '0x...', // Deine neue Adresse
  8453: '0x0000000000000000000000000000000000000000',
};
```

### 7. API aktualisieren

Stelle sicher, dass `CONTRACT_ADDRESS_BASE_SEPOLIA` in Vercel gesetzt ist.

## Verifizierung auf BaseScan

Falls `--verify` nicht funktioniert:

```bash
# Manuelle Verifizierung
forge verify-contract \
    --chain-id 84532 \
    --watch \
    --constructor-args "" \
    <CONTRACT_ADDRESS> \
    contracts/SwordEvolutionV2.sol:SwordEvolutionV2
```

## Troubleshooting

### "Insufficient balance"
- Hole mehr Base Sepolia ETH vom Faucet

### "Invalid private key"
- Prüfe dass PRIVATE_KEY mit `0x` beginnt
- Keine Leerzeichen oder Quotes

### "Contract already deployed"
- Das Skript erkennt bereits deployed Contracts nicht
- Einfach neue Adresse in .env.local eintragen

### Verify failed
- Manchmal dauert es 1-2 Minuten
- Versuche es manuell auf BaseScan

## Nach dem Deploy

1. **Teste den Contract**:
   - Verbinde Wallet
   - Starte Challenge
   - Claim mit 70%+ Score
   - Prüfe ob Progress steigt

2. **Füge mehr Tracks hinzu**:
   ```bash
   cast send $CONTRACT_ADDRESS "addTrack(string,uint256)" "FLASHWORD" 120000 --rpc-url $RPC --private-key $PK
   ```

3. **Update README** mit neuer Contract-Adresse

## Sicherheit

- ✓ Deployer-Wallet nur für Deployments nutzen
- ✓ Contract auf Base Sepolia erst testen
- ✓ Dann erst Mainnet deployen
- ✓ Private Key niemals teilen oder committen
