import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages (project pages) では base をリポジトリ名にする必要がある。
// Actions のビルド時に VITE_BASE を渡す。ローカルや独自ドメインでは '/' を使う。
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'さぎぬま幼稚園 おやじ倶楽部',
        short_name: 'おやじ倶楽部',
        description: 'イベント・写真・参加確認をまとめる会員制サイト',
        lang: 'ja',
        theme_color: '#d32f2f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/oyaji-club-web/#/guide',
        scope: '/oyaji-club-web/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: process.env.VITE_BASE ?? '/oyaji-club-web/',
})
