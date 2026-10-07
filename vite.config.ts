import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Punto Plus · Tus favoritos te dan más',
        short_name: 'Punto Plus',
        description: 'Tus tarjetas de fidelidad, siempre contigo.',
        theme_color: '#022f53',
        background_color: '#fbfbfa',
        display: 'standalone',
        lang: 'es-MX',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('html5-qrcode')) return 'qr-scanner';
          if (/framer-motion|motion-dom|motion-utils/.test(id)) return 'motion';
          if (/react-hook-form|hookform|zod/.test(id)) return 'forms';
          if (/react-dom|react-router|scheduler/.test(id)) return 'react-vendor';
          if (/tanstack|axios/.test(id)) return 'data';
        },
      },
    },
  },
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
