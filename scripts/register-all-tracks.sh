#!/bin/bash

# Register All Tracks to SwordEvolutionV2
# This script adds all tracks that have hitmaps to the contract

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Register All Tracks - SwordEvolutionV2${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}ERROR: .env.local not found${NC}"
    echo "Run this script from the project root directory"
    exit 1
fi

# Source environment
set -a
source .env.local
set +a

# Check required variables
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x..." ]; then
    echo -e "${RED}ERROR: PRIVATE_KEY not set in .env.local${NC}"
    exit 1
fi

if [ -z "$CONTRACT_ADDRESS_BASE_SEPOLIA" ] || [ "$CONTRACT_ADDRESS_BASE_SEPOLIA" = "0x..." ]; then
    echo -e "${RED}ERROR: CONTRACT_ADDRESS_BASE_SEPOLIA not set in .env.local${NC}"
    exit 1
fi

RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
CONTRACT="$CONTRACT_ADDRESS_BASE_SEPOLIA"

echo -e "Contract: ${CYAN}$CONTRACT${NC}"
echo -e "RPC: ${CYAN}$RPC_URL${NC}"
echo ""

# Check if cast is available
if ! command -v cast &> /dev/null; then
    echo -e "${RED}ERROR: 'cast' command not found${NC}"
    echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# Get current track count
TRACK_COUNT=$(cast call "$CONTRACT" "trackCount()" --rpc-url "$RPC_URL" 2>/dev/null | xargs printf "%d")
echo -e "Current tracks registered: ${YELLOW}$TRACK_COUNT${NC}"
echo ""

# Define all tracks with their durations in milliseconds
# Format: "NAME:DURATION_MS"
# Durations from hitmap totalDuration values
declare -a TRACKS=(
    "GR1FTSWORD:139880"
    "FLASHWORD:121120"
    "FUNKSWORD:157600"
    "ATARISWORD:150000"
    "DR4GONSWORD:200000"
    "PUNCHSWORD:160000"
    "NIGHTSWORD:175000"
    "DANGERSWORD:190000"
    "SHONENSWORD:185000"
    "WORFSWORD:170000"
)

# Function to check if track exists
track_exists() {
    local name="$1"
    for i in $(seq 0 $((TRACK_COUNT - 1))); do
        local existing=$(cast call "$CONTRACT" "tracks(uint256)" "$i" --rpc-url "$RPC_URL" 2>/dev/null | head -1 | tr -d '"' | xargs)
        if [ "$existing" = "$name" ]; then
            return 0
        fi
    done
    return 1
}

# List tracks to add
echo -e "${YELLOW}Tracks to register:${NC}"
echo ""
TRACKS_TO_ADD=()
for track in "${TRACKS[@]}"; do
    NAME="${track%%:*}"
    DURATION="${track##*:}"
    
    if track_exists "$NAME"; then
        echo -e "  ${GREEN}✓${NC} $NAME (${DURATION}ms) - already registered"
    else
        echo -e "  ${YELLOW}+${NC} $NAME (${DURATION}ms) - will be added"
        TRACKS_TO_ADD+=("$track")
    fi
done

echo ""

if [ ${#TRACKS_TO_ADD[@]} -eq 0 ]; then
    echo -e "${GREEN}All tracks already registered!${NC}"
    exit 0
fi

echo -e "Will add ${YELLOW}${#TRACKS_TO_ADD[@]}${NC} new tracks."
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${CYAN}Adding tracks...${NC}"
echo ""

# Add each track
SUCCESS=0
FAILED=0
for track in "${TRACKS_TO_ADD[@]}"; do
    NAME="${track%%:*}"
    DURATION="${track##*:}"
    
    echo -n "  Adding $NAME ($DURATION ms)... "
    
    TX=$(cast send "$CONTRACT" \
        "addTrack(string,uint256)" \
        "$NAME" \
        "$DURATION" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        TX_HASH=$(echo "$TX" | jq -r '.transactionHash')
        echo -e "${GREEN}✓${NC} tx: $TX_HASH"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi
    
    # Small delay between transactions
    sleep 1
done

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "  ${GREEN}Success: $SUCCESS${NC}  ${RED}Failed: $FAILED${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Verify final count
FINAL_COUNT=$(cast call "$CONTRACT" "trackCount()" --rpc-url "$RPC_URL" 2>/dev/null | xargs printf "%d")
echo -e "Total tracks now registered: ${GREEN}$FINAL_COUNT${NC}"
echo ""

# Show active challenge
echo -e "${CYAN}Current active challenge:${NC}"
CHALLENGE=$(cast call "$CONTRACT" "getActiveChallenge()" --rpc-url "$RPC_URL" 2>/dev/null)
echo "$CHALLENGE"
echo ""
echo -e "${GREEN}Done!${NC}"
