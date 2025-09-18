/**
 * ServerStorageService - Server-only storage service
 * Replaces DualWriteService by removing all localStorage operations
 * All data is stored hierarchically by organization/team/hunt
 */
import { apiClient } from './apiClient'

interface StorageResult {
  success: boolean
  error?: string
}

interface SessionData {
  id: string
  location: string
  startTime: string
  userAgent: string
}

export class ServerStorageService {
  /**
   * Get org/team/hunt context from the current URL or use defaults
   */
  private static getContext(): { orgId: string; teamId: string; huntId: string } {
    const pathParts = window.location.pathname.split('/').filter(Boolean)

    // Default context
    let orgId = 'bhhs'
    let teamId = 'berrypicker'
    let huntId = 'fall-2025'

    // Extract from URL if available: /{org}/{event}/{team}
    if (pathParts.length >= 3) {
      orgId = pathParts[0]
      huntId = pathParts[1]
      teamId = pathParts[2]
    }

    return { orgId, teamId, huntId }
  }

  /**
   * Set a key-value pair on the server within the team's hunt context
   * @param key - The key to set (will be prefixed with context)
   * @param value - The value to store
   * @param sessionId - Session ID for audit trail
   * @returns Promise resolving to storage result
   */
  static async set(key: string, value: any, sessionId?: string): Promise<StorageResult> {
    try {
      const { orgId, teamId, huntId } = this.getContext()
      const contextKey = `${orgId}/${teamId}/${huntId}/${key}`

      console.log(`🌐 ServerStorage set: ${contextKey}`)

      const payload = {
        key: contextKey,
        value,
        sessionId, // For audit trail
        timestamp: new Date().toISOString()
      }

      await apiClient.post('/kv-upsert', payload)

      console.log(`✅ ServerStorage saved: ${contextKey}`)
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ ServerStorage set failed for ${key}:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get a value by key from the server within the team's hunt context
   * @param key - The key to retrieve
   * @returns Promise resolving to the stored value, or null if not found
   */
  static async get(key: string): Promise<any> {
    try {
      const { orgId, teamId, huntId } = this.getContext()
      const contextKey = `${orgId}/${teamId}/${huntId}/${key}`

      console.log(`🔍 ServerStorage get: ${contextKey}`)

      const response = await apiClient.get(`/kv-get/${encodeURIComponent(contextKey)}`)

      if (response && (response as any).exists) {
        console.log(`✅ ServerStorage found: ${contextKey}`)
        return (response as any).value
      }

      console.log(`❌ ServerStorage not found: ${contextKey}`)
      return null

    } catch (error) {
      console.error(`❌ ServerStorage get failed for ${key}:`, error)
      return null
    }
  }

  /**
   * Delete a key from the server
   * @param key - The key to delete
   * @returns Promise resolving to deletion result
   */
  static async delete(key: string): Promise<StorageResult> {
    try {
      const { orgId, teamId, huntId } = this.getContext()
      const contextKey = `${orgId}/${teamId}/${huntId}/${key}`

      console.log(`🗑️ ServerStorage delete: ${contextKey}`)

      await apiClient.delete(`/kv-delete/${encodeURIComponent(contextKey)}`)

      console.log(`✅ ServerStorage deleted: ${contextKey}`)
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ ServerStorage delete failed for ${key}:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * List all keys for the current team's hunt
   * @returns Promise resolving to array of keys
   */
  static async list(): Promise<string[]> {
    try {
      const { orgId, teamId, huntId } = this.getContext()
      const prefix = `${orgId}/${teamId}/${huntId}/`

      console.log(`📋 ServerStorage list with prefix: ${prefix}`)

      const response = await apiClient.get(`/kv-list?prefix=${encodeURIComponent(prefix)}`)

      if (response && Array.isArray((response as any).keys)) {
        // Remove the prefix from keys for cleaner display
        const keys = (response as any).keys.map((key: string) =>
          key.startsWith(prefix) ? key.slice(prefix.length) : key
        )
        console.log(`✅ ServerStorage found ${keys.length} keys`)
        return keys
      }

      return []

    } catch (error) {
      console.error('❌ ServerStorage list failed:', error)
      return []
    }
  }

  /**
   * Create a new session record (for tracking only)
   * @param sessionId - Unique session identifier
   * @param sessionData - Session data to store
   * @returns Promise resolving to storage result
   */
  static async createSession(sessionId: string, sessionData: SessionData): Promise<StorageResult> {
    // Store session data for audit/tracking purposes
    const sessionKey = `sessions/${sessionId}`
    return this.set(sessionKey, sessionData, sessionId)
  }

  /**
   * Save app settings (deprecated - use ServerSettingsService instead)
   * @param settings - Settings object to save
   * @param sessionId - Session ID for audit trail
   * @returns Promise resolving to storage result
   */
  static async saveSettings(settings: any, sessionId?: string): Promise<StorageResult> {
    console.warn('⚠️ ServerStorageService.saveSettings is deprecated. Use ServerSettingsService instead.')
    return this.set('app-settings', settings, sessionId)
  }

  /**
   * Migrate from DualWriteService calls
   * This method helps with gradual migration
   */
  static async migrateFromDualWrite(key: string, value: any): Promise<StorageResult> {
    console.log(`📦 Migrating DualWriteService call for key: ${key}`)

    // Extract sessionId if it's embedded in the data
    const sessionId = value?.sessionId || value?.lastModifiedBy

    // Handle special cases from DualWriteService
    if (key.startsWith('session:')) {
      const actualSessionId = key.replace('session:', '')
      return this.createSession(actualSessionId, value)
    }

    if (key === 'app-settings') {
      return this.saveSettings(value, sessionId)
    }

    // Default case - store with context
    return this.set(key, value, sessionId)
  }
}