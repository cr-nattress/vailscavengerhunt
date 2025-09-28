/**
 * ProgressService - Handles server-side storage of hunt progress
 * Replaces localStorage with API calls for team-shared progress
 */
import { ProgressDataSchema, StopProgressSchema, validateSchema, type ProgressData, type StopProgress } from '../types/schemas'
import { photoFlowLogger } from '../utils/photoFlowLogger'

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
      console.log(`[PHOTO-FLOW] Step 9.1: Inside ProgressService.saveProgress()`)

      // Validate payload before sending
      validateSchema(ProgressDataSchema, progress, 'progress payload')

      // Log the progress data being sent (with photo URLs)
      const progressWithPhotos = Object.entries(progress).filter(([_, data]) => (data as any).photo)
      console.log(`[PHOTO-FLOW] Step 9.2: Validating progress data...`)
      console.log(`[ProgressService] Sending progress with ${progressWithPhotos.length} photo URLs:`,
        progressWithPhotos.map(([stopId, data]) => ({
          stopId,
          photo: (data as any).photo?.substring(0, 50) + '...',
          done: (data as any).done,
          completedAt: (data as any).completedAt
        })))

      const requestBody = {
        progress,
        sessionId, // For audit trail only
        timestamp: new Date().toISOString()
      }

      console.log(`[PHOTO-FLOW] Step 9.3: Preparing POST request to: ${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}`)
      console.log(`[PHOTO-FLOW] Step 9.4: Request body contains ${Object.keys(progress).length} stops, ${progressWithPhotos.length} with photos`)

      photoFlowLogger.info('ProgressService', 'save_progress_request', {
        url: `${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}`,
        method: 'POST',
        stopsWithPhotos: progressWithPhotos.length,
        totalStops: Object.keys(progress).length,
        requestBody: {
          ...requestBody,
          progress: Object.entries(progress).reduce((acc, [stopId, data]: [string, any]) => {
            acc[stopId] = {
              done: data.done,
              hasPhoto: !!data.photo,
              photo: data.photo?.substring(0, 100) + '...' || null,
              completedAt: data.completedAt
            }
            return acc
          }, {} as any)
        }
      })

      console.log(`[PHOTO-FLOW] Step 9.5: Sending POST request to backend...`)
      const response = await fetch(
        `${this.baseUrl}/progress/${orgId}/${teamId}/${huntId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[PHOTO-FLOW] Step 9.6: ERROR - Failed to save to Supabase:`, {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        photoFlowLogger.error('ProgressService', 'save_progress_response_error', {
          status: response.status,
          statusText: response.statusText,
          errorText
        }, `${response.status}: ${response.statusText}`)
        throw new Error(`Failed to save progress: ${response.statusText}`)
      }

      console.log(`[PHOTO-FLOW] Step 9.6: Backend responded with status ${response.status}`)
      const responseData = await response.json()
      console.log(`[PHOTO-FLOW] Step 9.7: Backend response data:`, responseData)

      photoFlowLogger.info('ProgressService', 'save_progress_response_success', {
        status: response.status,
        responseData
      })

      console.log(`[PHOTO-FLOW] Step 9.8: Progress saved to Supabase successfully!`)
      console.log('[ProgressService] Progress saved successfully')
      return true
    } catch (error: any) {
      console.error('[ProgressService] Failed to save progress:', error)
      photoFlowLogger.error('ProgressService', 'save_progress_error', {
        error: error.message
      }, error.message)
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
        const errorText = await response.text().catch(() => '')
        console.error('[ProgressService] PATCH failed', {
          status: response.status,
          statusText: response.statusText,
          body: errorText?.substring(0, 500)
        })
        throw new Error(`Failed to update stop progress: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
      }

      console.log(`[ProgressService] Stop ${stopId} updated successfully`)
      return true
    } catch (error: any) {
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