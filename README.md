# SWORD (GR1FTSWORD)

An interactive **ASCII sword + music** experience built with Next.js. The UI reacts to audio energy/beat with smooth, beat-quantized visuals and includes idle animations when music isn't playing.

## Features

- **Audio-reactive ASCII visuals**: sword + background react to energy/beat with smooth animations
- **Beat-quantized effects**: entropy explosions and sword impacts are precisely synchronized to kicks/drums
- **Built-in music playback**: bundled tracks in `public/music`
- **Idle mode**: subtle animation when playback is stopped
- **Forge levels (1-4)**: progressive visual intensity and effect complexity
- **Background canvas layering**: optimized performance for smooth 60fps animations
- **PLL beat grid**: stable BPM detection and phase alignment for musical quantization
- **Debug build fingerprint**: `/api/build` + optional on-screen badge via `?debug=1`

## Tech stack (current)

- **Next.js**: 16.x (App Router)
- **React**: 19.x
- **State**: Zustand 5.x
- **Styling**: Tailwind CSS 4.x + PostCSS
- **Audio analysis**: Web Audio API + `web-audio-beat-detector`
- **Deployment**: Vercel

## Getting started

### Prerequisites

- Node.js 20+ recommended

### Install & run

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

### Build & lint

```bash
npm run lint
npm run build
```

### Debug deployed builds

- Build info JSON: `/api/build`
- On-screen badge: add `?debug=1` to the URL

## Repo layout (high level)

- `src/app`: Next.js app router (layout/page, API routes)
- `src/components/ascii`: ASCII sword components
- `src/components/ui`: UI controls (audio, buttons, overlays)
- `src/store`: Zustand stores (audio reaction + power-ups)
- `src/lib/audio`: audio analyzer
