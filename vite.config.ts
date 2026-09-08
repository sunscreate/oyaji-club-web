import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages (project pages) では base をリポジトリ名にする必要がある。
// Actions のビルド時に VITE_BASE を渡す。ローカルや独自ドメインでは '/' を使う。
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/oyaji-club-web/',
})
