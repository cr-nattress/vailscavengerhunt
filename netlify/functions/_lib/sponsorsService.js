/**
 * Sponsors service layer
 * Handles fetching and transforming sponsor data
 */

/**
 * Fetch sponsors for a hunt and format response
 *
 * @param {object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @param {string} huntId - Hunt ID
 * @returns {Promise<object>} Sponsor data with layout and items
 */
async function getSponsors(supabase, orgId, huntId) {
  try {
    console.log(`[SponsorsService] Fetching sponsors for ${orgId}/${huntId}`)

    const { data: sponsors, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('org_id', orgId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[SponsorsService] Database error:', error)
      throw new Error(`Failed to fetch sponsors: ${error.message}`)
    }

    if (!sponsors || sponsors.length === 0) {
      console.log('[SponsorsService] No sponsors found, returning empty layout')
      return {
        layout: '1x2',
        items: []
      }
    }

    console.log(`[SponsorsService] Found ${sponsors.length} sponsors`)

    // Transform sponsors to expected format
    const items = sponsors.map(sponsor => ({
      id: sponsor.id,
      name: sponsor.name,
      logoUrl: sponsor.logo_url,
      websiteUrl: sponsor.website_url,
      description: sponsor.description,
      tier: sponsor.tier || 'standard',
      sortOrder: sponsor.sort_order || 0
    }))

    // Determine layout based on sponsor count
    // This could be made configurable via hunt settings
    const layout = getLayoutForSponsorCount(sponsors.length)

    return {
      layout,
      items
    }
  } catch (error) {
    console.error('[SponsorsService] Error fetching sponsors:', error)
    // Return empty sponsors rather than failing entire request
    return {
      layout: '1x2',
      items: [],
      error: error.message
    }
  }
}

/**
 * Determine optimal layout based on sponsor count
 *
 * @param {number} count - Number of sponsors
 * @returns {string} Layout string (e.g., '1x2', '2x2', '3x3')
 */
function getLayoutForSponsorCount(count) {
  if (count === 0) return '1x2'
  if (count <= 2) return '1x2'
  if (count <= 4) return '2x2'
  if (count <= 6) return '2x3'
  if (count <= 9) return '3x3'
  return '3x4' // For 10+ sponsors
}

/**
 * Get sponsor by ID
 *
 * @param {object} supabase - Supabase client
 * @param {string} sponsorId - Sponsor UUID
 * @returns {Promise<object|null>} Sponsor data or null if not found
 */
async function getSponsorById(supabase, sponsorId) {
  try {
    const { data, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('id', sponsorId)
      .single()

    if (error) {
      console.error('[SponsorsService] Error fetching sponsor:', error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      logoUrl: data.logo_url,
      websiteUrl: data.website_url,
      description: data.description,
      tier: data.tier,
      sortOrder: data.sort_order
    }
  } catch (error) {
    console.error('[SponsorsService] Error:', error)
    return null
  }
}

/**
 * Get sponsors grouped by tier
 *
 * @param {object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @param {string} huntId - Hunt ID
 * @returns {Promise<object>} Sponsors grouped by tier
 */
async function getSponsorsByTier(supabase, orgId, huntId) {
  try {
    const sponsorsData = await getSponsors(supabase, orgId, huntId)

    if (sponsorsData.error || !sponsorsData.items?.length) {
      return {
        platinum: [],
        gold: [],
        silver: [],
        bronze: [],
        standard: []
      }
    }

    const grouped = {
      platinum: [],
      gold: [],
      silver: [],
      bronze: [],
      standard: []
    }

    for (const sponsor of sponsorsData.items) {
      const tier = sponsor.tier || 'standard'
      if (grouped[tier]) {
        grouped[tier].push(sponsor)
      } else {
        grouped.standard.push(sponsor)
      }
    }

    return grouped
  } catch (error) {
    console.error('[SponsorsService] Error grouping sponsors:', error)
    return {
      platinum: [],
      gold: [],
      silver: [],
      bronze: [],
      standard: []
    }
  }
}

/**
 * Check if sponsors exist for hunt
 *
 * @param {object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @param {string} huntId - Hunt ID
 * @returns {Promise<boolean>} True if sponsors exist
 */
async function hasSponsors(supabase, orgId, huntId) {
  try {
    const { count, error } = await supabase
      .from('sponsor_assets')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)

    if (error) {
      console.error('[SponsorsService] Error checking sponsors:', error)
      return false
    }

    return count > 0
  } catch (error) {
    console.error('[SponsorsService] Error:', error)
    return false
  }
}

// CommonJS exports
module.exports = {
  getSponsors,
  getSponsorById,
  getSponsorsByTier,
  hasSponsors
}
