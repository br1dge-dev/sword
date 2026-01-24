# GR1FTSWORD On-Chain Specification

> Version: 1.0 Draft  
> Last Updated: January 2026

---

## Overview

A single smart contract that handles:
- **$EDGE Token** (ERC-20, mintable through gameplay)
- **Challenge Verification** (Merkle Proof based)
- **Level Progression** (Forge, Charge, Glitch: 1.0 → 3.0)
- **Rotating Track Pool** (random daily challenge from pool)

---

## Core Mechanics

### $EDGE Token

| Property | Value |
|----------|-------|
| Name | EDGE |
| Symbol | EDGE |
| Decimals | 18 |
| Max Supply | TBD (based on total possible claims) |
| Minting | Only through challenge completion |

### Challenge System

| Property | Value |
|----------|-------|
| Claims per Day | Max 10 |
| $EDGE per Claim | 100 |
| Max $EDGE per Day | 1,000 |
| Min Score for Success | 70% |
| Challenge Duration | 24 hours |

### Level Progression

| Aspect | Start | Max | Steps per Level-Up |
|--------|-------|-----|-------------------|
| Forge | 1.0 | 3.0 | 10 |
| Charge | 1.0 | 3.0 | 10 |
| Glitch | 1.0 | 3.0 | 10 |

**Total Steps:** 60 (20 per aspect)

**Rule:** First successful challenge per day = +1 step on chosen aspect.

---

## Track Pool System

### Rotating Daily Challenge

```
Day N → Hash(N) → Select Track from Pool → Select Day within Track
```

- Tracks rotate pseudo-randomly every 24 hours
- Each track has a `weight` for selection probability
- New tracks can be added without contract upgrade

### Track Data Structure

```solidity
struct Track {
    string name;           // "GR1FTSWORD"
    uint256 totalDays;     // 60
    uint256 weight;        // Selection probability weight
    bool active;           // Can be disabled
}
```

### Challenge Selection (Pseudo-Random)

```solidity
function getActiveChallenge() public view returns (uint256 trackId, uint256 dayInTrack) {
    uint256 dayNumber = block.timestamp / 24 hours;
    uint256 seed = uint256(keccak256(abi.encodePacked(dayNumber)));
    // Select track based on weighted random
    // Select day within track
}
```

---

## Verification System

### Merkle Proof Approach

**Why Merkle Proof?**
- Fully on-chain verification
- No backend trust required
- Gas efficient (only store roots, not full hitmaps)

**Storage:**
```solidity
// Only Merkle Roots stored on-chain (32 bytes per track-day)
mapping(bytes32 => bytes32) public challengeMerkleRoots;  // keccak(trackId, day) → root
```

**Hitmap Data:**
- Stored off-chain (Frontend loads JSON)
- Merkle Root verifies integrity
- User generates proof locally

### Claim Flow

```
1. Frontend loads hitmap JSON for today's track
2. User plays challenge, records click timestamps
3. Frontend generates Merkle Proof of hits
4. User calls claimChallenge(proof, score, upgradeType)
5. Contract verifies proof against stored root
6. Contract mints $EDGE + updates level
```

---

## User State

```solidity
struct UserState {
    uint8 levelForge;           // 1-30 (1.0-3.0 in 0.1 steps)
    uint8 levelCharge;          // 1-30
    uint8 levelGlitch;          // 1-30
    uint256 totalEarnedEdge;    // Allocated
    uint256 totalMintedEdge;    // Actually minted
    uint256 lastClaimDay;       // Prevents double-claim
    uint8 claimsToday;          // Max 10
}
```

---

## Contract Interface

### Core Functions

```solidity
// User claims challenge completion
function claimChallenge(
    bytes32[] calldata merkleProof,
    uint8 score,
    uint8 upgradeType  // 0=Forge, 1=Charge, 2=Glitch
) external;

// Mint accumulated $EDGE (batch)
function mintEdge() external;

// Get current active challenge
function getActiveChallenge() external view returns (
    uint256 trackId,
    uint256 dayInTrack,
    string memory trackName
);

// Get user state
function getUserState(address user) external view returns (
    uint8 levelForge,
    uint8 levelCharge,
    uint8 levelGlitch,
    uint256 earnedEdge,
    uint256 mintedEdge
);
```

### Admin Functions

