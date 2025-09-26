const { getSupabaseClient } = require('./_lib/supabaseClient')

exports.handler = async (event, context) => {
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

  try {
    const body = JSON.parse(event.body || '{}')
    const { settings, sessionId, timestamp } = body

    if (!settings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Settings data required' })
      }
    }

    // Prepare settings payload (shared by all team members)
    const settingsToSave = {
      ...settings,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    const supabase = getSupabaseClient()

    // Fetch existing metadata to increment counters
    const { data: existing, error: fetchErr } = await supabase
      .from('hunt_settings')
      .select('id, total_updates, metadata')
      .eq('org_id', orgId)
      .eq('team_id', teamId)
      .eq('hunt_id', huntId)
      .maybeSingle()

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      throw fetchErr
    }

    // Update contributor tracking in metadata
    const metadata = existing?.metadata || { contributors: [] }
    const contributors = Array.isArray(metadata.contributors) ? [...metadata.contributors] : []
    const idx = contributors.findIndex(c => c.sessionId === sessionId)
    const nowIso = new Date().toISOString()
    if (idx >= 0) {
      contributors[idx].lastActive = nowIso
    } else {
      contributors.push({ sessionId, firstActive: nowIso, lastActive: nowIso })
    }
    metadata.contributors = contributors

    const totalUpdates = (existing?.total_updates || 0) + 1

    // Upsert settings row
    const upsertPayload = {
      org_id: orgId,
      team_id: teamId,
      hunt_id: huntId,
      settings: settingsToSave,
      metadata,
      last_modified_by: sessionId || null,
      total_updates: totalUpdates,
      updated_at: nowIso
    }

    const { error: upsertErr } = await supabase
      .from('hunt_settings')
      .upsert(upsertPayload, { onConflict: 'org_id,team_id,hunt_id', returning: 'minimal' })

    if (upsertErr) {
      throw upsertErr
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }
  } catch (error) {
    console.error('Error saving settings:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save settings' })
    }
  }
}

