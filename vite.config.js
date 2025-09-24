import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/settings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/progress': {
        target: 'http://localhost:8890/.netlify/functions',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.method === 'GET') {
              proxyReq.path = proxyReq.path.replace('/api/progress', '/progress-get')
            } else if (req.method === 'POST') {
              proxyReq.path = proxyReq.path.replace('/api/progress', '/progress-set')
            }
          })
        }
      },
      '/api/leaderboard': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/export': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/contributors': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://localhost:8889/.netlify/functions',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace('/api', '')
      },
      '/.netlify/functions': {
        target: 'http://localhost:8889',
        changeOrigin: true,
        secure: false
      }
    }
  }
})