import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // ADD 'SC-LOGO-RBG.png' HERE SO IT CACHES OFFLINE
      includeAssets: ['SC-LOGO-RBG.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Salpointe Catholic Prayers',
        short_name: 'SC Prayers',
        description: 'Daily prayer companion for Salpointe classrooms',
        theme_color: '#97233F',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})