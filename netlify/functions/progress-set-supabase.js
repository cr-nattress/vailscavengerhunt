/**
 * Progress Set Function with Supabase Bridge
 * Handles updating progress data in Supabase hunt_progress table
 */

const { getSupabaseClient } = require('./_lib/supabaseClient')

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const body = JSON.parse(event.body || '{}')
    const { orgId, teamId, huntId, progress, sessionId, timestamp } = body

    if (!orgId || !teamId || !huntId || !progress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['orgId', 'teamId', 'huntId', 'progress']
        })
      }
    }

    console.log('Updating Supabase progress for:', { orgId, teamId, huntId, stopCount: Object.keys(progress).length })

    // Initialize Supabase client
    const supabase = getSupabaseClient()

    // Get team UUID from team_id
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('team_id', teamId)
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

    console.log(`✅ Updated progress for team ${teamId}: ${updates.length} stops`)

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
}