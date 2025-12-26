import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Salpointe Prayers',
        short_name: 'Prayers',
        description: 'Daily prayer companion for Salpointe classrooms',
        theme_color: '#1e293b',
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
  // --- THIS IS THE FIX ---
  build: {
    chunkSizeWarningLimit: 1600, // Increases limit to 1.6MB to silence the warning
    rollupOptions: {
      output: {
        manualChunks(id) {
          // This separates the huge Firebase code from your app code
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})