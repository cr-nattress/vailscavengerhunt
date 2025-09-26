const { getSupabaseClient } = require('./_lib/supabaseClient')

exports.handler = async (event, context) => {
  // Extract orgId, teamId, huntId from URL
  const url = new URL(event.rawUrl || `https://example.com${event.path}`)

  // Get the path after the function prefix
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/settings-get/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/settings-get/')[1]
  } else if (pathToProcess.includes('/api/settings/')) {
    pathToProcess = pathToProcess.split('/api/settings/')[1]
  }

  const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []

  if (pathParts.length < 3) {
    console.error('Missing parameters. Path parts:', pathParts, 'URL:', url.pathname)
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Missing required parameters' })
    }
  }
  const [orgId, teamId, huntId] = pathParts
  const key = `${orgId}/${teamId}/${huntId}/settings`
  console.log('Fetching settings with key:', key)

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('hunt_settings')
      .select('settings')
      .eq('org_id', orgId)
      .eq('team_id', teamId)
      .eq('hunt_id', huntId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error
    }

    if (!data || !data.settings) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Settings not found' })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data.settings)
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch settings' })
    }
  }
}