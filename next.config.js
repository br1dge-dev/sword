/**
 * Next.js Configuration
 * 
 * This file configures the Next.js application with custom settings.
 * - reactStrictMode: Enables React's Strict Mode for development
 * - swcMinify: Uses SWC for minification instead of Terser for better performance
 * - images: Optimizes images with WebP and AVIF formats
 * - experimental: Enables experimental features for better performance
 */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Optimiere das Laden von Modulen
    optimizePackageImports: ['react-icons', 'framer-motion'],
  },
  // Optimiere die Größe des Bundles
  webpack: (config, { dev, isServer }) => {
    // Nur für Produktionsbuilds
    if (!dev) {
      // Aktiviere Terser-Komprimierung für kleinere Bundles
      config.optimization.minimize = true;
    }
    
    return config;
  },
} 