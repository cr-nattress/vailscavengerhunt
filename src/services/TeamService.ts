/**
 * TeamService - Client-side team operations
 * Handles team verification and team context retrieval
 */
import { TeamVerifyRequest, TeamVerifyResponse, validateSchema, TeamVerifyRequestSchema, TeamVerifyResponseSchema } from '../types/schemas'
import { TeamLockService } from './TeamLockService'

export class TeamService {
  private static readonly BASE_URL = 'http://localhost:3001/api'

  /**
   * Verify team code and get lock token
   */
  static async verifyTeamCode(request: TeamVerifyRequest): Promise<TeamVerifyResponse | null> {
    try {
      // Validate request
      validateSchema(TeamVerifyRequestSchema, request, 'team verify request')

      const response = await fetch(`${this.BASE_URL}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          // Client error - extract error details
          const errorData = await response.json()
          throw errorData
        }
        throw new Error(`Team verification failed: ${response.statusText}`)
      }

      const data = await response.json()
      return validateSchema(TeamVerifyResponseSchema, data, 'team verify response')
    } catch (error) {
      console.error('[TeamService] Team verification failed:', error)
      throw error
    }
  }

  /**
   * Get current team context from lock token
   */
  static async getCurrentTeam(): Promise<{ teamId: string, teamName: string } | null> {
    const lockToken = TeamLockService.getLockToken()
    if (!lockToken) return null

    try {
      const response = await fetch(`${this.BASE_URL}/team-current`, {
        headers: {
          'X-Team-Lock': lockToken
        }
      })

      if (!response.ok) {
        console.warn('[TeamService] Failed to get current team:', response.statusText)
        return null
      }

      const data = await response.json()
      return {
        teamId: data.teamId,
        teamName: data.teamName
      }
    } catch (error) {
      console.error('[TeamService] Failed to get current team:', error)
      return null
    }
  }

  /**
   * Check if team verification endpoints are available
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/team-verify`, {
        method: 'OPTIONS'
      })
      return response.ok || response.status === 405 // 405 means endpoint exists but OPTIONS not allowed
    } catch (error) {
      console.warn('[TeamService] Team verification not available:', error)
      return false
    }
  }

  /**
   * Clear current team session
   */
  static logout(): void {
    TeamLockService.clearLock()

    // Dispatch event for app to handle
    window.dispatchEvent(new CustomEvent('team-logout', {
      detail: { reason: 'user_logout' }
    }))
  }
}