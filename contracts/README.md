# GR1FTSWORD Smart Contracts

On-chain upgrade system for GR1FTSWORD on Base.

## Setup

```bash
cd contracts
npm install
```

**Requires Node.js 18-22 (LTS)**. Node 25+ is not supported by Hardhat.

## Contracts

### SWORD.sol
ERC-20 token minted as rewards for upgrades.

### SwordUpgradeController.sol
Main contract handling upgrades with bonding curve rewards.

| Tier | Total Upgrades | Reward per Upgrade |
|------|----------------|-------------------|
| 1    | 0 - 999        | 100 $SWORD        |
| 2    | 1,000 - 4,999  | 75 $SWORD         |
| 3    | 5,000 - 14,999 | 50 $SWORD         |
| 4    | 15,000+        | 25 $SWORD         |

**Price**: 0.001 ETH per upgrade step

## Commands

```bash
# Compile
npm run compile

# Test
npm run test

# Deploy to Base Sepolia
npm run deploy:sepolia

# Deploy to Base Mainnet
npm run deploy:mainnet
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `DEPLOYER_PRIVATE_KEY` - Wallet private key for deployment
- `BASESCAN_API_KEY` - For contract verification
