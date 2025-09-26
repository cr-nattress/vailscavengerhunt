const { getSupabaseClient } = require('./_lib/supabaseClient')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, ) => {
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

    const supabase = getSupabaseClient()
    let records = []

    try {
      // Attempt to filter by orgId and huntId if columns exist
      let query = supabase
        .from('teams')
        .select('team_id, name, score, hunt_progress, updated_at, org_id, hunt_id')
      if (orgId) query = query.eq('org_id', orgId)
      if (huntId) query = query.eq('hunt_id', huntId)
      const { data, error } = await query
      if (error) throw error
      records = data || []
    } catch (err) {
      // Fallback: fetch without org/hunt filters (columns may not exist yet)
      console.warn('[leaderboard-get] Filtered query failed, falling back to unfiltered fetch:', err?.message)
      const { data, error } = await supabase
        .from('teams')
        .select('team_id, name, score, hunt_progress, updated_at')
      if (error) throw error
      records = data || []
    }

    // Compute leaderboard
    const teams = records.map(rec => {
      const progress = rec.hunt_progress || {}
      const values = Object.values(progress)
      const completedStops = values.filter(p => p && typeof p === 'object' && p.done === true).length
      const totalStops = Object.keys(progress).length
      // Determine latest activity from completed entries
      let latestCompletionTime = null
      values.forEach(p => {
        if (p && typeof p === 'object' && p.done && p.completedAt) {
          if (!latestCompletionTime || p.completedAt > latestCompletionTime) {
            latestCompletionTime = p.completedAt
          }
        }
      })
      return {
        teamId: rec.team_id,
        completedStops,
        totalStops,
        percentComplete: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
        latestActivity: latestCompletionTime || rec.updated_at || null
      }
    })

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
})