/**
 * Next.js Configuration
 * 
 * This file configures the Next.js application with custom settings.
 * - reactStrictMode: Enables React's Strict Mode for development
 * - swcMinify: Uses SWC for minification instead of Terser for better performance
 * - experimental: Performance optimizations
 */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons', 'framer-motion'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
} 