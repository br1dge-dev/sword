# SWORD - ASCII Blockchain Visualizer

A minimalist, ASCII-based DApp for real-time visualization of Ethereum blockchain activities. SWORD combines retro ASCII art aesthetics with cutting-edge blockchain technology.

## Features

- **Real-time Block Visualization**: See blocks finalized on the Ethereum blockchain with ASCII art animations
- **Interactive Sword Enhancement**: Sign messages to enhance your sword and unlock new visual features
- **Minimalist Design**: Clean, terminal-inspired interface with ASCII art at its core
- **Mobile-First**: Optimized for both desktop and mobile experiences

## Tech Stack

- **Frontend**: Next.js 14 with Server Components
- **Styling**: Tailwind CSS
- **State Management**: Zustand/Jotai
- **Blockchain Connection**: ethers.js with WebSockets
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask or another Ethereum wallet browser extension

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/sword.git
   cd sword
   ```

2. Install dependencies
   ```
   npm install
   # or
   yarn
   ```

3. Create a `.env.local` file with your Ethereum provider details
   ```
   NEXT_PUBLIC_ETHEREUM_WS_URL=wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY
   ```

4. Start the development server
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

The project follows a modular structure with clear separation of concerns:

- `components/ascii`: ASCII art components
- `lib/blockchain`: Ethereum connection utilities
- `hooks`: Custom React hooks for blockchain interaction

## Deployment

The project is set up for easy deployment to Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## License

MIT 