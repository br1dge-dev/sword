# SWORD (GR1FTSWORD)

## Overview
Interactive ASCII sword + music experience with audio-reactive visuals. The UI reacts to audio energy/beat with smooth, beat-quantized animations. Includes idle mode when music isn't playing.

**Status:** Active development
**Branch:** `fix/entropy-gating-telemetry` (check with `git branch --show-current`)

## Package Manager
- **Node.js:** Homebrew (`/opt/homebrew/bin/node`, v25.2.1)
- **npm:** Homebrew (`/opt/homebrew/bin/npm`, v11.7.0)
- **Wichtig:** `export PATH="/opt/homebrew/bin:$PATH"` oder Vollpfad nutzen

## Tech Stack
- **Framework:** Next.js 16.x (App Router)
- **Language:** TypeScript 5.9.x
- **React:** 19.x
- **State:** Zustand 5.x
- **Styling:** Tailwind CSS 4.x + PostCSS
- **Audio:** Web Audio API + `web-audio-beat-detector`
- **Deployment:** Vercel

## Code Architecture
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/build/route.ts  # Debug build info
├── components/ascii/
│   └── sword-modules/
│       ├── AsciiSwordModular.tsx    # Core sword component
│       └── AsciiBackgroundCanvas.tsx # Background effects
├── components/ui/
│   ├── AudioControlPanel.tsx        # Audio controls
│   └── MobileControlsOverlay.tsx     # Touch controls
├── hooks/
│   └── useAudioAnalyzer.ts          # Audio analysis hook
├── store/
│   └── (Zustand stores)
├── lib/audio/
│   └── audioAnalyzer.ts             # Core audio processing
└── public/music/                    # Bundled audio tracks
```

## Coding Conventions
- **Components:** PascalCase (AsciiSwordModular.tsx)
- **Hooks:** camelCase mit use-Prefix (useAudioAnalyzer.ts)
- **Utils/Lib:** camelCase (audioAnalyzer.ts)
- **State:** Zustand stores, keine Redux
- **Styling:** Tailwind Utility Classes

## Current Focus (Dec 2025)
1. AudioAnalyzer Optimization (60Hz performance, memory reduction)
2. Beat-Quantized Visual Effects (entropy explosions synced to beats)
3. PLL beat grid stability for BPM detection
4. Forge levels 1-4 for progressive visual intensity

## Common Tasks
```bash
export PATH="/opt/homebrew/bin:$PATH"
npm ci           # Clean install
npm run dev      # Dev server on :3000
npm run lint     # ESLint check
npm run build    # Production build
npm run analyze:perf  # Performance analysis
npm run bump:patch|minor|major  # Version bump
```

## Key Files
- `src/lib/audio/audioAnalyzer.ts` - Audio processing core
- `src/hooks/useAudioAnalyzer.ts` - React audio hooks
- `src/components/ascii/sword-modules/AsciiSwordModular.tsx` - Main visual

## Debugging
- Build info: `/api/build`
- On-screen badge: `?debug=1`

## Important Notes
- Audio analysis is performance-critical (60fps target)
- PLL beat grid for stable BPM/phase detection
- Mobile touch controls overlay exists
- Forge levels control visual intensity progression

## Recent History (check with `git log --oneline -5`)
- 542eaf0: Fixed entropy suppression by grid lag
- 29183d8: Quantized major sword events to downbeats
- 5107a3e: Added PLL beat grid for stable BPM/phase detection
