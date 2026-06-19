import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use repo name as base for GitHub Pages, empty string for local dev
const isGhPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGhPages ? '/File-Sharing-System-Secure-Share-/' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    }
  }
})
