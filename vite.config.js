import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add Sentry plugin for source maps and release tracking
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.VITE_SENTRY_RELEASE
      },
      sourcemaps: {
        include: './dist',
        ignore: ['node_modules']
      }
    })
  ].filter(Boolean),
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
      // NOTE: Using Netlify Functions for settings in development.
      // The Express proxy is disabled to avoid 500s when API server isn't running.
      // '/api/settings': {
      //   target: 'http://localhost:3001',
      //   changeOrigin: true,
      //   secure: false
      // },
      '/api/progress': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      },
      '/api/leaderboard': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          // Support both /api/leaderboard and /api/leaderboard/:orgId/:huntId
          const m = path.match(/^\/api\/leaderboard\/([^\/]+)\/([^\/]+)/)
          if (m) {
            const orgId = encodeURIComponent(m[1])
            const huntId = encodeURIComponent(m[2])
            return `/.netlify/functions/leaderboard-get-supabase?orgId=${orgId}&huntId=${huntId}`
          }
          return '/.netlify/functions/leaderboard-get-supabase'
        }
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
      '/api/sponsors': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/write-log': {
        target: 'http://localhost:3001/.netlify/functions/write-log',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => ''
      },
      '/api/team-verify': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/team-current': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/team-setup': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/consolidated': {
        target: 'http://localhost:8888',
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
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})