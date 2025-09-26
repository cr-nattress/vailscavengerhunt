/**
 * Team storage utilities for Netlify Functions
 * Handles team data and team code mappings using Netlify Blobs
 */
// No Netlify Blobs in dev/no-blobs mode. Use in-memory stores.
const tableStore = new Map() // for team code mappings (TABLE_STORE_NAME)
const blobStore = new Map()  // for team data (BLOB_STORE_NAME)
let getSupabaseClient
try {
  getSupabaseClient = require('../_lib/supabaseClient').getSupabaseClient
} catch (_) {
  getSupabaseClient = null
}

class TeamStorage {
  static get BLOB_STORE_NAME() {
    return process.env.NETLIFY_BLOBS_STORE_NAME || 'vail-hunt-state'
  }

  static get TABLE_STORE_NAME() {
    return process.env.TEAM_TABLE_NAME || 'team-mappings'
  }

  /**
   * Get team code mapping from Table Storage (simulated with Netlify Blobs)
   */
  static async getTeamCodeMapping(teamCode) {
    try {
      // Try Supabase first
      if (getSupabaseClient) {
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('team_mappings')
            .select('team_id, team_name, is_active')
            .eq('row_key', teamCode)
            .single()
          if (error && error.code !== 'PGRST116') throw error
          if (data) {
            return {
              rowKey: teamCode,
              teamId: data.team_id,
              teamName: data.team_name,
              isActive: !!data.is_active
            }
          }
        } catch (dbErr) {
          console.warn('[TeamStorage] Supabase getTeamCodeMapping failed, falling back:', dbErr?.message)
        }
      }

      // Fallback to in-memory
      const key = `team:${teamCode}`
      const data = tableStore.get(key)
      if (!data) return null

      // Validate basic structure
      if (!data.teamId || !data.teamName || typeof data.isActive !== 'boolean') {
        console.warn('[TeamStorage] Invalid team code mapping structure')
        return null
      }

      return data
    } catch (error) {
      console.error('[TeamStorage] Failed to get team code mapping:', error)
      return null
    }
  }

  /**
   * Store team code mapping in Table Storage
   */
  static async setTeamCodeMapping(mapping) {
    try {
      // Validate required fields
      if (!mapping.rowKey || !mapping.teamId || !mapping.teamName) {
        throw new Error('Missing required mapping fields')
      }

      // Try Supabase upsert
      if (getSupabaseClient) {
        try {
          const supabase = getSupabaseClient()
          const payload = {
            row_key: mapping.rowKey,
            team_id: mapping.teamId,
            team_name: mapping.teamName,
            is_active: mapping.isActive ?? true,
            created_at: mapping.createdAt || new Date().toISOString()
          }
          const { error } = await supabase
            .from('team_mappings')
            .upsert(payload, { onConflict: 'row_key', returning: 'minimal' })
          if (error) throw error
          console.log(`[TeamStorage] Team code mapping stored (Supabase): ${mapping.rowKey}`)
          return true
        } catch (dbErr) {
          console.warn('[TeamStorage] Supabase setTeamCodeMapping failed, falling back:', dbErr?.message)
        }
      }

      // Fallback to in-memory
      const key = `team:${mapping.rowKey}`
      tableStore.set(key, mapping)
      console.log(`[TeamStorage] Team code mapping stored (memory): ${mapping.rowKey}`)
      return true
    } catch (error) {
      console.error('[TeamStorage] Failed to store team code mapping:', error)
      return false
    }
  }

  /**
   * Get team data from Blob Storage
   */
  static async getTeamData(teamId) {
    try {
      // Try Supabase first
      if (getSupabaseClient) {
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('teams')
            .select('team_id, name, score, hunt_progress, updated_at')
            .eq('team_id', teamId)
            .maybeSingle()
          if (error && error.code !== 'PGRST116') throw error
          if (data) {
            const result = {
              teamId: data.team_id,
              name: data.name,
              score: data.score || 0,
              huntProgress: data.hunt_progress || {},
              updatedAt: data.updated_at || new Date().toISOString()
            }
            const etag = result.updatedAt
            return { data: result, etag }
          }
        } catch (dbErr) {
          console.warn('[TeamStorage] Supabase getTeamData failed, falling back:', dbErr?.message)
        }
      }

      // Fallback to in-memory
      const key = `teams/team_${teamId}.json`
      const result = blobStore.get(key)
      if (!result) return { data: null, etag: null }

      // Simple ETag simulation using timestamp
      const etag = result.updatedAt || Date.now().toString()

      return { data: result, etag }
    } catch (error) {
      console.error('[TeamStorage] Failed to get team data:', error)
      return { data: null, etag: null }
    }
  }

  /**
   * Store team data in Blob Storage with ETag support
   */
  static async setTeamData(teamData, expectedEtag) {
    try {
      // Validate required fields
      if (!teamData.teamId || !teamData.name) {
        throw new Error('Missing required team data fields')
      }

      const key = `teams/team_${teamData.teamId}.json`

      // Check ETag for optimistic concurrency if provided
      if (expectedEtag) {
        const { data: currentData } = await this.getTeamData(teamData.teamId)
        if (currentData && currentData.updatedAt !== expectedEtag) {
          console.warn('[TeamStorage] ETag mismatch, concurrent modification detected')
          return { success: false }
        }
      }

      // Update timestamp
      const updatedData = {
        ...teamData,
        updatedAt: new Date().toISOString()
      }

      // Try Supabase upsert first
      if (getSupabaseClient) {
        try {
          const supabase = getSupabaseClient()
          const payload = {
            team_id: updatedData.teamId,
            name: updatedData.name,
            score: updatedData.score || 0,
            hunt_progress: updatedData.huntProgress || {},
            updated_at: updatedData.updatedAt
          }

          // Optimistic concurrency: check current updated_at
          if (expectedEtag) {
            const { data: current, error: curErr } = await supabase
              .from('teams')
              .select('updated_at')
              .eq('team_id', teamData.teamId)
              .maybeSingle()
            if (curErr && curErr.code !== 'PGRST116') throw curErr
            if (current && current.updated_at && current.updated_at !== expectedEtag) {
              console.warn('[TeamStorage] ETag mismatch (Supabase), concurrent modification detected')
              return { success: false }
            }
          }

          const { error } = await supabase
            .from('teams')
            .upsert(payload, { onConflict: 'team_id', returning: 'minimal' })
          if (error) throw error
          const newEtag = updatedData.updatedAt
          console.log(`[TeamStorage] Team data stored (Supabase): ${teamData.teamId}`)
          return { success: true, etag: newEtag }
        } catch (dbErr) {
          console.warn('[TeamStorage] Supabase setTeamData failed, falling back:', dbErr?.message)
        }
      }

      // Fallback to in-memory
      blobStore.set(key, updatedData)

      const newEtag = updatedData.updatedAt

      console.log(`[TeamStorage] Team data stored (memory): ${teamData.teamId}`)
      return { success: true, etag: newEtag }
    } catch (error) {
      console.error('[TeamStorage] Failed to store team data:', error)
      return { success: false }
    }
  }

  /**
   * Create new team with initial data
   */
  static async createTeam(teamId, teamName) {
    try {
      const teamData = {
        teamId,
        name: teamName,
        score: 0,
        huntProgress: {},
        updatedAt: new Date().toISOString()
      }

      const result = await this.setTeamData(teamData)
      return result.success ? teamData : null
    } catch (error) {
      console.error('[TeamStorage] Failed to create team:', error)
      return null
    }
  }

  /**
   * Update team progress with optimistic concurrency
   */
  static async updateTeamProgress(teamId, progress, expectedEtag) {
    try {
      const { data: currentData, etag: currentEtag } = await this.getTeamData(teamId)
      if (!currentData) {
        console.error('[TeamStorage] Team not found for progress update')
        return { success: false }
      }

      // Use provided ETag or current ETag for concurrency control
      const useEtag = expectedEtag || currentEtag

      const updatedData = {
        ...currentData,
        huntProgress: progress,
        updatedAt: new Date().toISOString()
      }

      return await this.setTeamData(updatedData, useEtag)
    } catch (error) {
      console.error('[TeamStorage] Failed to update team progress:', error)
      return { success: false }
    }
  }
}

module.exports = { TeamStorage }