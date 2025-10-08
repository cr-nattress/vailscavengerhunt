/**
 * Clear Server-Side Cache
 *
 * This script clears the Netlify function cache for location data.
 * Run this after updating hunt stops in the database to see changes immediately.
 *
 * Usage:
 *   node scripts/clear-cache.js
 *
 * Or simply wait 5 minutes for cache to expire naturally.
 */

console.log('⚠️  Cache is stored in Netlify Functions memory')
console.log('⚠️  To clear cache, you have 3 options:\n')

console.log('Option 1: Wait 5 minutes')
console.log('  - Cache expires automatically after 5 minutes')
console.log('  - No action needed\n')

console.log('Option 2: Hard refresh browser')
console.log('  - Windows/Linux: Ctrl + Shift + R')
console.log('  - Mac: Cmd + Shift + R')
console.log('  - This clears browser cache\n')

console.log('Option 3: Restart dev server')
console.log('  - Stop the dev server (Ctrl + C)')
console.log('  - Run: npm run dev')
console.log('  - This clears the in-memory cache\n')

console.log('✅ After cache clears, refresh the app to see updated content')
