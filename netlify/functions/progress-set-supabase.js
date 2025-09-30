/**
 * Progress Set Function with Supabase Bridge
 * Handles updating progress data in Supabase hunt_progress table
 */

const { getSupabaseClient } = require('./_lib/supabaseClient')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  // Handle CORS and prevent caching for fresh data
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // STORY-023: Add no-store headers to prevent stale progress data
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Extract orgId, teamId, huntId from URL path
    console.log('[progress-set] Raw path:', event.path)

    let pathToProcess = event.path || ''

    // Remove function prefix to get parameters
    if (pathToProcess.includes('/.netlify/functions/progress-set-supabase/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/progress-set-supabase/')[1]
    } else if (pathToProcess.includes('/progress-set-supabase/')) {
      pathToProcess = pathToProcess.split('/progress-set-supabase/')[1]
    } else if (pathToProcess.includes('/api/progress/')) {
      pathToProcess = pathToProcess.split('/api/progress/')[1]
    }

    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    console.log('[progress-set] Parsed path parts:', pathParts)

    if (pathParts.length < 3) {
      console.error('[progress-set] Missing path parameters. Path:', event.path, 'Parts:', pathParts)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required path parameters: orgId, teamId, huntId',
          path: event.path
        })
      }
    }

    const [orgId, teamId, huntId] = pathParts

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { progress, sessionId, timestamp } = body

    if (!progress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required body parameter: progress',
          received: Object.keys(body)
        })
      }
    }

    console.log('[progress-set] Updating Supabase progress for:', { orgId, teamId, huntId, stopCount: Object.keys(progress).length })

    // Initialize Supabase client
    const supabase = getSupabaseClient()

    // Get team UUID from team_id (case-insensitive)
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .ilike('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError) {
      console.error('Team lookup error:', teamError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Team not found',
          details: teamError.message
        })
      }
    }

    // Convert progress data to hunt_progress records
    const updates = []
    for (const [stopId, stopProgress] of Object.entries(progress)) {
      updates.push({
        team_id: teamData.id,
        location_id: stopId,
        done: stopProgress.done || false,
        revealed_hints: stopProgress.revealedHints || 0,
        completed_at: stopProgress.completedAt || (stopProgress.done ? new Date().toISOString() : null),
        notes: stopProgress.notes || null,
        photo_url: stopProgress.photo || null // Fixed: Include photo URL
      })
    }

    // Upsert progress records
    const { error: upsertError } = await supabase
      .from('hunt_progress')
      .upsert(updates, {
        onConflict: 'team_id,location_id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Progress update error:', upsertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to update progress',
          details: upsertError.message
        })
      }
    }

    console.log('[progress-set] Updated progress for team:', teamId, 'stops:', updates.length)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        updatedStops: updates.length,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error updating Supabase progress:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update progress',
        details: error.message
      })
    }
  }
})