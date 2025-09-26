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
    if (pathToProcess.includes('/.netlify/functions/consolidated-history/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-history/')[1]
    } else if (pathToProcess.includes('/api/consolidated/history/')) {
      pathToProcess = pathToProcess.split('/api/consolidated/history/')[1]
    }
    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    if (pathParts.length < 3) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) }
    }
    const [orgId, teamId, huntId] = pathParts

    // Settings
    const settings = await getSettings(orgId, teamId, huntId)

    // Progress -> History
    const progress = await SupabaseTeamStorage.getTeamProgress(teamId)
    const history = Object.entries(progress)
      .filter(([_, p]) => p && (p.completedAt || p.done))
      .map(([locationId, p]) => ({
        locationId,
        completedAt: p.completedAt || null,
        done: !!p.done,
        photo: p.photo || null,
        notes: p.notes || null,
        revealedHints: typeof p.revealedHints === 'number' ? p.revealedHints : 0
      }))
      .sort((a, b) => {
        const at = a.completedAt || ''
        const bt = b.completedAt || ''
        return bt.localeCompare(at)
      })

    // Public config (safe)
    const config = {
      API_URL: process.env.API_URL || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      SENTRY_DSN: process.env.SENTRY_DSN || '',
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || '',
      SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',
      SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || ''
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orgId, teamId, huntId, settings, history, config, lastUpdated: new Date().toISOString() })
    }
  } catch (error) {
    console.error('[consolidated-history] error', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch history data' }) }
  }
}
