# Sword Project Session Context
**Date:** January 25, 2026  
**Agent:** OpenCode CLI  
**Session Purpose:** On-Chain Integration & Challenge System

## Current State
- **Branch:** `main`
- **Version:** v0.1.3
- **Status:** Contract hooks integrated, awaiting deployment

## Recent Progress (January 2026)

### ✅ Completed
1. **SwordEvolution.sol** - Full contract with ERC-20 ($EDGE), challenge verification, level progression
2. **Merkle Library** (`src/lib/merkle/index.ts`) - Proof generation for challenge verification
3. **Web3Provider** (`src/providers/Web3Provider.tsx`) - wagmi + RainbowKit integration
4. **Contract Hooks** (`src/hooks/useContract.ts`) - All read/write hooks for contract interaction
5. **Challenge Flow Integration** - Wallet check, claim button, status display
6. **Level Displays** - Read from contract when connected, demo mode fallback
7. **Wallet Indicator** - Minimalist connect/disconnect UI element

### 🔄 In Progress
- Contract deployment to Base Sepolia
- Merkle root generation for tracks
- Leaderboard with real $EDGE balances

## Code Structure
```
src/
├── app/
│   └── page.tsx                    # Main page with sword + UI
├── components/
│   ├── ascii/                      # ASCII sword rendering
│   └── ui/
│       ├── AudioControlPanel.tsx   # Music + Challenge mode
│       ├── ForgeProgressBar.tsx    # Level display (contract-aware)
│       ├── ChargeProgressBar.tsx   # Level display (contract-aware)
│       ├── GlitchProgressBar.tsx   # Level display (contract-aware)
│       ├── SideButtons.tsx         # Progress bars container
│       └── WalletIndicator.tsx     # Wallet connect/disconnect
├── hooks/
│   ├── useContract.ts              # Contract interaction hooks
│   └── useAudioAnalyzer.ts         # Audio analysis
├── lib/
│   └── merkle/index.ts             # Merkle proof generation
├── providers/
│   └── Web3Provider.tsx            # RainbowKit + wagmi config
└── store/
    └── powerUpStore.ts             # Local state (demo mode)

contracts/
├── SwordEvolution.sol              # Main contract (ERC-20 + Challenges)
└── README.md                       # Contract documentation
```

## Contract Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| SwordEvolution.sol | ✅ Written | Not yet deployed |
| useContract hooks | ✅ Complete | Address placeholder `0x000...` |
| Challenge Flow | ✅ Integrated | Shows "DEMO MODE" until deployed |
| Level Displays | ✅ Integrated | Falls back to local state |
| Leaderboard | ❌ Mock data | Needs contract for real balances |
| Merkle Proofs | ⚠️ Placeholder | Real proof generation needed |

## Next Steps
1. Deploy SwordEvolution.sol to Base Sepolia
2. Update contract addresses in `useContract.ts`
3. Generate Merkle roots for tracks
4. Integrate real leaderboard data
5. Test full claim flow on testnet

## Technology Stack
- **Next.js 16.x** with App Router
- **React 19.x**
- **wagmi + viem** for contract interaction
- **RainbowKit** for wallet connection
- **Zustand 5.x** for state management
- **Tailwind CSS 4.x** for styling
- **Solidity 0.8.x** for contracts
- **Base** (L2) for deployment

## Key Commands
```bash
# Dev server
npm run dev

# Build
npm run build

# Contract compilation (if foundry installed)
cd contracts && forge build
```

## Recent Commits
- `2f56169` feat(ui): integrate contract hooks into challenge flow and level displays
- `34fa9a1` feat: add on-chain infrastructure for $EDGE token and challenges
- `2a1f26f` docs: fix spec - 10 global claims/day, 1 per wallet, random 45s window
