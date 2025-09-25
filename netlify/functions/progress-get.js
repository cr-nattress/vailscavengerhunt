import { SupabaseTeamStorage } from './_lib/supabaseTeamStorage.js'

export default async (req, context) => {
  // Extract orgId, teamId, huntId from URL
  const url = new URL(req.url)

  // Get the path after /.netlify/functions/progress-get/
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/progress-get/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/progress-get/')[1]
  } else if (pathToProcess.includes('/api/progress/')) {
    pathToProcess = pathToProcess.split('/api/progress/')[1]
  }

  const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []

  if (pathParts.length < 3) {
    console.error('Missing parameters. Path parts:', pathParts, 'URL:', url.pathname)
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/progress`
  console.log('Fetching progress with key:', key)

  try {
    // Validate team exists in Supabase
    const teamExists = await SupabaseTeamStorage.validateTeamExists(orgId, teamId, huntId)

    if (!teamExists) {
      console.error(`[progress-get] Team not found in Supabase: ${orgId}/${teamId}/${huntId}`)
      return new Response(JSON.stringify({}), {
        status: 200, // Return empty progress instead of error for missing team
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Get progress from Supabase
    const progress = await SupabaseTeamStorage.getTeamProgress(teamId) || {}

    // Return progress data
    return new Response(JSON.stringify(progress), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch progress' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}