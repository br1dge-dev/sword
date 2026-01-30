#!/bin/bash

# GR1FTSWORD Secure Deployment Script
# This script guides you through the secure deployment process
# Your private key NEVER leaves your machine

set -e

echo "============================================"
echo "  GR1FTSWORD Secure Deployment"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "contracts/SwordEvolutionV2.sol" ]; then
    echo -e "${RED}ERROR: Please run this script from the project root${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}WARNING: .env.local not found${NC}"
    echo "Creating from template..."
    cp .env.local.example .env.local
    echo -e "${GREEN}Created .env.local - please edit it with your values${NC}"
    echo ""
    echo "Required variables:"
    echo "  PRIVATE_KEY=0x... (your deployer private key)"
    echo "  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org"
    echo ""
    exit 1
fi

# Source and export environment variables
set -a
source .env.local
set +a

# Check for private key
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x..." ] || [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo -e "${RED}ERROR: PRIVATE_KEY not set in .env.local${NC}"
    echo ""
    echo "Please add your deployer private key to .env.local:"
    echo "  PRIVATE_KEY=0x..."
    echo ""
    echo -e "${YELLOW}SECURITY WARNING:${NC}"
    echo "  - NEVER commit .env.local to git"
    echo "  - Use a dedicated deployer wallet (not your main wallet)"
    echo "  - Consider using a hardware wallet for mainnet"
    exit 1
fi

# Check for RPC URL
if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}ERROR: BASE_SEPOLIA_RPC_URL not set${NC}"
    echo "Add to .env.local: BASE_SEPOLIA_RPC_URL=https://sepolia.base.org"
    exit 1
fi

# Get deployer address
echo "Checking deployer address..."
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null || echo "")

if [ -z "$DEPLOYER" ]; then
    echo -e "${RED}ERROR: Invalid PRIVATE_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}Deployer address: $DEPLOYER${NC}"
echo ""

# Check balance
echo "Checking deployer balance on Base Sepolia..."
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$BASE_SEPOLIA_RPC_URL" 2>/dev/null || echo "0")
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc 2>/dev/null || echo "0")

echo "Balance: $BALANCE_ETH ETH"

if (( $(echo "$BALANCE_ETH < 0.001" | bc -l) )); then
    echo -e "${RED}ERROR: Insufficient balance${NC}"
    echo ""
    echo "You need Base Sepolia ETH for gas."
    echo "Get some from: https://www.alchemy.com/faucets/base-sepolia"
    exit 1
fi

echo -e "${GREEN}✓ Sufficient balance${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}Ready to deploy V2!${NC}"
echo ""
echo "Network: Base Sepolia (Testnet)"
echo "Contract: SwordEvolutionV2"
echo "Features:"
echo "  - 60 days, sequential aspects"
echo "  - FORGE (10d) → CHARGE (10d) → GLITCH (10d)"
echo "Deployer: $DEPLOYER"
echo "Balance: $BALANCE_ETH ETH"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Deploying SwordEvolutionV2..."
echo ""

# Run deployment with environment variables
cd contracts
PRIVATE_KEY="$PRIVATE_KEY" \
BASE_SEPOLIA_RPC_URL="$BASE_SEPOLIA_RPC_URL" \
forge script script/DeployV2.s.sol \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --broadcast \
    --verify \
    2>&1 | tee ../deployment.log

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Check deployment.log for details."
echo ""
echo "Next steps:"
echo "1. Copy the contract address from the log"
echo "2. Add to .env.local:"
echo "   CONTRACT_ADDRESS_BASE_SEPOLIA=0x..."
echo "   NEXT_PUBLIC_CONTRACT_ADDRESS_V2=0x..."
echo "3. Add your first track using cast or the admin UI"
echo "4. Update API signer to use new contract address"
