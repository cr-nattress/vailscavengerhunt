/**
 * Consolidated History Endpoint
 * Returns completed progress data with location metadata for the History tab
 */

const { createClient } = require('@supabase/supabase-js')
const { getSettings } = require('./_lib/supabaseSettings')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    // Prevent caching for fresh data
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Extract orgId, teamId, huntId from URL
    const url = new URL(event.rawUrl || `https://example.com${event.path}`)
    let pathToProcess = url.pathname
    if (pathToProcess.includes('/.netlify/functions/consolidated-history/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-history/')[1]
    } else if (pathToProcess.includes('/api/consolidated/history/')) {
      pathToProcess = pathToProcess.split('/api/consolidated/history/')[1]
    }
    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    if (pathParts.length < 3) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) }
    }
    const [orgId, teamId, huntId] = pathParts

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get settings
    const settings = await getSettings(orgId, teamId, huntId)

    // Get team UUID from team_id (case-insensitive)
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .ilike('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError) {
      if (teamError.code === 'PGRST116') {
        // Team not found, return empty history
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            orgId,
            teamId,
            huntId,
            settings,
            history: [],
            config: getPublicConfig(),
            lastUpdated: new Date().toISOString()
          })
        }
      }
      throw teamError
    }

    // Get completed progress data from hunt_progress - ONLY completed stops
    const { data: progressData, error: progressError } = await supabase
      .from('hunt_progress')
      .select('location_id, done, revealed_hints, completed_at, notes, photo_url')
      .eq('team_id', teamData.id)
      .eq('done', true)  // Only return completed stops
      .order('completed_at', { ascending: false })  // Sort by completion time

    if (progressError) {
      throw progressError
    }

    // Get location details from kv_store for the hunt (individual stops)
    const { data: stopData, error: kvError } = await supabase
      .from('kv_store')
      .select('key, value')
      .like('key', `${orgId}/${huntId}/stops/%`)
      .not('key', 'like', '%/index')

    if (kvError && kvError.code !== 'PGRST116') {
      console.error('Error fetching locations from kv_store:', kvError)
    }

    // Parse locations data into a map
    let locationsMap = {}
    if (stopData && stopData.length > 0) {
      for (const item of stopData) {
        const stop = item.value
        if (stop && (stop.stop_id || stop.id)) {
          const stopId = stop.stop_id || stop.id
          locationsMap[stopId] = {
            title: stop.title || 'Untitled Location',
            description: stop.description || stop.clue || '',
            address: stop.address || '',
            position: (stop.position_lat && stop.position_lng) ? {
              lat: stop.position_lat,
              lng: stop.position_lng
            } : undefined
          }
        }
      }
    }

    console.log(`[consolidated-history] Found ${Object.keys(locationsMap).length} location definitions`)

    // Build history array with location metadata
    const history = []
    for (const record of progressData || []) {
      const locationInfo = locationsMap[record.location_id] || {}

      history.push({
        locationId: record.location_id,
        title: locationInfo.title || record.location_id,
        description: locationInfo.description || '',
        address: locationInfo.address || '',
        position: locationInfo.position || null,
        completedAt: record.completed_at,
        done: true, // Always true since we filtered
        photo: record.photo_url || null,
        notes: record.notes || null,
        revealedHints: record.revealed_hints || 0
      })
    }

    // Public config (safe)
    const config = getPublicConfig()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orgId,
        teamId,
        huntId,
        settings,
        history,
        config,
        lastUpdated: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[consolidated-history] error', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch history data',
        details: error.message
      })
    }
  }
})

// Helper function to get public config
function getPublicConfig() {
  return {
    API_URL: process.env.API_URL || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || '',
    SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '',
    SPONSOR_CARD_ENABLED: process.env.SPONSOR_CARD_ENABLED === 'true',
    MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || '10485760'),
    ALLOW_LARGE_UPLOADS: process.env.ALLOW_LARGE_UPLOADS === 'true',
    ENABLE_UNSIGNED_UPLOADS: process.env.ENABLE_UNSIGNED_UPLOADS === 'true',
    DISABLE_CLIENT_RESIZE: process.env.DISABLE_CLIENT_RESIZE === 'true',
    ENABLE_ORCHESTRATED_UPLOAD: process.env.ENABLE_ORCHESTRATED_UPLOAD === 'true'
  }
}