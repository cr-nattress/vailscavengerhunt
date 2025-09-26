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
      return getDefaultLocations(orgId, huntId)
    }

    if (!locations || locations.length === 0) {
      console.log('[locationsHelper] No locations found, using defaults')
      return getDefaultLocations(orgId, huntId)
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
    return getDefaultLocations(orgId, huntId)
  }
}

/**
 * Get default locations as fallback
 */
function getDefaultLocations(orgId, huntId) {
  // Default BHHS locations
  if (orgId === 'bhhs' && huntId === 'fall-2025') {
    return {
      name: 'BHHS Fall 2025',
      locations: [
        {
          id: 'bhhs-main',
          title: 'Main Entrance',
          clue: 'Where students enter each day',
          hints: ['Look for the main doors', 'Check near the flag pole'],
          position: { lat: 39.6433, lng: -106.3781 },
          description: 'The main entrance of BHHS',
          address: '1 Vail Rd, Vail, CO 81657'
        },
        {
          id: 'bhhs-library',
          title: 'Library',
          clue: 'Where knowledge lives',
          hints: ['Books everywhere', 'Quiet zone'],
          position: { lat: 39.6434, lng: -106.3782 },
          description: 'School library',
          address: '1 Vail Rd, Vail, CO 81657'
        },
        {
          id: 'bhhs-gym',
          title: 'Gymnasium',
          clue: 'Where champions are made',
          hints: ['Basketball courts', 'Look for the bleachers'],
          position: { lat: 39.6435, lng: -106.3780 },
          description: 'Main gymnasium',
          address: '1 Vail Rd, Vail, CO 81657'
        },
        {
          id: 'bhhs-cafeteria',
          title: 'Cafeteria',
          clue: 'Fuel for learning',
          hints: ['Lunch time spot', 'Tables and chairs'],
          position: { lat: 39.6432, lng: -106.3783 },
          description: 'Student cafeteria',
          address: '1 Vail Rd, Vail, CO 81657'
        },
        {
          id: 'bhhs-field',
          title: 'Athletic Field',
          clue: 'Where teams compete',
          hints: ['Green grass', 'Goal posts visible'],
          position: { lat: 39.6431, lng: -106.3779 },
          description: 'Outdoor athletic field',
          address: '1 Vail Rd, Vail, CO 81657'
        }
      ]
    }
  }

  // Default Vail Valley locations
  if (orgId === 'vail-valley') {
    return {
      name: 'Vail Valley',
      locations: [
        {
          id: 'vail-village',
          title: 'Vail Village',
          clue: 'The heart of Vail',
          hints: ['Look for the clock tower', 'Near the covered bridge'],
          position: { lat: 39.6403, lng: -106.3742 },
          description: 'Vail Village center',
          address: 'Vail, CO 81657'
        },
        {
          id: 'lions-head',
          title: 'Lionshead Village',
          clue: 'Where the gondola begins',
          hints: ['Look for the Eagle Bahn Gondola', 'Near the ice rink'],
          position: { lat: 39.6433, lng: -106.3781 },
          description: 'Lionshead Village area',
          address: 'Lionshead, Vail, CO 81657'
        }
      ]
    }
  }

  // Minimal fallback
  return {
    name: `${orgId} Hunt`,
    locations: [
      {
        id: 'location-1',
        title: 'Starting Point',
        clue: 'Begin your adventure here',
        hints: ['Look around', 'Check the map'],
        description: 'Default starting location'
      }
    ]
  }
}

module.exports = {
  getHuntLocations,
  getDefaultLocations
}