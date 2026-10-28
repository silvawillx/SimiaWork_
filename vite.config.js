import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['simiawork-icon.svg', 'simiawork-192.png', 'simiawork-512.png'],
      manifest: {
        name: 'SimiaWork Pro',
        short_name: 'SimiaWork',
        description: 'Gestão de tarefas, ideias e financeiro',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'simiawork-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'simiawork-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})