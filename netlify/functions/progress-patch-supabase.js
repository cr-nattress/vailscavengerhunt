/**
 * Progress Patch Function with Supabase Bridge
 * Handles updating a single stop's progress in Supabase hunt_progress table
 */

const { getSupabaseClient } = require('./_lib/supabaseClient')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    // Prevent stale data
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Parse body safely
  let payload = {}
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (_) {
    // ignore, handled below
  }

  const { update, sessionId, timestamp } = payload || {}

  try {
    // Extract orgId, teamId, huntId, stopId from path
    const rawPath = event.path || ''
    let pathToProcess = rawPath

    if (pathToProcess.includes('/.netlify/functions/progress-patch-supabase/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/progress-patch-supabase/')[1]
    } else if (pathToProcess.includes('/api/progress/')) {
      // Fallback if invoked through an alternate route
      pathToProcess = pathToProcess.split('/api/progress/')[1]
    }

    const parts = (pathToProcess || '').split('/').filter(Boolean)
    // Expected: orgId/teamId/huntId/stop/{stopId}
    if (parts.length < 5 || parts[3] !== 'stop') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid path. Expected /{orgId}/{teamId}/{huntId}/stop/{stopId}' })
      }
    }

    const orgId = decodeURIComponent(parts[0])
    const teamId = decodeURIComponent(parts[1])
    const huntId = decodeURIComponent(parts[2])
    const stopId = decodeURIComponent(parts[4])

    if (!update || typeof update !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Update data required' })
      }
    }

    console.log('[progress-patch] Upserting single stop:', { orgId, teamId, huntId, stopId, updateKeys: Object.keys(update || {}) })

    // Initialize Supabase client
    const supabase = getSupabaseClient()

    // Get team UUID
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .ilike('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError) {
      console.error('[progress-patch] Team lookup error:', teamError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Team not found', details: teamError.message })
      }
    }

    const record = {
      team_id: teamData.id,
      location_id: stopId,
      done: !!update.done,
      revealed_hints: update.revealedHints ?? 0,
      completed_at: update.completedAt || (update.done ? new Date().toISOString() : null),
      notes: update.notes || null,
      photo_url: update.photo || null,
    }

    const { error: upsertError } = await supabase
      .from('hunt_progress')
      .upsert([record], {
        onConflict: 'team_id,location_id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('[progress-patch] Upsert error:', upsertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update stop progress', details: upsertError.message })
      }
    }

    console.log(`[progress-patch] ✅ Updated ${teamId}/${stopId}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, stopId, timestamp: new Date().toISOString() })
    }
  } catch (error) {
    console.error('[progress-patch] Unexpected error:', error && error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error && error.message })
    }
  }
})
