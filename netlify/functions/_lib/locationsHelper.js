/**
 * Helper module for fetching hunt locations from Supabase kv_store
 * NO HARDCODED DATA - ALL DATA MUST COME FROM DATABASE
 */

/**
 * Get locations for a specific organization and hunt from Supabase kv_store
 */
async function getHuntLocations(supabase, orgId, huntId) {
  try {
    console.log(`[locationsHelper] Fetching locations for ${orgId}/${huntId} from kv_store`);

    // Fetch from kv_store - this is the PRIMARY data source
    const { data: stopData, error: kvError } = await supabase
      .from('kv_store')
      .select('key, value')
      .like('key', `${orgId}/${huntId}/stops/%`)
      .not('key', 'like', '%/index');

    if (kvError) {
      console.error('[locationsHelper] Critical Error fetching from kv_store:', kvError);
      throw new Error(`Database error: Unable to fetch locations from kv_store - ${kvError.message}`);
    }

    if (!stopData || stopData.length === 0) {
      console.warn(`[locationsHelper] No stops found in kv_store for ${orgId}/${huntId}`);
      // Return empty array - no mock data!
      return {
        name: `${orgId} - ${huntId}`,
        locations: []
      };
    }

    console.log(`[locationsHelper] Found ${stopData.length} stops in kv_store`);

    // Transform kv_store data to match expected format
    const locations = stopData.map(item => {
      const stop = item.value;
      if (!stop) {
        console.error('[locationsHelper] Invalid stop data:', item);
        return null;
      }

      return {
        id: stop.stop_id || stop.id,
        title: stop.title || 'Untitled Location',
        clue: stop.clue || '',
        hints: Array.isArray(stop.hints) ? stop.hints : [],
        position: (stop.position_lat && stop.position_lng) ? {
          lat: stop.position_lat,
          lng: stop.position_lng
        } : undefined,
        description: stop.description || '',
        address: stop.address || ''
      };
    }).filter(loc => loc !== null); // Remove any invalid entries

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