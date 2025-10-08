/**
 * Helper module for fetching hunt locations from Supabase hunt_stops table
 * Uses the get_hunt_stops() database function for proper multi-org support
 * NO HARDCODED DATA - ALL DATA MUST COME FROM DATABASE
 */

/**
 * Get locations for a specific organization and hunt from hunt_stops table
 * Uses the get_hunt_stops() function which handles ordering strategies
 */
async function getHuntLocations(supabase, orgId, huntId, teamId = null) {
  try {
    console.log(`[locationsHelper] Fetching locations for ${orgId}/${huntId} using hunt_stops table`);

    // Try using the get_hunt_stops() function first (new hunt system)
    const { data: stopData, error: rpcError } = await supabase
      .rpc('get_hunt_stops', {
        p_organization_id: orgId,
        p_hunt_id: huntId,
        p_team_id: teamId
      });

    if (rpcError) {
      console.warn('[locationsHelper] RPC get_hunt_stops failed, trying direct query:', rpcError.message);

      // Fallback: Direct query to hunt_configurations + hunt_stops
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('hunt_configurations')
        .select(`
          stop_id,
          default_order,
          hunt_stops (
            stop_id,
            title,
            description,
            clue,
            hints,
            position_lat,
            position_lng,
            pre_populated_image_url
          )
        `)
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)
        .eq('is_active', true)
        .order('default_order', { ascending: true });

      if (fallbackError) {
        console.error('[locationsHelper] Fallback query also failed:', fallbackError);
        throw new Error(`Unable to fetch locations: ${fallbackError.message}`);
      }

      if (!fallbackData || fallbackData.length === 0) {
        console.warn(`[locationsHelper] No stops found for ${orgId}/${huntId}`);
        return {
          name: `${orgId} - ${huntId}`,
          locations: []
        };
      }

      console.log(`[locationsHelper] Found ${fallbackData.length} stops via fallback query`);

      // Transform fallback data
      const locations = fallbackData
        .map((config, index) => {
          const stop = config.hunt_stops;
          if (!stop) {
            console.error('[locationsHelper] Missing hunt_stops data for config:', config);
            return null;
          }

          return {
            id: stop.stop_id,
            title: stop.title || 'Untitled Location',
            clue: stop.clue || '',
            hints: Array.isArray(stop.hints) ? stop.hints : [],
            position: (stop.position_lat && stop.position_lng) ? {
              lat: parseFloat(stop.position_lat),
              lng: parseFloat(stop.position_lng)
            } : undefined,
            description: stop.description || '',
            address: stop.address || '',
            originalNumber: config.default_order || (index + 1),
            pre_populated_image_url: stop.pre_populated_image_url || null
          };
        })
        .filter(loc => loc !== null);

      return {
        name: `${orgId} - ${huntId}`,
        locations: locations
      };
    }

    if (!stopData || stopData.length === 0) {
      console.warn(`[locationsHelper] No stops found for ${orgId}/${huntId}`);
      return {
        name: `${orgId} - ${huntId}`,
        locations: []
      };
    }

    console.log(`[locationsHelper] Found ${stopData.length} stops via get_hunt_stops RPC`);

    // Transform RPC function data to match expected format
    const locations = stopData.map((stop, index) => {
      if (!stop) {
        console.error('[locationsHelper] Invalid stop data:', stop);
        return null;
      }

      return {
        id: stop.stop_id,
        title: stop.title || 'Untitled Location',
        clue: stop.clue || '',
        hints: Array.isArray(stop.hints) ? stop.hints : [],
        position: (stop.position_lat && stop.position_lng) ? {
          lat: parseFloat(stop.position_lat),
          lng: parseFloat(stop.position_lng)
        } : undefined,
        description: stop.description || '',
        address: stop.address || '',
        originalNumber: stop.step_order || (index + 1),
        isCompleted: stop.is_completed || false,
        pre_populated_image_url: stop.pre_populated_image_url || null
      };
    }).filter(loc => loc !== null);

    return {
      name: `${orgId} - ${huntId}`,
      locations: locations
    };

  } catch (error) {
    console.error('[locationsHelper] CRITICAL ERROR:', error);
    console.error('[locationsHelper] Stack trace:', error.stack);

    // Re-throw the error so it can be handled by the calling function
    throw error;
  }
}

module.exports = {
  getHuntLocations
}