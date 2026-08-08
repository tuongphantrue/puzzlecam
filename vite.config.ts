import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function githubPagesBase() {
  // GitHub project pages live at /<repository>/, while <user>.github.io repos live at /.
  // GITHUB_REPOSITORY is provided automatically by GitHub Actions as "owner/repository".
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]

  if (process.env.GITHUB_ACTIONS === 'true' && repository) {
    return repository.endsWith('.github.io') ? '/' : `/${repository}/`
  }

  return '/'
}

export default defineConfig({
  base: githubPagesBase(),
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
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
