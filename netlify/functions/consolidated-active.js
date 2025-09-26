const { getSupabaseClient } = require('./_lib/supabaseClient')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { getSettings } = require('./_lib/supabaseSettings')
const { getHuntLocations } = require('./_lib/locationsHelper')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event) => {
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
    // Extract orgId, teamId, huntId from URL path
    // In production, event.path is the most reliable way to get the path
    console.log('[consolidated-active] Raw path:', event.path)

    let pathToProcess = event.path || ''

    // Remove the function prefix to get just the parameters
    if (pathToProcess.includes('/.netlify/functions/consolidated-active/')) {
      pathToProcess = pathToProcess.split('/.netlify/functions/consolidated-active/')[1]
    } else if (pathToProcess.includes('/consolidated-active/')) {
      // Sometimes the path might be shortened
      pathToProcess = pathToProcess.split('/consolidated-active/')[1]
    } else if (pathToProcess.includes('/api/consolidated/active/')) {
      // Handle the redirected path
      pathToProcess = pathToProcess.split('/api/consolidated/active/')[1]
    }

    const pathParts = pathToProcess ? pathToProcess.split('/').filter(Boolean) : []
    console.log('[consolidated-active] Parsed path parts:', pathParts)

    if (pathParts.length < 3) {
      console.error('[consolidated-active] Missing parameters. Path:', event.path, 'Parts:', pathParts)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters: orgId, teamId, huntId' }) }
    }
    const [orgId, teamId, huntId] = pathParts

    // Gather settings
    const settings = await getSettings(orgId, teamId, huntId)

    // Gather progress
    const progress = await SupabaseTeamStorage.getTeamProgress(teamId)

    // Get Supabase client first
    const supabase = getSupabaseClient()

    // Gather locations
    const locations = await getHuntLocations(supabase, orgId, huntId)

    // Gather sponsors (mirrors sponsors-get.js minimal)
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
        locations,
        lastUpdated: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[consolidated-active] error:', error)
    console.error('[consolidated-active] Stack trace:', error.stack)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch active data',
        message: error.message,
        path: event.path,
        method: event.httpMethod
      })
    }
  }
})
