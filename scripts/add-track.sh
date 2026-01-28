#!/bin/bash

# Add Track Script for GR1FTSWORD
# Adds a track to the deployed contract

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo "  Add Track to GR1FTSWORD"
echo "============================================"
echo ""

# Check if we're in the right directory
if [ ! -f "contracts/SwordEvolution.sol" ]; then
    echo -e "${RED}ERROR: Please run this script from the project root${NC}"
    exit 1
fi

# Load environment
if [ ! -f ".env.local" ]; then
    echo -e "${RED}ERROR: .env.local not found${NC}"
    exit 1
fi

set -a
source .env.local
set +a

# Check required variables
if [ -z "$CONTRACT_ADDRESS_BASE_SEPOLIA" ] || [ "$CONTRACT_ADDRESS_BASE_SEPOLIA" = "0x..." ]; then
    echo -e "${RED}ERROR: CONTRACT_ADDRESS_BASE_SEPOLIA not set${NC}"
    echo "Add to .env.local: CONTRACT_ADDRESS_BASE_SEPOLIA=0x..."
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}ERROR: PRIVATE_KEY not set${NC}"
    exit 1
fi

if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}ERROR: BASE_SEPOLIA_RPC_URL not set${NC}"
    exit 1
fi

echo "Contract: $CONTRACT_ADDRESS_BASE_SEPOLIA"
echo ""

# Default track: GR1FTSWORD
TRACK_NAME="${1:-GR1FTSWORD}"
DURATION_MS="${2:-139880}"  # 139.88 seconds = 139880 ms

echo "Adding track:"
echo "  Name: $TRACK_NAME"
echo "  Duration: $DURATION_MS ms"
echo ""

read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Sending transaction..."
echo ""

# Add track using cast
cast send "$CONTRACT_ADDRESS_BASE_SEPOLIA" \
    "addTrack(string,uint256)" \
    "$TRACK_NAME" \
    "$DURATION_MS" \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --private-key "$PRIVATE_KEY"

echo ""
echo -e "${GREEN}✓ Track added successfully!${NC}"
echo ""