```solidity
// Add new track to pool
function addTrack(
    string calldata name,
    uint256 totalDays,
    uint256 weight
) external onlyOwner returns (uint256 trackId);

// Set merkle root for track-day
function setChallengeMerkleRoot(
    uint256 trackId,
    uint256 day,
    bytes32 merkleRoot
) external onlyOwner;

// Add new level threshold
function addLevelThreshold(uint256 stepsRequired) external onlyOwner;

// Toggle track active status
function setTrackActive(uint256 trackId, bool active) external onlyOwner;
```

### Events

```solidity
event ChallengeCompleted(
    address indexed user,
    uint256 indexed trackId,
    uint256 day,
    uint8 score,
    bool levelUp
);

event LevelUp(
    address indexed user,
    uint8 upgradeType,  // 0=Forge, 1=Charge, 2=Glitch
    uint8 newLevel
);

event EdgeEarned(address indexed user, uint256 amount, uint256 totalEarned);
event EdgeMinted(address indexed user, uint256 amount);
event TrackAdded(uint256 indexed trackId, string name);
```

---

## Extensibility

### Adding New Levels

```solidity
// Current: [10, 10] → Levels 1.0, 2.0, 3.0
// Future:  [10, 10, 15] → Levels 1.0, 2.0, 3.0, 4.0
owner.addLevelThreshold(15);
```

### Adding New Tracks

```solidity
uint256 newTrackId = owner.addTrack("NEW_TRACK", 90, 5);
for (uint256 day = 1; day <= 90; day++) {
    owner.setChallengeMerkleRoot(newTrackId, day, merkleRoot);
}
```

---

## Frontend Integration

### Required Data

| Source | Data |
|--------|------|
| Contract | User state, active challenge, levels |
| JSON (off-chain) | Hitmap timestamps, audio file URL |

### Wallet Connection

- **Library:** wagmi + viem + RainbowKit
- **Chain:** TBD (Base, Arbitrum, or Mainnet)
- **Requirements:** Connect, sign, send transactions

### Challenge Flow (Frontend)

```typescript
// 1. Get active challenge
const { trackId, day } = await contract.getActiveChallenge();

// 2. Load hitmap from JSON
const hitmap = await fetch(`/hitmaps/${trackName}_day${day}.json`);

// 3. User plays challenge
const userClicks = recordUserClicks();

// 4. Calculate score
const score = calculateScore(userClicks, hitmap);

// 5. Generate Merkle Proof
const proof = generateMerkleProof(userClicks, hitmap);

// 6. Claim on-chain
await contract.claimChallenge(proof, score, selectedUpgradeType);
```

---

## Open Questions

### 1. Chain Selection

| Option | Pros | Cons |
|--------|------|------|
| Base | Low gas, Coinbase ecosystem | Newer |
| Arbitrum | Low gas, established | Crowded |
| Mainnet | Most secure, prestigious | Expensive |

**Recommendation:** Base (low gas, good for gaming)

### 2. Leaderboard

On-chain sorting is expensive. Options:
- **Subgraph:** Index events, query off-chain
- **Backend:** Listen to events, maintain sorted list
- **Hybrid:** Store top 10 on-chain, rest off-chain

**Recommendation:** Subgraph or simple backend indexer

### 3. $EDGE Minting Strategy

| Option | Gas per Claim | UX |
|--------|--------------|-----|
| Mint immediately | Higher | Simpler |
| Batch mint later | Lower | Extra step |

**Recommendation:** Batch mint (user calls `mintEdge()` when ready)

---

## Security Considerations

### Merkle Proof Verification

- Roots are immutable once set
- Proofs are verified on-chain
- No backend trust required

### Randomness

- Track selection uses `block.timestamp / 24 hours`
- Predictable but not exploitable (no financial incentive)
- Acceptable for game mechanics

### Access Control

- Only owner can add tracks/set roots
- Users can only claim with valid proofs
- No upgradeability (immutable contract)

---

## Gas Estimates

| Operation | Estimated Gas |
|-----------|--------------|
| Deploy | ~2,000,000 |
| Add Track | ~100,000 |
| Set Merkle Root | ~50,000 |
| Claim Challenge | ~80,000 |
| Mint Edge | ~50,000 |

---

## Next Steps

1. **Finalize Chain Selection**
2. **Write Contract (Solidity)**
3. **Generate Merkle Roots for existing hitmaps**
4. **Frontend: Wallet integration**
5. **Frontend: Merkle Proof generation**
6. **Deploy to Testnet**
7. **Audit / Review**
8. **Deploy to Mainnet**
