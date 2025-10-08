/**
 * Progress service layer
 * Handles fetching, enriching, and updating progress data
 */

/**
 * Get enriched progress data for a team
 * Enriches progress with location metadata (title, description)
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamId - Team ID (team_id, not UUID)
 * @param {string} orgId - Organization ID
 * @param {string} huntId - Hunt ID
 * @param {Array} locations - Array of hunt locations (optional, for enrichment)
 * @returns {Promise<object>} Progress data keyed by location ID
 */
async function getEnrichedProgress(supabase, teamId, orgId, huntId, locations = null) {
  try {
    console.log(`[ProgressService] Fetching progress for team: ${teamId}`)

    // Build location metadata map for enrichment
    const locMap = {}
    if (locations && Array.isArray(locations)) {
      for (const loc of locations) {
        if (loc?.id) {
          locMap[loc.id] = {
            title: loc.title || String(loc.id),
            description: loc.description || loc.clue || ''
          }
        }
      }
    }

    // Resolve team UUID
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .ilike('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (teamError || !teamData?.id) {
      console.warn(`[ProgressService] Team not found: ${teamId}`, teamError?.message)
      return {}
    }

    // Fetch completed progress rows
    const { data: progressRows, error: progressError } = await supabase
      .from('hunt_progress')
      .select('location_id, done, revealed_hints, completed_at, notes, photo_url')
      .eq('team_id', teamData.id)
      .eq('done', true)

    if (progressError) {
      console.error('[ProgressService] Error fetching progress:', progressError)
      return {}
    }

    if (!progressRows || progressRows.length === 0) {
      console.log('[ProgressService] No completed progress found')
      return {}
    }

    // Build enriched progress object
    const detailedProgress = {}

    for (const row of progressRows) {
      const locationId = row.location_id
      const meta = locMap[locationId] || {}

      detailedProgress[locationId] = {
        title: meta.title || locationId,
        description: meta.description || '',
        done: !!row.done,
        completedAt: row.completed_at || null,
        photo: row.photo_url || null,
        revealedHints: row.revealed_hints || 0,
        notes: row.notes || null
      }
    }

    console.log(`[ProgressService] Found ${Object.keys(detailedProgress).length} completed stops`)
    return detailedProgress

  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return {}
  }
}

/**
 * Get all progress for a team (including incomplete)
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamUuid - Team UUID (not team_id)
 * @returns {Promise<Array>} Array of progress rows
 */
async function getAllProgress(supabase, teamUuid) {
  try {
    const { data, error } = await supabase
      .from('hunt_progress')
      .select('*')
      .eq('team_id', teamUuid)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('[ProgressService] Error fetching all progress:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return []
  }
}

/**
 * Set progress for a specific location
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamUuid - Team UUID
 * @param {string} locationId - Location ID
 * @param {object} progressData - Progress update data
 * @returns {Promise<object|null>} Updated progress row or null
 */
async function setProgress(supabase, teamUuid, locationId, progressData) {
  try {
    const { data, error } = await supabase
      .from('hunt_progress')
      .upsert({
        team_id: teamUuid,
        location_id: locationId,
        done: progressData.done || false,
        revealed_hints: progressData.revealedHints || 0,
        photo_url: progressData.photoUrl || null,
        notes: progressData.notes || null,
        completed_at: progressData.done ? new Date().toISOString() : null
      }, {
        onConflict: 'team_id,location_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[ProgressService] Error setting progress:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return null
  }
}

/**
 * Patch progress for a specific location (partial update)
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamUuid - Team UUID
 * @param {string} locationId - Location ID
 * @param {object} updates - Partial update data
 * @returns {Promise<object|null>} Updated progress row or null
 */
async function patchProgress(supabase, teamUuid, locationId, updates) {
  try {
    const updateData = {}

    if (updates.done !== undefined) {
      updateData.done = updates.done
      updateData.completed_at = updates.done ? new Date().toISOString() : null
    }

    if (updates.revealedHints !== undefined) {
      updateData.revealed_hints = updates.revealedHints
    }

    if (updates.photoUrl !== undefined) {
      updateData.photo_url = updates.photoUrl
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes
    }

    const { data, error } = await supabase
      .from('hunt_progress')
      .update(updateData)
      .eq('team_id', teamUuid)
      .eq('location_id', locationId)
      .select()
      .single()

    if (error) {
      console.error('[ProgressService] Error patching progress:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return null
  }
}

/**
 * Get progress count for a team
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamUuid - Team UUID
 * @returns {Promise<{total: number, completed: number}>} Progress counts
 */
async function getProgressCounts(supabase, teamUuid) {
  try {
    const { count: total, error: totalError } = await supabase
      .from('hunt_progress')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamUuid)

    const { count: completed, error: completedError } = await supabase
      .from('hunt_progress')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamUuid)
      .eq('done', true)

    if (totalError || completedError) {
      console.error('[ProgressService] Error getting counts')
      return { total: 0, completed: 0 }
    }

    return { total: total || 0, completed: completed || 0 }
  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return { total: 0, completed: 0 }
  }
}

/**
 * Resolve team UUID from team_id
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamId - Team ID (team_id, not UUID)
 * @param {string} orgId - Organization ID
 * @param {string} huntId - Hunt ID
 * @returns {Promise<string|null>} Team UUID or null if not found
 */
async function resolveTeamUuid(supabase, teamId, orgId, huntId) {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .ilike('team_id', teamId)
      .eq('organization_id', orgId)
      .eq('hunt_id', huntId)
      .single()

    if (error || !data?.id) {
      console.warn(`[ProgressService] Team not found: ${teamId}`)
      return null
    }

    return data.id
  } catch (error) {
    console.error('[ProgressService] Error resolving team:', error)
    return null
  }
}

/**
 * Update progress with photo URL
 *
 * @param {object} supabase - Supabase client
 * @param {string} teamUuid - Team UUID
 * @param {string} locationId - Location ID
 * @param {string} photoUrl - Cloudinary photo URL
 * @returns {Promise<object|null>} Updated progress row or null
 */
async function updateProgressWithPhoto(supabase, teamUuid, locationId, photoUrl) {
  try {
    const { data, error } = await supabase
      .from('hunt_progress')
      .update({
        photo_url: photoUrl,
        done: true,
        completed_at: new Date().toISOString()
      })
      .eq('team_id', teamUuid)
      .eq('location_id', locationId)
      .select()
      .single()

    if (error) {
      console.error('[ProgressService] Error updating photo:', error)
      return null
    }

    console.log(`[ProgressService] Updated progress with photo for location ${locationId}`)
    return data
  } catch (error) {
    console.error('[ProgressService] Error:', error)
    return null
  }
}

// CommonJS exports
module.exports = {
  getEnrichedProgress,
  getAllProgress,
  setProgress,
  patchProgress,
  getProgressCounts,
  resolveTeamUuid,
  updateProgressWithPhoto
}
