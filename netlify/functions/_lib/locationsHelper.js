/**
 * Helper module for fetching hunt locations from Supabase
 */

/**
 * Get locations for a specific organization and hunt
 */
async function getHuntLocations(supabase, orgId, huntId) {
  try {
    // Try to fetch from hunt_locations table
    const { data: locations, error } = await supabase
      .from('hunt_locations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      console.warn('[locationsHelper] Error fetching locations:', error)
      // Return empty locations array instead of defaults
      return {
        name: `${orgId} - ${huntId}`,
        locations: []
      }
    }

    if (!locations || locations.length === 0) {
      console.log('[locationsHelper] No locations found in Supabase')
      // Return empty locations array instead of defaults
      return {
        name: `${orgId} - ${huntId}`,
        locations: []
      }
    }

    // Transform to match the expected format
    return {
      name: `${orgId} - ${huntId}`,
      locations: locations.map(loc => ({
        id: loc.id,
        title: loc.title || loc.name,
        clue: loc.clue || loc.description,
        hints: loc.hints ? (Array.isArray(loc.hints) ? loc.hints : [loc.hints]) : [],
        position: loc.latitude && loc.longitude ? {
          lat: loc.latitude,
          lng: loc.longitude
        } : undefined,
        description: loc.description,
        address: loc.address
      }))
    }
  } catch (error) {
    console.error('[locationsHelper] Error:', error)
    // Return empty locations array instead of defaults
    return {
      name: `${orgId} - ${huntId}`,
      locations: []
    }
  }
}

module.exports = {
  getHuntLocations
}