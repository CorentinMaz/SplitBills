/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { qrcode } from 'vite-plugin-qrcode'

// `npm run demo`: swap Firebase-backed modules for the in-memory ones in src/demo.
const DEMO_SWAPS: Record<string, string> = {
  'src/auth.tsx': 'src/demo/auth.tsx',
  'src/firebase.ts': 'src/demo/firebase.ts',
  'src/data/groups.ts': 'src/demo/groups.ts',
  'src/data/entries.ts': 'src/demo/entries.ts',
}

function demoMode(): Plugin {
  const swaps = Object.fromEntries(
    Object.entries(DEMO_SWAPS).map(([from, to]) => [path.resolve(__dirname, from), path.resolve(__dirname, to)]),
  )
  return {
    name: 'splitbills-demo',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      const swap = resolved && swaps[resolved.id]
      // Demo modules import each other through the same paths; don't redirect those.
      if (swap && !importer?.includes('/src/demo/')) return swap
      return resolved
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    mode === 'demo' && demoMode(),
    react(),
    tailwindcss(),
    // Prints a QR code of the network URL with `--host`, to open the app on a phone.
    qrcode(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SplitBills',
        short_name: 'SplitBills',
        description: 'Partager les dépenses au prorata des revenus',
        lang: 'fr-CA',
        theme_color: '#0f766e',
        background_color: '#f7f9fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tesseract data and Google Fonts load at runtime; cache them for offline use.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
            handler: 'CacheFirst',
            options: { cacheName: 'cdn-assets', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
  },
}))
