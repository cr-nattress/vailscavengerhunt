const { getSupabaseClient } = require('./_lib/supabaseClient')

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
    const params = event.queryStringParameters || {}
    const orgId = params.orgId || 'bhhs'
    const huntId = params.huntId || 'fall-2025'

    const supabase = getSupabaseClient()
    let records = []

    try {
      let query = supabase
        .from('teams')
        .select('team_id, name, display_name, score, hunt_progress, updated_at, org_id, hunt_id, organization_id')
      if (orgId) query = query.eq('organization_id', orgId)
      if (huntId) query = query.eq('hunt_id', huntId)
      const { data, error } = await query
      if (error) throw error
      records = data || []
    } catch (err) {
      console.warn('[consolidated-rankings] Filtered query failed, falling back to unfiltered fetch:', err?.message)
      const { data, error } = await supabase
        .from('teams')
        .select('team_id, name, display_name, score, hunt_progress, updated_at')
      if (error) throw error
      records = data || []
    }

    const teams = records.map(rec => {
      const progress = rec.hunt_progress || {}
      const values = Object.values(progress)
      const completedStops = values.filter(p => p && typeof p === 'object' && p.done === true).length
      const totalStops = Object.keys(progress).length
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
        name: rec.display_name || rec.name || rec.team_id,
        score: rec.score || 0,
        completedStops,
        totalStops,
        percentComplete: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
        latestActivity: latestCompletionTime || rec.updated_at || null
      }
    })

    teams.sort((a, b) => {
      if (b.percentComplete !== a.percentComplete) return b.percentComplete - a.percentComplete
      if (b.completedStops !== a.completedStops) return b.completedStops - a.completedStops
      if (a.latestActivity && b.latestActivity) return a.latestActivity.localeCompare(b.latestActivity)
      return 0
    })

    teams.forEach((team, index) => { team.rank = index + 1 })

    const config = {
      API_URL: process.env.API_URL || '',
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || ''
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orgId, huntId, teams, config, lastUpdated: new Date().toISOString() })
    }
  } catch (error) {
    console.error('[consolidated-rankings] error', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch rankings' })
    }
  }
}
