const { getSupabaseClient } = require('./_lib/supabaseClient')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { getSettings } = require('./_lib/supabaseSettings')
const { LockUtils } = require('./_lib/lockUtils')
const { TeamErrorHandler } = require('./_lib/teamErrors')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Team-Lock',
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
    if (pathToProcess.includes('/.netlify/functions/consolidated-active/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-active/')[1]
    } else if (pathToProcess.includes('/api/consolidated/active/')) {
      pathToProcess = pathToProcess.split('/api/consolidated/active/')[1]
    }
    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    if (pathParts.length < 3) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) }
    }
    const [orgId, teamId, huntId] = pathParts

    // Check for team lock token and get current team if provided
    let currentTeam = null
    const lockToken = event.headers['x-team-lock']

    if (lockToken) {
      try {
        // Verify lock token
        const tokenData = LockUtils.verifyLockToken(lockToken)

        if (tokenData && !LockUtils.isTokenExpired(tokenData.exp)) {
          // Get team data from Supabase
          const supabaseResult = await SupabaseTeamStorage.getTeamData(tokenData.teamId)

          if (supabaseResult.data) {
            currentTeam = {
              teamId: supabaseResult.data.teamId,
              teamName: supabaseResult.data.name,
              lockValid: true
            }
          }
        }
      } catch (error) {
        console.warn('[consolidated-active] team lock verification failed:', error.message)
        // Non-fatal - continue without current team info
      }
    }

    // Gather settings
    const settings = await getSettings(orgId, teamId, huntId)

    // Gather progress
    const progress = await SupabaseTeamStorage.getTeamProgress(teamId)

    // Gather sponsors (mirrors sponsors-get.js minimal)
    const supabase = getSupabaseClient()
    let sponsorsResponse = { layout: '1x2', items: [] }
    try {
      const featureEnabled = process.env.ENABLE_SPONSOR_CARD === 'true'
      if (featureEnabled) {
        const { data: sponsors, error } = await supabase
          .from('sponsor_assets')
          .select('*')
          .eq('organization_id', orgId)
          .eq('hunt_id', huntId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        if (!error && sponsors && sponsors.length > 0) {
          const items = []
          for (const sponsor of sponsors) {
            let src = null
            let svg = null
            if (sponsor.image_type === 'svg' && sponsor.svg_text) {
              svg = sponsor.svg_text
            } else if (sponsor.storage_path) {
              try {
                const { data: signedUrl } = await supabase.storage
                  .from('sponsors')
                  .createSignedUrl(sponsor.storage_path, 3600)
                if (signedUrl && signedUrl.signedUrl) {
                  src = signedUrl.signedUrl
                }
              } catch (_) {}
            }
            items.push({
              id: sponsor.id,
              companyId: sponsor.company_id,
              companyName: sponsor.company_name,
              alt: sponsor.image_alt,
              type: sponsor.image_type,
              src,
              svg
            })
          }
          sponsorsResponse = { layout: '1x2', items }
        }
      }
    } catch (e) {
      // Non-fatal
      console.warn('[consolidated-active] sponsors fetch failed', e?.message)
    }

    // Public config (safe)
    const config = {
      API_URL: process.env.API_URL || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      SENTRY_DSN: process.env.SENTRY_DSN || '',
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || '',
      SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',
      SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '',
      SPONSOR_CARD_ENABLED: process.env.SPONSOR_CARD_ENABLED === 'true',
      MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || '10485760'),
      ALLOW_LARGE_UPLOADS: process.env.ALLOW_LARGE_UPLOADS === 'true',
      ENABLE_UNSIGNED_UPLOADS: process.env.ENABLE_UNSIGNED_UPLOADS === 'true',
      DISABLE_CLIENT_RESIZE: process.env.DISABLE_CLIENT_RESIZE === 'true',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_UNSIGNED_PRESET: process.env.CLOUDINARY_UNSIGNED_PRESET || '',
      CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries'
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orgId,
        teamId,
        huntId,
        settings,
        progress,
        sponsors: sponsorsResponse,
        config,
        currentTeam,
        lastUpdated: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[consolidated-active] error', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch active data' }) }
  }
}
