const { saveSettings } = require('./_lib/supabaseSettings')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Extract orgId, teamId, huntId from URL
  const url = new URL(event.rawUrl || `https://example.com${event.path}`)

  // Get the path after the function prefix
  let pathToProcess = url.pathname

  // Remove the function prefix if present
  if (pathToProcess.includes('/.netlify/functions/settings-set/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/settings-set/')[1]
  } else if (pathToProcess.includes('/.netlify/functions/settings-set-supabase/')) {
    pathToProcess = pathToProcess.split('/.netlify/functions/settings-set-supabase/')[1]
  } else if (pathToProcess.includes('/api/settings/')) {
    pathToProcess = pathToProcess.split('/api/settings/')[1]
  }

  const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []

  if (pathParts.length < 3) {
    console.error('Missing parameters. Path parts:', pathParts, 'URL:', url.pathname)
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required parameters' })
    }
  }

  const [orgId, teamId, huntId] = pathParts

  // Parse the request body
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    }
  }

  const { settings, sessionId, timestamp } = body

  if (!settings) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Settings data required' })
    }
  }

  console.log(`[settings-set-supabase] Saving settings for ${orgId}/${teamId}/${huntId}`)

  try {
    // Save to Supabase using dedicated hunt_settings table
    const success = await saveSettings(
      orgId,
      teamId,
      huntId,
      settings,
      sessionId || 'unknown',
      timestamp || new Date().toISOString()
    )

    if (!success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save settings' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }
  } catch (error) {
    console.error('Error saving settings to Supabase:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save settings' })
    }
  }
})