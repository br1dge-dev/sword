# Sword Project Session Context
**Date:** December 30, 2025  
**Agent:** OpenCode CLI  
**Session Purpose:** Development & feature work

## Current State
- **Branch:** `fix/entropy-gating-telemetry`
- **Version:** v0.1.3 (recently bumped)
- **Status:** Active development on audio performance & beat detection

## Key Focus Areas (Dec 30, 2025)
1. **AudioAnalyzer Optimization**
   - Working on performance at 60Hz
   - Memory allocation reduction
   - Beat grid PLL stability

2. **Beat-Quantized Visual Effects**
   - Entropy explosions synced to beats
   - Sword impacts on downbeats
   - Background canvas optimization

3. **Recent Architecture Decisions**
   - PLL beat grid for BPM detection
   - Forge levels (1-4) for progressive visuals
   - Mobile controls overlay for touch devices

## Code Structure Notes
```
src/
├── components/ascii/sword-modules/
│   ├── AsciiSwordModular.tsx      # Main sword component
│   └── AsciiBackgroundCanvas.tsx   # Background effects
├── components/ui/
│   ├── AudioControlPanel.tsx       # Audio controls
│   └── MobileControlsOverlay.tsx   # Touch controls
├── hooks/
│   └── useAudioAnalyzer.ts         # Audio analysis hook
└── lib/audio/
    └── audioAnalyzer.ts            # Core audio logic
```

## Recent Commits Context
- **542eaf0**: Fixed entropy suppression by grid lag
- **29183d8**: Quantized major sword events to downbeats  
- **5107a3e**: Added PLL beat grid for stable BPM/phase detection
- **0879e31**: Added this session context (Dec 30, 2025)

## Technology Stack
- **Next.js 16.x** with App Router
- **React 19.x**
- **Zustand 5.x** for state management
- **Tailwind CSS 4.x** for styling
- **Web Audio API** + `web-audio-beat-detector`
- **Vercel** for deployment

## Key Files Being Worked On
1. `src/components/ascii/sword-modules/AsciiSwordModular.tsx` - Core sword logic
2. `src/lib/audio/audioAnalyzer.ts` - Audio processing core
3. `src/components/ui/AudioControlPanel.tsx` - Audio controls
4. `src/hooks/useAudioAnalyzer.ts` - React hooks for audio

## Known Issues/Focus
- Entropy suppression by grid lag (partially fixed)
- Performance optimization for 60fps animations
- Mobile touch controls stability

## Tomorrow's Context
When you continue working on this project:
1. Check the current branch: `git branch --show-current`
2. Review last commits: `git log --oneline -5`
3. Check status: `git status`
4. Look at recent changes: `git diff HEAD~3..HEAD`

The agent can read this file and the git history to understand the project state.