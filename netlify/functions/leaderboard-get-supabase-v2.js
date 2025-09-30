const { createClient } = require('@supabase/supabase-js')
const { withSentry } = require('./_lib/sentry')
const { rankTeams, enrichTeamWithTimeData } = require('./_lib/rankingService')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
)

exports.handler = withSentry(async (event) => {
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

    console.log(`[leaderboard-v2] Fetching leaderboard for org: ${orgId}, hunt: ${huntId}`)

    // Get all teams for this org/hunt
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_id')
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)

    if (teamsError) {
      console.error('[leaderboard-v2] Error fetching teams:', teamsError)
      throw teamsError
    }

    if (!teamsData || teamsData.length === 0) {
      console.log('[leaderboard-v2] No teams found')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          huntId,
          orgId,
          teams: [],
          lastUpdated: new Date().toISOString()
        })
      }
    }

    console.log(`[leaderboard-v2] Found ${teamsData.length} teams`)

    // Get total number of stops for this hunt from kv_store
    const { data: stopsData } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', `${orgId}/${huntId}/stops/index`)
      .single()

    const totalStops = stopsData?.value?.locations?.length || 0
    console.log(`[leaderboard-v2] Total stops in hunt: ${totalStops}`)

    // Build leaderboard for each team
    const teams = []

    for (const teamData of teamsData) {
      // Get progress for this team from hunt_progress table
      const { data: progressRecords, error: progressError } = await supabase
        .from('hunt_progress')
        .select('location_id, done, completed_at, revealed_hints, notes')
        .eq('team_id', teamData.id)

      if (progressError) {
        console.error(`[leaderboard-v2] Error fetching progress for team ${teamData.team_id}:`, progressError)
        continue
      }

      // Count completed stops
      const completedStops = progressRecords?.filter(p => p.done).length || 0
      const percentComplete = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

      // Build base team object
      const team = {
        teamId: teamData.team_id,
        completedStops,
        totalStops,
        percentComplete
      }

      // Enrich with time data using ranking service
      const enrichedTeam = enrichTeamWithTimeData(team, progressRecords || [])
      teams.push(enrichedTeam)
    }

    console.log(`[leaderboard-v2] Built leaderboard for ${teams.length} teams`)

    // Rank teams using ranking service
    const rankedTeams = rankTeams(teams)

    console.log(`[leaderboard-v2] Ranked ${rankedTeams.length} teams`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        huntId,
        orgId,
        teams: rankedTeams,
        lastUpdated: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[leaderboard-v2] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch leaderboard',
        details: error.message 
      })
    }
  }
})
