/**
 * Supabase Team Storage Bridge
 * Provides compatible interface for team operations using Supabase instead of blob storage
 */

const { createClient } = require('@supabase/supabase-js')
const { serverLogger } = require('./serverLogger.js')

class SupabaseTeamStorage {
  static getClient(useServiceRole = false) {
    const key = useServiceRole ? 'service' : 'anon'
    if (!this._clients) this._clients = {}

    if (!this._clients[key]) {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = useServiceRole
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
        : process.env.SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration')
      }

      this._clients[key] = createClient(supabaseUrl, supabaseKey)
    }
    return this._clients[key]
  }

  /**
   * Get team code mapping from Supabase team_codes table
   * Compatible with blob storage format
   */
  static async getTeamCodeMapping(teamCode) {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase
        .from('team_codes')
        .select(`
          code,
          team_id,
          is_active,
          teams!inner(
            team_id,
            display_name,
            organization_id,
            hunt_id
          )
        `)
        .eq('code', teamCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        console.error('[SupabaseTeamStorage] Error fetching team code:', error)
        return null
      }

      // Transform to blob storage compatible format
      return {
        rowKey: data.code,
        teamId: data.teams.team_id,
        teamName: data.teams.display_name,
        isActive: data.is_active,
        organizationId: data.teams.organization_id,
        huntId: data.teams.hunt_id
      }
    } catch (error) {
      console.error('[SupabaseTeamStorage] Failed to get team code mapping:', error)
      return null
    }
  }

  /**
   * Get team data from Supabase teams table
   * Compatible with blob storage format
   */
  static async getTeamData(teamId) {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('team_id', teamId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, etag: null }
        }
        console.error('[SupabaseTeamStorage] Error fetching team data:', error)
        return { data: null, etag: null }
      }

      // Transform to blob storage compatible format
      const teamData = {
        teamId: data.team_id,
        name: data.display_name || data.name,
        score: data.score || 0,
        organizationId: data.organization_id,
        huntId: data.hunt_id,
        updatedAt: data.updated_at
      }

      // Use updated_at as ETag
      const etag = data.updated_at || new Date().toISOString()

      return { data: teamData, etag }
    } catch (error) {
      console.error('[SupabaseTeamStorage] Failed to get team data:', error)
      return { data: null, etag: null }
    }
  }

  /**
   * Create new team in Supabase
   * Note: Teams are typically created during migration, this is for compatibility
   */
  static async createTeam(teamId, teamName, organizationId = 'bhhs', huntId = 'fall-2025') {
    try {
      const supabase = this.getClient(true) // Use service role for writes

      const { data, error } = await supabase
        .from('teams')
        .insert({
          team_id: teamId,
          name: teamId,
          display_name: teamName,
          organization_id: organizationId,
          hunt_id: huntId,
          score: 0
        })
        .select()
        .single()

      if (error) {
        console.error('[SupabaseTeamStorage] Error creating team:', error)
        return null
      }

      // Return in blob storage compatible format
      return {
        teamId: data.team_id,
        name: data.display_name,
        score: data.score,
        organizationId: data.organization_id,
        huntId: data.hunt_id,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('[SupabaseTeamStorage] Failed to create team:', error)
      return null
    }
  }

  /**
   * Update team progress in Supabase hunt_progress table
   * Bridges blob storage progress format to Supabase relational format
   */
  static async updateTeamProgress(orgId, teamId, huntId, progress) {
    console.log(`[SupabaseTeamStorage.updateTeamProgress] ENTRY: orgId=${orgId}, teamId=${teamId}, huntId=${huntId}`)
    console.log(`[SupabaseTeamStorage.updateTeamProgress] Progress keys:`, Object.keys(progress))
    console.log(`[SupabaseTeamStorage.updateTeamProgress] Progress with photos:`, Object.entries(progress).filter(([_, data]) => data?.photo).map(([k, v]) => ({ [k]: { done: v.done, hasPhoto: !!v.photo } })))

    try {
      const supabase = this.getClient(true) // Use service role for writes

      // Get team ID from team_id string (need UUID for foreign key)
      console.log(`[SupabaseTeamStorage.updateTeamProgress] Looking up team in database...`)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, organization_id, hunt_id')
        .eq('team_id', teamId)
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)
        .single()

      if (teamError || !teamData) {
        console.error('[SupabaseTeamStorage.updateTeamProgress] Team not found:', { orgId, teamId, huntId, error: teamError })
        return { success: false }
      }

      console.log(`[SupabaseTeamStorage.updateTeamProgress] Team found: ${teamData.id}, processing ${Object.keys(progress).length} stops`)

      // Convert blob progress format to hunt_progress records
      const updates = []
      for (const [stopId, stopProgress] of Object.entries(progress)) {
        const photoUrl = stopProgress.photo || null
        console.log(`[SupabaseTeamStorage.updateTeamProgress] Stop ${stopId}: done=${stopProgress.done}, photo_url=${photoUrl}`)

        const updateRecord = {
          team_id: teamData.id,
          location_id: stopId,
          done: stopProgress.done || false,
          revealed_hints: stopProgress.revealedHints || 0,
          completed_at: stopProgress.completedAt || (stopProgress.done ? new Date().toISOString() : null),
          notes: stopProgress.notes || null,
          photo_url: photoUrl // Fixed: Include photo URL
        }

        console.log(`[SupabaseTeamStorage.updateTeamProgress] Creating update record:`, updateRecord)
        updates.push(updateRecord)
      }

      // Log the data being upserted to Supabase
      const updatesWithPhotos = updates.filter(update => update.photo_url)
      console.log(`[SupabaseTeamStorage.updateTeamProgress] Upserting ${updates.length} records, ${updatesWithPhotos.length} with photo URLs`)
      console.log(`[SupabaseTeamStorage.updateTeamProgress] Records with photos:`, updatesWithPhotos)

      serverLogger.info('SupabaseTeamStorage', 'upsert_attempt', {
        teamId: teamData.id,
        totalRecords: updates.length,
        recordsWithPhotos: updatesWithPhotos.length,
        updates: updates.map(update => ({
          location_id: update.location_id,
          done: update.done,
          hasPhoto: !!update.photo_url,
          photo_url: update.photo_url?.substring(0, 100) + '...' || null
        }))
      })

      // Upsert progress records
      const { data: upsertData, error: upsertError } = await supabase
        .from('hunt_progress')
        .upsert(updates, {
          onConflict: 'team_id,location_id',
          ignoreDuplicates: false
        })
        .select('location_id, photo_url') // Return the upserted data to verify

      if (upsertError) {
        console.error('[SupabaseTeamStorage.updateTeamProgress] Error updating progress:', upsertError)
        console.error('[SupabaseTeamStorage.updateTeamProgress] Failed updates:', updates)

        serverLogger.error('SupabaseTeamStorage', 'upsert_failed', {
          teamId: teamData.id,
          error: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
          failedUpdates: updates
        }, upsertError.message)

        return { success: false }
      }

      // Log successful upserts
      const upsertedWithPhotos = upsertData?.filter(row => row.photo_url) || []
      console.log(`[SupabaseTeamStorage.updateTeamProgress] Successfully upserted ${upsertData?.length || 0} records, ${upsertedWithPhotos.length} with photo URLs:`,
        upsertedWithPhotos.map(row => ({ location_id: row.location_id, has_photo: !!row.photo_url })))
      console.log(`[SupabaseTeamStorage.updateTeamProgress] All upserted data:`, upsertData)

      serverLogger.info('SupabaseTeamStorage', 'upsert_success', {
        teamId: teamData.id,
        totalUpserted: upsertData?.length || 0,
        upsertedWithPhotos: upsertedWithPhotos.length,
        upsertedData: upsertData?.map(row => ({
          location_id: row.location_id,
          hasPhoto: !!row.photo_url,
          photo_url: row.photo_url?.substring(0, 100) + '...' || null
        })) || []
      })

      console.log(`[SupabaseTeamStorage.updateTeamProgress] Updated progress for team ${teamId}: ${updates.length} stops`)
      console.log(`[SupabaseTeamStorage.updateTeamProgress] SUCCESSFUL EXIT`)
      return {
        success: true,
        etag: new Date().toISOString()
      }
    } catch (error) {
      console.error('[SupabaseTeamStorage.updateTeamProgress] Failed to update team progress:', error)
      console.log(`[SupabaseTeamStorage.updateTeamProgress] ERROR EXIT`)
      return { success: false }
    }
  }

  /**
   * Get team progress from Supabase hunt_progress table
   * Returns in blob storage compatible format
   */
  static async getTeamProgress(teamId) {
    try {
      const supabase = this.getClient()

      // Get team UUID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('team_id', teamId)
        .single()

      if (teamError || !teamData) {
        return {}
      }

      // Get progress records
      const { data: progressData, error: progressError } = await supabase
        .from('hunt_progress')
        .select('location_id, done, revealed_hints, completed_at, notes, photo_url')
        .eq('team_id', teamData.id)

      if (progressError) {
        console.error('[SupabaseTeamStorage] Error fetching progress:', progressError)
        return {}
      }

      // Convert to blob storage format
      const progress = {}
      for (const record of progressData || []) {
        progress[record.location_id] = {
          done: record.done,
          revealedHints: record.revealed_hints,
          completedAt: record.completed_at,
          notes: record.notes,
          photo: record.photo_url // Fixed: Include photo URL in response
        }
      }

      return progress
    } catch (error) {
      console.error('[SupabaseTeamStorage] Failed to get team progress:', error)
      return {}
    }
  }

  /**
   * Validate that a team exists in the system
   */
  static async validateTeamExists(orgId, teamId, huntId) {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase
        .from('teams')
        .select('team_id')
        .eq('team_id', teamId)
        .eq('organization_id', orgId)
        .eq('hunt_id', huntId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[SupabaseTeamStorage.validateTeamExists] Error:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('[SupabaseTeamStorage.validateTeamExists] Exception:', error)
      return false
    }
  }

}

module.exports = { SupabaseTeamStorage }