const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { getSettings } = require('./_lib/supabaseSettings')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
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
    if (pathToProcess.includes('/.netlify/functions/consolidated-updates/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-updates/')[1]
    } else if (pathToProcess.includes('/api/consolidated/updates/')) {
      pathToProcess = pathToProcess.split('/api/consolidated/updates/')[1]
    }
    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    if (pathParts.length < 3) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) }
    }
    const [orgId, teamId, huntId] = pathParts

    // Settings
    const settings = await getSettings(orgId, teamId, huntId)

    // Progress -> Updates feed (recent activity)
    const progress = await SupabaseTeamStorage.getTeamProgress(teamId)
    const updates = Object.entries(progress)
      .filter(([_, p]) => p && (p.completedAt || p.done || p.photo))
      .map(([locationId, p]) => ({
        type: 'progress',
        locationId,
        completedAt: p.completedAt || null,
        done: !!p.done,
        photo: p.photo || null,
        notes: p.notes || null
      }))
      .sort((a, b) => {
        const at = a.completedAt || ''
        const bt = b.completedAt || ''
        return bt.localeCompare(at)
      })
      .slice(0, 100)

    const config = {
      API_URL: process.env.API_URL || '',
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || ''
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orgId, teamId, huntId, settings, updates, config, lastUpdated: new Date().toISOString() })
    }
  } catch (error) {
    console.error('[consolidated-updates] error', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch updates' }) }
  }
}
