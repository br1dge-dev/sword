# GR1FTSWORD On-Chain Specification

> Version: 1.1  
> Last Updated: January 2026

---

## Overview

A single smart contract that handles:
- **$EDGE Token** (ERC-20, minted immediately on claim)
- **Challenge Verification** (Merkle Proof based, fully on-chain)
- **Level Progression** (Forge → Charge → Glitch rotation)
- **Rotating Track Pool** (random daily challenge from pool)

**Chain:** Base (low gas, good for gaming)

---

## Core Mechanics

### $EDGE Token

| Property | Value |
|----------|-------|
| Name | EDGE |
| Symbol | EDGE |
| Decimals | 18 |
| Max Supply | 6,000,000 (60 days × 10 claims × 100 × ~1000 users) |
| Minting | Immediately on successful claim |

### Challenge System

| Property | Value |
|----------|-------|
| Claims per Day | Max 10 per wallet |
| $EDGE per Claim | 100 |
| Max $EDGE per Wallet per Day | 1,000 |
| Min Score for Success | 70% |
| Challenge Duration | 24 hours (rotates at midnight UTC) |

### Level Progression (Rotating Aspects)

The active aspect **rotates automatically** every 10 days:

| Days | Active Aspect | Level Progress |
|------|---------------|----------------|
| 1-10 | **Forge** (highlighted in UI) | 1.0 → 2.0 |
| 11-20 | **Charge** (highlighted in UI) | 1.0 → 2.0 |
| 21-30 | **Glitch** (highlighted in UI) | 1.0 → 2.0 |
| 31-40 | **Forge** | 2.0 → 3.0 |
| 41-50 | **Charge** | 2.0 → 3.0 |
| 51-60 | **Glitch** | 2.0 → 3.0 |

**Rules:**
- First successful challenge per day = +0.1 on active aspect
- 10 successful days = +1 full level (e.g., Forge 1.0 → 2.0)
- Max level per aspect: 3.0
- Total: 60 days for full evolution (all aspects at 3.0)

**Visual:** Frontend highlights the currently active aspect (glowing border, different color, etc.)

---

## Track Pool System

### Rotating Daily Challenge

```
Day N → Hash(N) → Select Track from Pool → Challenge for that day
```

- Tracks rotate pseudo-randomly every 24 hours
- Each track has a `weight` for selection probability
- New tracks can be added by owner without contract upgrade

### Track Data Structure

```solidity
struct Track {
    string name;           // "GR1FTSWORD"
    uint256 totalDays;     // Number of unique challenge days in this track
    uint256 weight;        // Selection probability weight (higher = more frequent)
    bool active;           // Can be disabled without removal
}
```

### Challenge Selection

```solidity
function getActiveChallenge() public view returns (uint256 trackId, uint256 dayInTrack) {
    uint256 globalDay = block.timestamp / 24 hours;
    uint256 seed = uint256(keccak256(abi.encodePacked(globalDay, "GR1FTSWORD")));
    
    // Select track based on weighted random from seed
    // Select day within track: seed % track.totalDays
}
```

---

## Verification System

### Merkle Proof Approach (Fully On-Chain)

**Why Merkle Proof?**
- Fully on-chain verification - no backend trust required
- Gas efficient - only 32-byte roots stored per track-day
- Transparent - anyone can verify

**On-Chain Storage:**
```solidity
// Merkle Roots: 32 bytes per track-day combination
mapping(bytes32 => bytes32) public challengeRoots;  // keccak(trackId, day) → merkleRoot
```

**Off-Chain (Frontend):**
- Full hitmap JSON files (beat timestamps)
- Audio files
- Proof generation logic

### Claim Flow

```
1. Frontend loads today's track + hitmap JSON
2. User plays challenge, frontend records click timestamps
3. Frontend calculates score (hits within tolerance)
4. Frontend generates Merkle Proof of verified hits
5. User clicks "Claim" → calls claimChallenge(proof, score)
6. Contract verifies proof against stored root
7. Contract mints $EDGE immediately to user
8. If first success today: +0.1 level on active aspect
```

---

## User State

```solidity
struct UserState {
    uint8 levelForge;           // 10-30 (representing 1.0-3.0)
    uint8 levelCharge;          // 10-30
    uint8 levelGlitch;          // 10-30
    uint256 totalMintedEdge;    // Total $EDGE minted to this user
    uint256 lastSuccessDay;     // Global day number of last successful claim
    uint8 claimsToday;          // Claims made today (max 10)
    uint256 lastClaimDay;       // For resetting claimsToday
}
```

**Note:** Levels stored as 10-30 internally (10 = 1.0, 15 = 1.5, 30 = 3.0) for 0.1 precision without floats.

---

## Contract Interface

### Core Functions

```solidity
/// @notice Claim a challenge completion
/// @param merkleProof Proof of valid hits
/// @param score Percentage score (0-100)
function claimChallenge(
    bytes32[] calldata merkleProof,
    uint8 score
) external;

/// @notice Get current active challenge info
function getActiveChallenge() external view returns (
    uint256 trackId,
    uint256 dayInTrack,
    string memory trackName,
    uint8 activeAspect  // 0=Forge, 1=Charge, 2=Glitch
);

/// @notice Get user's current state
function getUserState(address user) external view returns (
    uint8 levelForge,
    uint8 levelCharge,
    uint8 levelGlitch,
    uint256 totalMintedEdge,
    uint8 claimsToday
);

/// @notice Get global evolution day (1-60)
function getEvolutionDay() external view returns (uint256);

/// @notice Get currently active aspect for level-ups
function getActiveAspect() external view returns (uint8);  // 0=Forge, 1=Charge, 2=Glitch
```

### Admin Functions

