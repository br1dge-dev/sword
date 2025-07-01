/**
 * Tailwind CSS Configuration
 * 
 * Configures Tailwind CSS for the SWORD project with:
 * - Custom theme settings for the terminal/ASCII aesthetic
 * - Content paths for all project files
 * - Dark mode configuration
 */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        terminal: {
          black: '#181A1B',
          green: '#00FCA6',
          darkGreen: '#008800',
          gray: '#808080',
          white: '#FFFFFF',
        },
        grifter: {
          green: '#00FCA6',
          pink: '#FF3EC8',
          blue: '#3EE6FF',
          yellow: '#F8E16C',
          dark: '#181A1B',
        },
        cyberpunk: {
          bg: {
            primary: '#181A1B',
            secondary: '#23272A',
          },
          neon: {
            green: '#00FCA6',
            pink: '#FF3EC8',
            blue: '#3EE6FF',
            yellow: '#F8E16C',
            purple: '#A259F7',
          }
        }
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 2s linear infinite',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': {
            opacity: '1',
          },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': {
            opacity: '0.4',
          },
        },
        neonPulse: {
          '0%, 100%': { filter: 'brightness(0.8)' },
          '50%': { filter: 'brightness(1.2)' },
        },
      },
      textShadow: {
        'neon-green': '0 0 5px #00ffaa, 0 0 10px #00ffaa',
        'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff',
        'neon-blue': '0 0 5px #00ffff, 0 0 10px #00ffff',
        'neon-red': '0 0 5px #ff3366, 0 0 10px #ff3366',
        'neon-purple': '0 0 5px #9900ff, 0 0 10px #9900ff',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} 