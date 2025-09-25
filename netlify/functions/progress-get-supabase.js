/**
 * Progress Get Function with Supabase Bridge
 * Handles getting progress data from Supabase hunt_progress table
 */

import { createClient } from '@supabase/supabase-js'

export default async (req, context) => {
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

    // Get progress data
    const { data: progressData, error: progressError } = await supabase
      .from('hunt_progress')
      .select('location_id, done, revealed_hints, completed_at, notes')
      .eq('team_id', teamData.id)

    if (progressError) {
      throw progressError
    }

    // Convert to blob storage format for compatibility
    const progress = {}
    for (const record of progressData || []) {
      progress[record.location_id] = {
        done: record.done,
        revealedHints: record.revealed_hints,
        completedAt: record.completed_at,
        notes: record.notes
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