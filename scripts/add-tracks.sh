#!/bin/bash

# Add Tracks to SwordEvolutionV2
# This script adds all music tracks to the deployed contract

set -e

echo "============================================"
echo "  Add Tracks to SwordEvolutionV2"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}ERROR: .env.local not found${NC}"
    exit 1
fi

# Source environment
set -a
source .env.local
set +a

# Check PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x..." ]; then
    echo -e "${RED}ERROR: PRIVATE_KEY not set${NC}"
    exit 1
fi

# Check CONTRACT_ADDRESS
if [ -z "$CONTRACT_ADDRESS_BASE_SEPOLIA" ] || [ "$CONTRACT_ADDRESS_BASE_SEPOLIA" = "0x..." ]; then
    echo -e "${RED}ERROR: CONTRACT_ADDRESS_BASE_SEPOLIA not set${NC}"
    echo "Add to .env.local:"
    echo "  CONTRACT_ADDRESS_BASE_SEPOLIA=0x..."
    exit 1
fi

echo "Contract: $CONTRACT_ADDRESS_BASE_SEPOLIA"
echo "Network: Base Sepolia"
echo ""
echo "Tracks to add:"
echo "  1. GR1FTSWORD (139880ms)"
echo "  2. FLASHWORD (120000ms)"
echo "  3. FUNKSWORD (180000ms)"
echo "  4. ATARISWORD (150000ms)"
echo "  5. DR4GONSWORD (200000ms)"
echo "  6. PUNCHSWORD (160000ms)"
echo "  7. NIGHTSWORD (175000ms)"
echo "  8. DANGERSWORD (190000ms)"
echo "  9. SHONENSWORD (185000ms)"
echo "  10. WORFSWORD (170000ms)"
echo ""

read -p "Add all tracks? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Adding tracks..."
echo ""

cd contracts
PRIVATE_KEY="$PRIVATE_KEY" \
CONTRACT_ADDRESS_BASE_SEPOLIA="$CONTRACT_ADDRESS_BASE_SEPOLIA" \
forge script script/AddTracks.s.sol \
    --rpc-url "${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}" \
    --broadcast \
    2>&1 | tee ../add-tracks.log

echo ""
echo -e "${GREEN}Done!${NC}"
echo "Check add-tracks.log for details."