```solidity
/// @notice Add a new track to the pool
function addTrack(
    string calldata name,
    uint256 totalDays,
    uint256 weight
) external onlyOwner returns (uint256 trackId);

/// @notice Set merkle root for a track-day combination
function setMerkleRoot(
    uint256 trackId,
    uint256 day,
    bytes32 merkleRoot
) external onlyOwner;

/// @notice Batch set multiple merkle roots
function setMerkleRootsBatch(
    uint256 trackId,
    uint256[] calldata days,
    bytes32[] calldata roots
) external onlyOwner;

/// @notice Toggle track active status
function setTrackActive(uint256 trackId, bool active) external onlyOwner;
```

### Events

```solidity
event ChallengeClaimed(
    address indexed user,
    uint256 indexed trackId,
    uint256 dayInTrack,
    uint8 score,
    uint256 edgeMinted
);

event LevelUp(
    address indexed user,
    uint8 indexed aspect,  // 0=Forge, 1=Charge, 2=Glitch
    uint8 newLevel         // 10-30 (1.0-3.0)
);

event TrackAdded(
    uint256 indexed trackId,
    string name,
    uint256 totalDays
);
```

---

## Leaderboard

### Approach: Direct Balance Query

Since $EDGE is a standard ERC-20, leaderboard is simple:

```typescript
// Frontend queries known active addresses
const balances = await Promise.all(
  knownAddresses.map(addr => contract.balanceOf(addr))
);

// Sort by balance
const leaderboard = addresses
  .map((addr, i) => ({ address: addr, balance: balances[i] }))
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 20);
```

**Address Discovery:**
- Index `Transfer` events from contract
- OR: Maintain list of claimers via `ChallengeClaimed` events

**No on-chain sorting needed.** Frontend handles display logic.

---

## Frontend Integration

### Wallet Connection

- **Library:** wagmi + viem + RainbowKit
- **Chain:** Base
- **Requirements:** Connect, read contract state, send transactions

### UI Highlights

1. **Active Aspect Indicator:** Glowing/highlighted Forge/Charge/Glitch based on current day
2. **Evolution Progress:** Visual progress bar for current aspect (0-10 steps)
3. **Daily Challenge:** Shows track name, play button, claim button
4. **$EDGE Balance:** User's minted tokens
5. **Leaderboard:** Top 20 $EDGE holders

### Challenge Flow (Frontend)

```typescript
// 1. Get active challenge
const { trackId, dayInTrack, trackName, activeAspect } = 
  await contract.getActiveChallenge();

// 2. Load hitmap JSON
const hitmap = await fetch(`/hitmaps/${trackName}.json`);

// 3. User plays challenge (existing challenge mode)
const userClicks = await playChallenge(hitmap);

// 4. Calculate score
const score = calculateScore(userClicks, hitmap.beats, hitmap.toleranceMs);

// 5. If score >= 70%, generate Merkle Proof
const proof = generateMerkleProof(userClicks, hitmap);

// 6. Claim on-chain (mints $EDGE immediately)
await contract.claimChallenge(proof, score);

// 7. UI updates: balance, level progress, leaderboard
```

---

## Extensibility

### Adding New Levels (Future)

Current max: 3.0. To add level 4.0:

```solidity
// Owner extends level cap
function setMaxLevel(uint8 newMax) external onlyOwner;
```

### Adding New Tracks

```solidity
// 1. Add track
uint256 trackId = await contract.addTrack("NEW_TRACK", 45, 10);

// 2. Set merkle roots for all days
const roots = generateMerkleRoots(newTrackHitmaps);
await contract.setMerkleRootsBatch(trackId, days, roots);

// Track is now in rotation!
```

---

## Security Considerations

### Merkle Proof Verification
- Roots are set by owner, immutable per track-day
- Proofs verified on-chain using OpenZeppelin MerkleProof
- Invalid proofs rejected, no $EDGE minted

### Claim Limits
- Max 10 claims per wallet per day
- Only first successful claim triggers level-up
- Day resets at midnight UTC

### Access Control
- Owner can add tracks and set roots
- Owner cannot mint $EDGE directly
- Owner cannot modify user state
- No upgradeability (immutable contract)

---

## Gas Estimates (Base L2)

| Operation | Estimated Gas | ~Cost (Base) |
|-----------|--------------|--------------|
| Deploy | ~2,500,000 | ~$2.50 |
| Add Track | ~100,000 | ~$0.10 |
| Set Merkle Root | ~50,000 | ~$0.05 |
| Set Roots Batch (60) | ~800,000 | ~$0.80 |
| Claim Challenge | ~120,000 | ~$0.12 |

**User cost per claim:** ~$0.12 (acceptable for daily gameplay)

---

## Implementation Checklist

### Phase 1: Contract
- [ ] Write `SwordEvolution.sol` (ERC-20 + Challenge + Levels)
- [ ] Merkle Proof verification logic
- [ ] Aspect rotation logic (day % 30 / 10)
- [ ] Unit tests
- [ ] Deploy to Base Sepolia (testnet)

### Phase 2: Merkle Roots
- [ ] Script to generate Merkle tree from hitmap JSON
- [ ] Generate roots for GR1FTSWORD track (60 days)
- [ ] Batch upload roots to contract

### Phase 3: Frontend
- [ ] wagmi/RainbowKit wallet connection
- [ ] `useContract` hooks for reading state
- [ ] Merkle proof generation in browser
- [ ] Claim transaction flow
- [ ] Active aspect highlight in UI
- [ ] Leaderboard (query balances)

### Phase 4: Launch
- [ ] Deploy to Base Mainnet
- [ ] Verify contract on Basescan
- [ ] Set initial track + roots
- [ ] Announce launch
