/**
 * Progress Get Function with Supabase Bridge
 * Handles getting progress data from Supabase hunt_progress table
 */

import { createClient } from '@supabase/supabase-js'

export default async (req, context) => {
  // Handle CORS and prevent caching for fresh data
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // STORY-023: Add no-store headers to prevent stale progress data
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    })
  }

  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)

  // Get the path after /.netlify/functions/progress-get-supabase/
  let pathToProcess = url.pathname

  if (pathToProcess.includes('/.netlify/functions/progress-get-supabase/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/progress-get-supabase/')[1]
  } else if (pathToProcess.includes('/api/progress-supabase/')) {
    pathToProcess = pathToProcess.split('/api/progress-supabase/')[1]
  }

  const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []

  if (pathParts.length < 3) {
    console.error('Missing parameters. Path parts:', pathParts, 'URL:', url.pathname)
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers
    })
  }

  const [orgId, teamId, huntId] = pathParts
  console.log('Fetching Supabase progress for:', { orgId, teamId, huntId })

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get team UUID from team_id
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError) {
      if (teamError.code === 'PGRST116') {
        // Team not found, return empty progress
        return new Response(JSON.stringify({}), {
          status: 200,
          headers
        })
      }
      throw teamError
    }

    // Get progress data including photo_url - ONLY completed stops
    const { data: progressData, error: progressError } = await supabase
      .from('hunt_progress')
      .select('location_id, done, revealed_hints, completed_at, notes, photo_url')
      .eq('team_id', teamData.id)
      .eq('done', true)  // Only return completed stops

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
            description: stop.description || stop.clue || ''
          }
        }
      }
    }

    console.log(`Found ${Object.keys(locationsMap).length} location definitions in kv_store`)

    // Build response with only completed stops, including title and description
    const progress = {}
    for (const record of progressData || []) {
      const locationId = record.location_id
      const locationInfo = locationsMap[locationId] || {}

      // Only include if done is true (redundant check since we filtered in query)
      if (record.done) {
        progress[locationId] = {
          title: locationInfo.title || locationId,
          description: locationInfo.description || '',
          done: record.done,
          completedAt: record.completed_at,
          photo: record.photo_url || null,
          revealedHints: record.revealed_hints || 0,
          notes: record.notes || null
        }

        if (record.photo_url) {
          console.log(`Photo URL for ${locationId}: ${record.photo_url}`)
        }
      }
    }

    return new Response(JSON.stringify(progress), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error fetching Supabase progress:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch progress',
      details: error.message
    }), {
      status: 500,
      headers
    })
  }
}