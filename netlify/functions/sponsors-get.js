/**
 * Sponsors API Endpoint
 * Retrieves sponsor assets for a given organization and hunt
 * Returns sponsors with signed URLs for images and inline SVG content
 */

const { createClient } = require('@supabase/supabase-js')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Check feature flag first
    const featureEnabled = process.env.ENABLE_SPONSOR_CARD === 'true'

    if (!featureEnabled) {
      console.log('[sponsors-get] Sponsor card feature is disabled')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          layout: '1x2',
          items: []
        })
      }
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request parameters
    let organizationId, huntId, teamName

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      organizationId = body.organizationId
      huntId = body.huntId
      teamName = body.teamName
    } else if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      organizationId = params.organizationId
      huntId = params.huntId
      teamName = params.teamName
    }

    if (!organizationId || !huntId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters: organizationId, huntId'
        })
      }
    }

    console.log(`[sponsors-get] Fetching sponsors for org:${organizationId}, hunt:${huntId}`)

    // Query sponsor assets
    const { data: sponsors, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[sponsors-get] Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database query failed',
          message: error.message
        })
      }
    }

    // Handle empty results
    if (!sponsors || sponsors.length === 0) {
      console.log('[sponsors-get] No sponsors found, returning empty array')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          layout: '1x2',
          items: []
        })
      }
    }

    console.log(`[sponsors-get] Found ${sponsors.length} sponsors, processing...`)

    // Process sponsor data and generate signed URLs
    const processedSponsors = await Promise.all(
      sponsors.map(async (sponsor) => {
        let src = null
        let svg = null

        if (sponsor.image_type === 'svg' && sponsor.svg_text) {
          // Use inline SVG
          svg = sponsor.svg_text
          console.log(`[sponsors-get] Using inline SVG for ${sponsor.company_name}`)
        } else if (sponsor.storage_path) {
          // Generate signed URL for stored images
          try {
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('sponsors')
              .createSignedUrl(sponsor.storage_path, 3600) // 1 hour TTL

            if (urlError) {
              console.warn(`[sponsors-get] Failed to generate signed URL for ${sponsor.storage_path}:`, urlError.message)
              // Don't fail the entire request, just skip this sponsor's image
            } else if (signedUrl && signedUrl.signedUrl) {
              src = signedUrl.signedUrl
              console.log(`[sponsors-get] Generated signed URL for ${sponsor.company_name}`)
            }
          } catch (urlError) {
            console.warn(`[sponsors-get] Exception generating signed URL for ${sponsor.storage_path}:`, urlError.message)
          }
        }

        return {
          id: sponsor.id,
          companyId: sponsor.company_id,
          companyName: sponsor.company_name,
          alt: sponsor.image_alt,
          type: sponsor.image_type,
          src,
          svg
        }
      })
    )

    // Get layout configuration
    const layout = await getLayoutConfiguration(supabase, organizationId, huntId)

    const response = {
      layout: layout || '1x2', // Default to 1x2 if not configured
      items: processedSponsors
    }

    console.log(`[sponsors-get] Returning ${processedSponsors.length} sponsors with ${response.layout} layout`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('[sponsors-get] Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
})

/**
 * Get layout configuration from settings system
 * Falls back to default '1x2' if not found or invalid
 */
async function getLayoutConfiguration(supabase, organizationId, huntId) {
  try {
    console.log(`[sponsors-get] Fetching layout config for ${organizationId}/${huntId}`)

    // Try to get from settings table first
    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('key', 'sponsor_layout')
      .maybeSingle() // Use maybeSingle to handle no results gracefully

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is okay
      console.warn('[sponsors-get] Settings query failed:', error.message)
      return getRecommendedLayout(0) // Default fallback
    }

    if (setting && setting.value) {
      const validLayouts = ['1x1', '1x2', '1x3']
      if (validLayouts.includes(setting.value)) {
        console.log(`[sponsors-get] Using configured layout: ${setting.value}`)
        return setting.value
      } else {
        console.warn(`[sponsors-get] Invalid layout value: ${setting.value}, using recommended`)
      }
    }

    console.log('[sponsors-get] No layout configuration found, using recommended layout')
    return '1x2'

  } catch (error) {
    console.error('[sponsors-get] Error fetching layout config:', error.message)
    return '1x2' // Default fallback
  }
}

/**
 * Recommend layout based on number of active sponsors
 */
function getRecommendedLayout(sponsorCount) {
  if (sponsorCount === 1) {
    return '1x1'
  } else if (sponsorCount <= 4) {
    return '1x2'
  } else {
    return '1x3'
  }
}

/**
 * Check if organization/hunt has sponsor card feature enabled
 * (Optional per-event feature flag)
 */
async function isFeatureEnabledForEvent(supabase, organizationId, huntId) {
  try {
    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('organization_id', organizationId)
      .eq('hunt_id', huntId)
      .eq('key', 'sponsor_card_enabled')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('[sponsors-get] Event feature flag query failed:', error.message)
      return true // Default to enabled if can't check
    }

    // Default to true if no setting exists, false if explicitly set to 'false'
    return !setting || setting.value !== 'false'
  } catch (error) {
    console.warn('[sponsors-get] Error checking event feature flag:', error.message)
    return true // Default to enabled
  }
}