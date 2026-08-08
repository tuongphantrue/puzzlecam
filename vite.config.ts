import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/puzzlecam/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['logo.svg'],

      manifest: {
        name: 'PuzzleCam',
        short_name: 'PuzzleCam',
        description: 'Camera-first puzzle solver and coach.',

        theme_color: '#0b1020',
        background_color: '#0b1020',

        display: 'standalone',

        start_url: '.',
        scope: '.',

        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
