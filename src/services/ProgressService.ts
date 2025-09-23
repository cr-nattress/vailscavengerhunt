/**
 * ProgressService - Handles server-side storage of hunt progress
 * Replaces localStorage with API calls for team-shared progress
 */
import { ProgressDataSchema, StopProgressSchema, validateSchema, type ProgressData, type StopProgress } from '../types/schemas'

// Types now sourced from zod schemas in ../types/schemas

class ProgressService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  /**
   * Get progress for a team's hunt
   * Progress is shared by all team members
   */
  async getProgress(orgId: string, teamId: string, huntId: string): Promise<ProgressData> {
    if (!orgId || !teamId || !huntId) {
      console.warn('[ProgressService] Missing required parameters')
      return {}
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[ProgressService] No progress found, returning empty')
          return {}
        }
        throw new Error(`Failed to fetch progress: ${response.statusText}`)
      }

      const data = await response.json()
      // Validate shape using Zod schema
      const parsed = validateSchema(ProgressDataSchema, data, 'progress response')
      console.log('[ProgressService] Progress loaded successfully (validated)')
      return parsed || {}
    } catch (error) {
      console.error('[ProgressService] Failed to load progress:', error)
      return {}
    }
  }

  /**
   * Save complete progress for a team's hunt
   * @param sessionId - Used for audit trail only
   */
  async saveProgress(
    orgId: string,
    teamId: string,
    huntId: string,
    progress: ProgressData,
    sessionId: string
  ): Promise<boolean> {
    if (!orgId || !teamId || !huntId) {
      console.error('[ProgressService] Missing required parameters')
      return false
    }

    try {
      // Validate payload before sending
      validateSchema(ProgressDataSchema, progress, 'progress payload')
      const response = await fetch(
        `${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progress,
            sessionId, // For audit trail only
            timestamp: new Date().toISOString()
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save progress: ${response.statusText}`)
      }

      console.log('[ProgressService] Progress saved successfully')
      return true
    } catch (error) {
      console.error('[ProgressService] Failed to save progress:', error)
      return false
    }
  }

  /**
   * Update progress for a specific stop
   * @param sessionId - Used for audit trail only
   */
  async updateStopProgress(
    orgId: string,
    teamId: string,
    huntId: string,
    stopId: string,
    data: Partial<StopProgress>,
    sessionId: string
  ): Promise<boolean> {
    if (!orgId || !teamId || !huntId || !stopId) {
      console.error('[ProgressService] Missing required parameters')
      return false
    }

    try {
      // Validate the partial update against StopProgress constraints where possible
      // We validate a synthetic object that merges defaults with provided fields for type safety
      const synthetic: any = { done: false, ...data }
      validateSchema(StopProgressSchema.partial(), synthetic, 'stop progress update')
      const response = await fetch(
        `${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}/stop/${stopId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            update: data,
            sessionId, // For audit trail only
            timestamp: new Date().toISOString()
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to update stop progress: ${response.statusText}`)
      }

      console.log(`[ProgressService] Stop ${stopId} updated successfully`)
      return true
    } catch (error) {
      console.error('[ProgressService] Failed to update stop:', error)
      return false
    }
  }

  /**
   * Reset all progress for a team's hunt
   * @param sessionId - Used for audit trail only
   */
  async resetProgress(
    orgId: string,
    teamId: string,
    huntId: string,
    sessionId: string
  ): Promise<boolean> {
    return this.saveProgress(orgId, teamId, huntId, {}, sessionId)
  }
}

// Export singleton instance
export const progressService = new ProgressService()
export default progressService