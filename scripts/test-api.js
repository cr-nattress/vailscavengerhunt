/**
 * Test API Response
 *
 * This fetches the raw API response to verify the order of stops
 *
 * Usage:
 *   node scripts/test-api.js
 */

const baseUrl = 'http://localhost:8888'
const orgId = 'mountain-adventures'
const teamId = 'summit-seekers'
const huntId = 'winter-2025'

async function testAPI() {
  console.log(`\nFetching: ${baseUrl}/api/consolidated/active/${orgId}/${teamId}/${huntId}\n`)

  try {
    const response = await fetch(`${baseUrl}/api/consolidated/active/${orgId}/${teamId}/${huntId}`)
    const data = await response.json()

    console.log('Locations from API (in order):')
    console.log('================================\n')

    data.locations.locations.forEach((loc, index) => {
      console.log(`Step ${index + 1}: ${loc.title}`)
      console.log(`  Stop ID: ${loc.id}`)
      console.log(`  Clue: ${loc.clue.substring(0, 60)}...`)
      console.log(`  Image: ${loc.pre_populated_image_url ? loc.pre_populated_image_url.split('/').pop() : 'none'}`)
      console.log('')
    })

    console.log('\nIf the order is wrong here, the cache needs to clear.')
    console.log('Restart dev server or wait 5 minutes.\n')

  } catch (error) {
    console.error('Error:', error.message)
    console.log('\nMake sure dev server is running: npm run dev\n')
  }
}

testAPI()
