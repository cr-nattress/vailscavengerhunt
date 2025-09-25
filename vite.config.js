import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      '@sentry/node',
      '@opentelemetry/instrumentation-http',
      '@opentelemetry/instrumentation-fs',
      '@opentelemetry/auto-instrumentations-node',
      '@opentelemetry/sdk-node',
      'util',
      'events',
      'node:events',
      'http',
      'https',
      'fs',
      'path',
      'stream',
      'buffer',
      'crypto',
      'os',
      'url',
      'querystring',
      'zlib',
      'net',
      'tls',
      'child_process'
    ]
  },
  build: {
    rollupOptions: {
      external: [
        '@sentry/node',
        '@opentelemetry/instrumentation-http',
        '@opentelemetry/instrumentation-fs',
        '@opentelemetry/auto-instrumentations-node',
        '@opentelemetry/sdk-node',
        'util',
        'fs',
        'path',
        'stream',
        'buffer',
        'events',
        'node:events',
        'http',
        'https',
        'crypto',
        'os',
        'url',
        'querystring',
        'zlib',
        'net',
        'tls',
        'child_process'
      ]
    }
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Prevent Node.js modules from being imported in browser
      'events': false,
      'util': false,
      'fs': false,
      'path': false,
      'http': false,
      'https': false,
      'crypto': false,
      'os': false,
      'buffer': false,
      'stream': false,
      'url': false,
      'querystring': false,
      'zlib': false,
      'net': false,
      'tls': false,
      'child_process': false,
      'node:events': false,
      'node:util': false,
      'node:fs': false,
      'node:path': false,
      'node:http': false,
      'node:https': false,
      'node:crypto': false,
      'node:os': false,
      'node:buffer': false,
      'node:stream': false,
      'node:url': false,
      'node:querystring': false,
      'node:zlib': false,
      'node:net': false,
      'node:tls': false,
      'node:child_process': false,
      // Prevent Sentry Node modules from being imported in browser
      '@sentry/node': false,
      '@sentry/node-core': false,
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/settings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/progress': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
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