const { getSupabaseClient } = require('./_lib/supabaseClient')
const { getSettings, initializeSettings } = require('./_lib/supabaseSettings')
const { SupabaseTeamStorage } = require('./_lib/supabaseTeamStorage')
const { verifyTeamCode, validateTeamLock, createTeamLock } = require('./_lib/teamVerification')
const { withSentry } = require('./_lib/sentry')

/**
 * Consolidated login/initialization endpoint
 * Handles complete initialization flow in a single request
 */
exports.handler = withSentry(async (event, ) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Team-Lock',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      orgId,
      huntId,
      teamCode,
      lockToken,
      sessionId,
      deviceFingerprint
    } = body

    // Validate required fields
    if (!orgId || !huntId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: orgId, huntId' })
      }
    }

    const supabase = getSupabaseClient()
    const response = {
      config: getPublicConfig(),
      organization: await getOrganizationInfo(supabase, orgId),
      hunt: await getHuntInfo(supabase, orgId, huntId),
      features: getFeatures()
    }

    // Handle existing lock token
    let currentTeam = null
    if (lockToken && !teamCode) {
      currentTeam = await validateTeamLock(supabase, lockToken)
      if (currentTeam) {
        response.currentTeam = {
          teamId: currentTeam.teamId,
          teamName: currentTeam.teamName,
          lockValid: true
        }
      }
    }

    // Handle team code verification
    let verifiedTeam = null
    if (teamCode) {
      const verification = await verifyTeamCode(supabase, orgId, huntId, teamCode)
      if (verification.success) {
        // Create new lock
        const newLockToken = await createTeamLock(
          supabase,
          verification.teamId,
          sessionId,
          deviceFingerprint
        )

        response.teamVerification = {
          success: true,
          teamId: verification.teamId,
          teamName: verification.teamName,
          lockToken: newLockToken
        }

        verifiedTeam = verification
      } else {
        response.teamVerification = {
          success: false,
          error: verification.error || 'Invalid team code'
        }
      }
    }

    // Get active data if we have a verified team
    const activeTeam = verifiedTeam || currentTeam
    if (activeTeam) {
      // Get or initialize settings
      let settings = await getSettings(orgId, activeTeam.teamId, huntId)
      if (!settings) {
        settings = {
          locationName: 'BHHS',
          teamName: activeTeam.teamName,
          teamId: activeTeam.teamId,
          sessionId: sessionId || 'system',
          eventName: '',
          organizationId: orgId,
          huntId
        }
        await initializeSettings(orgId, activeTeam.teamId, huntId, settings)
      }

      // Get progress data
      const progress = await SupabaseTeamStorage.getTeamProgress(activeTeam.teamId)

      // Get sponsors
      const sponsors = await getSponsors(supabase, orgId, huntId)

      response.activeData = {
        settings,
        progress: progress || {},
        sponsors
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('[login-initialize] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

// Helper functions

function getPublicConfig() {
  return {
    API_URL: process.env.API_URL || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || '',
    SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    SPONSOR_CARD_ENABLED: process.env.ENABLE_SPONSOR_CARD === 'true',
    MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || '10485760'),
    ALLOW_LARGE_UPLOADS: process.env.ALLOW_LARGE_UPLOADS === 'true',
    ENABLE_UNSIGNED_UPLOADS: process.env.ENABLE_UNSIGNED_UPLOADS === 'true',
    DISABLE_CLIENT_RESIZE: process.env.DISABLE_CLIENT_RESIZE === 'true',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_UNSIGNED_PRESET: process.env.CLOUDINARY_UNSIGNED_PRESET || '',
    CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || 'scavenger/entries'
  }
}

async function getOrganizationInfo(supabase, orgId) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('id', orgId)
      .single()

    if (error || !data) {
      // Return default if not found
      return {
        id: orgId,
        name: orgId.toUpperCase(),
        logoUrl: null
      }
    }

    return {
      id: data.id,
      name: data.name,
      logoUrl: data.logo_url
    }
  } catch (error) {
    console.warn('[login-initialize] Failed to get org info:', error)
    return {
      id: orgId,
      name: orgId.toUpperCase(),
      logoUrl: null
    }
  }
}

async function getHuntInfo(supabase, orgId, huntId) {
  try {
    const { data, error } = await supabase
      .from('hunts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', huntId)
      .single()

    if (error || !data) {
      // Return default if not found
      return {
        id: huntId,
        name: huntId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: null,
        startDate: null,
        endDate: null,
        isActive: true
      }
    }

    const now = new Date()
    const startDate = data.start_date ? new Date(data.start_date) : null
    const endDate = data.end_date ? new Date(data.end_date) : null

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: (!startDate || now >= startDate) && (!endDate || now <= endDate)
    }
  } catch (error) {
    console.warn('[login-initialize] Failed to get hunt info:', error)
    return {
      id: huntId,
      name: huntId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: null,
      startDate: null,
      endDate: null,
      isActive: true
    }
  }
}

async function getSponsors(supabase, orgId, huntId) {
  try {
    const featureEnabled = process.env.ENABLE_SPONSOR_CARD === 'true'
    if (!featureEnabled) {
      return { layout: '1x2', items: [] }
    }

    const { data: sponsors, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error || !sponsors || sponsors.length === 0) {
      return { layout: '1x2', items: [] }
    }

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
        } catch (e) {
          console.warn('[login-initialize] Failed to get sponsor URL:', e)
        }
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

    return { layout: '1x2', items }
  } catch (error) {
    console.warn('[login-initialize] Failed to get sponsors:', error)
    return { layout: '1x2', items: [] }
  }
}

function getFeatures() {
  return {
    sponsorCardEnabled: process.env.ENABLE_SPONSOR_CARD === 'true',
    photoUploadsEnabled: true,
    leaderboardEnabled: true,
    tipsEnabled: true
  }
})