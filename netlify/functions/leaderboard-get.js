const { getStore } = require('@netlify/blobs')

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

    // Get the store
    const store = getStore({ name: 'vail-hunt-state' })

    // List all keys with the organization prefix
    const { blobs } = await store.list({ prefix: `${orgId}/` })

    const teams = []

    // Process each team's progress
    for (const blob of blobs) {
      const { key } = blob

      // Check if this is a progress key for the specified hunt
      if (key.includes(`/${huntId}/progress`)) {
        // Extract team ID from the key pattern: orgId/teamId/huntId/progress
        const parts = key.split('/')
        if (parts.length >= 4) {
          const teamId = parts[1]

          try {
            // Get the progress data
            const progressData = await store.get(key, { type: 'json' })

            if (progressData) {
              // Count completed stops
              const completedStops = Object.values(progressData).filter(p => p && p.done).length
              const totalStops = Object.keys(progressData).length

              // Get the latest completion timestamp
              let latestCompletionTime = null
              Object.values(progressData).forEach(p => {
                if (p && p.done && p.timestamp) {
                  if (!latestCompletionTime || p.timestamp > latestCompletionTime) {
                    latestCompletionTime = p.timestamp
                  }
                }
              })

              teams.push({
                teamId,
                completedStops,
                totalStops,
                percentComplete: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
                latestActivity: latestCompletionTime
              })
            }
          } catch (err) {
            console.error(`Failed to get progress for team ${teamId}:`, err)
          }
        }
      }
    }

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