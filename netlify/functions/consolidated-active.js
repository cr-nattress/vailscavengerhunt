/**
 * GET /api/consolidated/active/:orgId/:teamId/:huntId
 *
 * Consolidated endpoint that fetches all active hunt data in a single request.
 *
 * Request:  GET with path parameters (orgId, teamId, huntId)
 * Response: {
 *   orgId, teamId, huntId,
 *   settings: TeamSettings,
 *   progress: Record<string, ProgressItem>,
 *   sponsors: SponsorData,
 *   config: PublicConfig,
 *   locations: HuntLocations,
 *   warnings?: string[] (non-fatal errors)
 * }
 *
 * Errors:
 *   400 - Invalid path or missing parameters
 *   500 - Critical failure
 *
 * @ai-purpose: Single-request data fetch for ActiveView; reduces network overhead
 * @ai-dont: Don't cache this response; always fetch fresh data for progress accuracy
 * @ai-related-files: /src/hooks/useActiveData.ts, /src/services/ConsolidatedDataService.ts
 */

const { getSupabaseClient } = require('./_lib/supabaseClient')
const { getSettings } = require('./_lib/supabaseSettings')
const { getHuntLocations } = require('./_lib/locationsHelper')
const { getSponsors } = require('./_lib/sponsorsService')
const { getEnrichedProgress } = require('./_lib/progressService')
const { getPublicConfig } = require('./_lib/config')
const { parseConsolidatedPath } = require('./_lib/pathParser')
const { handleError, successResponse, handleCorsPreflightResponse } = require('./_lib/errorResponses')
const { withCache, CacheKeys } = require('./_lib/cache')
const { withSentry } = require('./_lib/sentry')

exports.handler = withSentry(async (event) => {
  const requestId = crypto.randomUUID().substring(0, 8)
  const startTime = Date.now()

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleCorsPreflightResponse(event)
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse path parameters using shared utility
    console.log(`[consolidated-active:${requestId}] Raw path:`, event.path)
    const { orgId, teamId, huntId } = parseConsolidatedPath(event.path)
    console.log(`[consolidated-active:${requestId}] Params:`, { orgId, teamId, huntId })

    const supabase = getSupabaseClient()
    const warnings = []

    // Fetch hunt metadata to get photo_mode (with error handling for missing column)
    let photoMode = 'upload' // Default to upload mode
    try {
      const { data: huntData, error: huntError } = await supabase
        .from('hunts')
        .select('photo_mode')
        .eq('organization_id', orgId)
        .eq('id', huntId)
        .single()

      if (!huntError && huntData) {
        photoMode = huntData.photo_mode || 'upload'
      }
    } catch (photoModeError) {
      // If photo_mode column doesn't exist yet, just use default
      console.warn(`[consolidated-active:${requestId}] Could not fetch photo_mode, using default:`, photoModeError.message)
    }

    // Fetch all data in parallel (independent requests)
    const [settings, locations, sponsors, config] = await Promise.all([
      // Settings (no cache - may change frequently)
      getSettings(orgId, teamId, huntId),

      // Locations (cache for 5 minutes - rarely change)
      withCache(CacheKeys.locations(orgId, huntId), 300, () =>
        getHuntLocations(supabase, orgId, huntId)
      ).catch(err => {
        console.error(`[consolidated-active:${requestId}] Locations fetch failed:`, err.message)
        warnings.push('Failed to fetch locations')
        return { name: `${orgId} - ${huntId}`, locations: [] }
      }),

      // Sponsors (cache for 5 minutes)
      withCache(CacheKeys.sponsors(orgId, huntId), 300, () =>
        getSponsors(supabase, orgId, huntId)
      ).catch(err => {
        console.warn(`[consolidated-active:${requestId}] Sponsors fetch failed:`, err.message)
        warnings.push('Failed to fetch sponsors')
        return { layout: '1x2', items: [] }
      }),

      // Public config (cache for 1 minute)
      withCache(CacheKeys.config(), 60, () => getPublicConfig())
    ])

    // Progress must be fetched AFTER locations (needs location metadata for enrichment)
    // Progress is NOT cached - must be fresh
    const progress = await getEnrichedProgress(
      supabase,
      teamId,
      orgId,
      huntId,
      locations?.locations || []
    ).catch(err => {
      console.warn(`[consolidated-active:${requestId}] Progress fetch failed:`, err.message)
      warnings.push('Failed to fetch progress')
      return {}
    })

    const duration = Date.now() - startTime
    console.log(`[consolidated-active:${requestId}] Request completed in ${duration}ms, warnings: ${warnings.length}`)

    // Return successful response with optional warnings
    return successResponse(
      {
        orgId,
        teamId,
        huntId,
        photoMode, // Include hunt's photo mode
        settings,
        progress,
        sponsors,
        config,
        locations,
        lastUpdated: new Date().toISOString()
      },
      warnings,
      200,
      requestId
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[consolidated-active:${requestId}] Error after ${duration}ms:`, error)
    console.error(`[consolidated-active:${requestId}] Stack:`, error.stack)

    // Use automatic error handler
    return handleError(error, requestId)
  }
})
