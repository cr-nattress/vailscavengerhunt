/**
 * Supabase Device Locks Module
 * Handles device lock storage and validation in Supabase
 */
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
)

const TABLE_NAME = 'device_locks'

class SupabaseDeviceLocks {
  /**
   * Check if device has an active lock for a different team
   * @param {string} deviceFingerprint - The device fingerprint
   * @param {string} requestedTeamId - The team ID being requested
   * @returns {Promise<{teamId: string, remainingTtl: number}|null>} Lock conflict data or null
   */
  static async checkConflict(deviceFingerprint, requestedTeamId) {
    try {
      // Get the device lock
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        console.error('[SupabaseDeviceLocks] Error checking conflict:', error)
        return null // Allow on error to avoid blocking legitimate users
      }

      if (!data) return null

      const now = new Date()
      const expiresAt = new Date(data.expires_at)

      // Check if lock is expired
      if (expiresAt <= now) {
        // Delete expired lock
        await this.deleteLock(deviceFingerprint)
        return null
      }

      // Check if it's for the same team (no conflict)
      if (data.team_id === requestedTeamId) {
        return null
      }

      // Calculate remaining TTL in seconds
      const remainingTtl = Math.floor((expiresAt - now) / 1000)

      return {
        teamId: data.team_id,
        remainingTtl
      }
    } catch (error) {
      console.error('[SupabaseDeviceLocks] Failed to check device lock:', error)
      return null // Allow on error to avoid blocking legitimate users
    }
  }

  /**
   * Store a device lock
   * @param {string} deviceFingerprint - The device fingerprint
   * @param {string} teamId - The team ID
   * @param {number} expiresAtSeconds - Expiration timestamp in seconds
   * @returns {Promise<boolean>} Success status
   */
  static async storeLock(deviceFingerprint, teamId, expiresAtSeconds) {
    try {
      const expiresAt = new Date(expiresAtSeconds * 1000)
      const now = new Date()

      // Use upsert to handle existing locks
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert({
          device_fingerprint: deviceFingerprint,
          team_id: teamId,
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'device_fingerprint'
        })

      if (error) {
        console.error('[SupabaseDeviceLocks] Failed to store device lock:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SupabaseDeviceLocks] Failed to store device lock:', error)
      return false
    }
  }

  /**
   * Delete a device lock
   * @param {string} deviceFingerprint - The device fingerprint
   * @returns {Promise<boolean>} Success status
   */
  static async deleteLock(deviceFingerprint) {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('device_fingerprint', deviceFingerprint)

      if (error) {
        console.error('[SupabaseDeviceLocks] Failed to delete device lock:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SupabaseDeviceLocks] Failed to delete device lock:', error)
      return false
    }
  }

  /**
   * Clean up expired locks (optional maintenance function)
   * @returns {Promise<number>} Number of locks deleted
   */
  static async cleanupExpiredLocks() {
    try {
      const now = new Date()

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .lt('expires_at', now.toISOString())
        .select('device_fingerprint')

      if (error) {
        console.error('[SupabaseDeviceLocks] Failed to cleanup expired locks:', error)
        return 0
      }

      return data ? data.length : 0
    } catch (error) {
      console.error('[SupabaseDeviceLocks] Failed to cleanup expired locks:', error)
      return 0
    }
  }
}

module.exports = { SupabaseDeviceLocks }