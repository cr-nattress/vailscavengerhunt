// Blobs disabled in dev/no-blobs mode

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { orgId = 'bhhs', huntId = 'fall-2025' } = event.queryStringParameters || {}
    // No blob backend available; return empty teams list
    const teams = []

    // Sort teams by completion percentage, then by latest activity
    teams.sort((a, b) => {
      // First sort by percentage complete
      if (b.percentComplete !== a.percentComplete) {
        return b.percentComplete - a.percentComplete
      }
      // Then by number of completed stops
      if (b.completedStops !== a.completedStops) {
        return b.completedStops - a.completedStops
      }
      // Finally by latest activity (earlier is better for same completion)
      if (a.latestActivity && b.latestActivity) {
        return a.latestActivity.localeCompare(b.latestActivity)
      }
      return 0
    })

    // Add ranking
    teams.forEach((team, index) => {
      team.rank = index + 1
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        huntId,
        orgId,
        teams,
        lastUpdated: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Leaderboard error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch leaderboard' })
    }
  }
}