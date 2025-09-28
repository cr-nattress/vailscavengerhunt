#!/usr/bin/env node
/*
 * Start-all script
 * Starts the UI and API for local development.
 * - By default: runs Vite UI + Express API concurrently (npm run start)
 * - With --netlify: runs Netlify Dev (functions + proxies + UI per netlify.toml)
 * - You can also set USE_NETLIFY_DEV=true to prefer Netlify Dev
 */

const { spawn } = require('child_process')

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options
  })
  child.on('exit', (code) => process.exit(code ?? 0))
  child.on('error', (err) => {
    console.error(`[start-all] Failed to start: ${command} ${args.join(' ')}`)
    console.error(err.message)
    process.exit(1)
  })
}

const argv = process.argv.slice(2)
const useNetlify = argv.includes('--netlify') || process.env.USE_NETLIFY_DEV === 'true' || process.env.VITE_USE_NETLIFY_API === 'true'

if (useNetlify) {
  console.log('[start-all] Using Netlify Dev (functions + UI proxy)')
  // Delegate to existing script to respect netlify.toml [dev] block
  run('npm', ['run', 'start:netlify'])
} else {
  console.log('[start-all] Using local Express API + Vite UI')
  // Delegate to existing script that runs both concurrently
  run('npm', ['run', 'start'])
}
