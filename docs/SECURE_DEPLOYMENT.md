# 🔐 Secure Deployment Guide

## Overview

This guide explains how to securely deploy the GR1FTSWORD contract **without sharing your private key with anyone** (including AI assistants).

## ⚠️ Security Principles

1. **Private keys NEVER leave your machine**
2. **NEVER share private keys in chat, email, or code**
3. **Use dedicated deployer wallets** (not your main wallet)
4. **Hardware wallets recommended** for mainnet

## 🚀 Deployment Options

### Option A: Automated Script (Recommended for Testnet)

The easiest way to deploy to Base Sepolia:

```bash
# 1. Create your .env.local file
cp .env.local.example .env.local

# 2. Edit .env.local with your values
# - PRIVATE_KEY: Your deployer private key (0x...)
# - BASE_SEPOLIA_RPC_URL: https://sepolia.base.org

# 3. Run the deployment script
./scripts/deploy.sh
```

The script will:
- ✅ Check your setup
- ✅ Verify you have enough ETH for gas
- ✅ Show your deployer address
- ✅ Ask for confirmation
- ✅ Deploy the contract
- ✅ Save deployment details

### Option B: Manual Foundry Commands

For more control or hardware wallet support:

```bash
# Set environment
export PRIVATE_KEY=0x...
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Deploy
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### Option C: Hardware Wallet (Ledger/Trezor)

Most secure for mainnet:

```bash
# Import your Ledger into Foundry
cast wallet import ledger --ledger

# Deploy using hardware wallet
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --account ledger
```

## 📝 Step-by-Step Instructions

### Step 1: Prepare Deployer Wallet

1. **Create a new wallet** (don't use your main wallet)
   ```bash
   cast wallet new
   ```

2. **Save the private key** securely (password manager, offline storage)

3. **Get test ETH** for Base Sepolia:
   - https://www.alchemy.com/faucets/base-sepolia
   - https://faucet.quicknode.com/base/sepolia

### Step 2: Configure Environment

1. **Copy the example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit .env.local:**
   ```bash
   # Required
   PRIVATE_KEY=0x1234... # Your deployer private key
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   
   # Optional (for verification)
   ETHERSCAN_API_KEY=your_key_here
   ```

3. **Verify .env.local is in .gitignore:**
   ```bash
   grep ".env.local" .gitignore
   # Should show: .env*.local
   ```

### Step 3: Deploy

```bash
# Run the deployment script
./scripts/deploy.sh
```

You'll see:
```
============================================
  GR1FTSWORD Secure Deployment
============================================
Deployer address: 0x...
Balance: 0.01 ETH
✓ Sufficient balance

Ready to deploy!
Network: Base Sepolia (Testnet)
Deployer: 0x...
Balance: 0.01 ETH

Continue with deployment? (yes/no): yes

Deploying contract...
...
SUCCESS! Contract deployed at:
0x1234...
```

### Step 4: Save Contract Address

1. **Copy the contract address** from the output
2. **Add to .env.local:**
   ```bash
   CONTRACT_ADDRESS_BASE_SEPOLIA=0x1234...
   ```
3. **Update frontend:**
   ```bash
   # Edit src/hooks/useContract.ts
   # Replace the placeholder address
   ```

### Step 5: Add First Track

```bash
# Add GR1FTSWORD track (139.88 seconds = 139880 ms)
cast send $CONTRACT_ADDRESS_BASE_SEPOLIA \
  "addTrack(string,uint256)" \
  "GR1FTSWORD" \
  139880 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## 🔒 Security Checklist

Before deploying:

- [ ] Using dedicated deployer wallet (not main wallet)
- [ ] .env.local is in .gitignore
- [ ] .env.local is NOT committed to git
- [ ] Private key is stored securely (password manager)
- [ ] Have enough ETH for gas
- [ ] Test on Sepolia before mainnet

## 🆘 Troubleshooting

### "PRIVATE_KEY not set"
```bash
# Check if .env.local exists
ls -la .env.local

# Source it manually
source .env.local
```

### "Insufficient balance"
Get test ETH from:
- https://www.alchemy.com/faucets/base-sepolia
- https://faucet.quicknode.com/base/sepolia

### "Invalid private key"
- Make sure it starts with `0x`
- Must be 64 hex characters (32 bytes)
- Example: `0x1234567890abcdef...` (64 chars after 0x)

## 📚 Additional Resources

- [Foundry Book - Deployment](https://book.getfoundry.sh/forge/deploying)
- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)

## ⚡ Quick Reference

```bash
# Deploy to Base Sepolia
./scripts/deploy.sh

# Deploy to Base Mainnet (use hardware wallet!)
export BASE_SEPOLIA_RPC_URL=https://mainnet.base.org
./scripts/deploy.sh

# Verify contract
forge verify-contract \
  --chain-id 84532 \
  --watch \
  0xYOUR_CONTRACT_ADDRESS \
  contracts/SwordEvolution.sol:SwordEvolution
```

---

**Remember: Your private key is YOUR responsibility. Never share it!**
