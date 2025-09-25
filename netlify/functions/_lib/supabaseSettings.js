const { createClient } = require('@supabase/supabase-js')

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Save settings to Supabase
 * Replaces Netlify Blob storage
 */
async function saveSettings(orgId, teamId, huntId, settings, sessionId, timestamp) {
  try {
    const settingsToSave = {
      ...settings,
      lastModifiedBy: sessionId,
      lastModifiedAt: timestamp || new Date().toISOString()
    }

    // Check if record exists
    const { data: existing, error: fetchError } = await supabase
      .from('hunt_settings')
      .select('*')
      .eq('org_id', orgId)
      .eq('team_id', teamId)
      .eq('hunt_id', huntId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[SupabaseSettings] Error checking existing:', fetchError)
      throw fetchError
    }

    let metadata = existing?.metadata || { contributors: [] }

    // Update contributor tracking
    const contributorIndex = metadata.contributors.findIndex(c => c.sessionId === sessionId)

    if (contributorIndex >= 0) {
      metadata.contributors[contributorIndex].lastActive = new Date().toISOString()
    } else {
      metadata.contributors.push({
        sessionId,
        firstActive: new Date().toISOString(),
        lastActive: new Date().toISOString()
      })
    }

    metadata.lastModifiedBy = sessionId
    metadata.lastModifiedAt = new Date().toISOString()

    const recordToSave = {
      org_id: orgId,
      team_id: teamId,
      hunt_id: huntId,
      settings: settingsToSave,
      metadata,
      last_modified_by: sessionId,
      total_updates: (existing?.total_updates || 0) + 1
    }

    // Upsert the settings
    const { error: upsertError } = await supabase
      .from('hunt_settings')
      .upsert(recordToSave, {
        onConflict: 'org_id,team_id,hunt_id'
      })

    if (upsertError) {
      console.error('[SupabaseSettings] Error saving:', upsertError)
      throw upsertError
    }

    console.log(`[SupabaseSettings] Settings saved for ${orgId}/${teamId}/${huntId}`)
    return true
  } catch (error) {
    console.error('[SupabaseSettings] Save error:', error)
    return false
  }
}

/**
 * Get settings from Supabase
 * Replaces Netlify Blob storage
 */
async function getSettings(orgId, teamId, huntId) {
  try {
    const { data, error } = await supabase
      .from('hunt_settings')
      .select('settings')
      .eq('org_id', orgId)
      .eq('team_id', teamId)
      .eq('hunt_id', huntId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        console.log(`[SupabaseSettings] Settings not found for ${orgId}/${teamId}/${huntId}`)
        return null
      }
      console.error('[SupabaseSettings] Error fetching:', error)
      throw error
    }

    console.log(`[SupabaseSettings] Settings retrieved for ${orgId}/${teamId}/${huntId}`)
    return data?.settings || null
  } catch (error) {
    console.error('[SupabaseSettings] Get error:', error)
    throw error
  }
}

/**
 * Initialize settings if they don't exist
 */
async function initializeSettings(orgId, teamId, huntId, defaultSettings = {}) {
  try {
    const existing = await getSettings(orgId, teamId, huntId)

    if (!existing) {
      const initialSettings = {
        ...defaultSettings,
        createdAt: new Date().toISOString()
      }

      await saveSettings(orgId, teamId, huntId, initialSettings, 'system', new Date().toISOString())
      return initialSettings
    }

    return existing
  } catch (error) {
    console.error('[SupabaseSettings] Initialize error:', error)
    return null
  }
}

module.exports = {
  saveSettings,
  getSettings,
  initializeSettings
}