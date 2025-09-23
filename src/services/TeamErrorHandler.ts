/**
 * Client-side team error handler
 * Handles team lock errors with user-friendly messages
 */
import { TeamLockErrorCode, TeamErrorResponse } from '../types/schemas'
import { TeamLockService } from './TeamLockService'

export class ClientTeamErrorHandler {
  /**
   * Handle team verification errors with user-friendly messages
   */
  static handleVerificationError(error: TeamErrorResponse): {
    message: string
    action: 'retry' | 'wait' | 'contact_host'
    canRetry: boolean
  } {
    switch (error.code) {
      case TeamLockErrorCode.TEAM_CODE_INVALID:
        return {
          message: "That code didn't work. Check with your host.",
          action: 'contact_host',
          canRetry: true
        }

      case TeamLockErrorCode.TEAM_LOCK_CONFLICT:
        const hours = error.context?.remainingTtlSeconds
          ? Math.ceil(error.context.remainingTtlSeconds / 3600)
          : 24
        return {
          message: `You're already checked in with another team for the next ${hours}h.`,
          action: 'wait',
          canRetry: false
        }

      case TeamLockErrorCode.RATE_LIMITED:
        const retryMinutes = error.context?.retryAfterSeconds
          ? Math.ceil(error.context.retryAfterSeconds / 60)
          : 1
        return {
          message: `Too many attempts. Please wait ${retryMinutes} minute(s) and try again.`,
          action: 'wait',
          canRetry: false
        }

      default:
        return {
          message: "Something went wrong. Please try again or contact your host.",
          action: 'retry',
          canRetry: true
        }
    }
  }

  /**
   * Handle write operation errors
   */
  static handleWriteError(error: TeamErrorResponse): {
    message: string
    shouldRedirectToSplash: boolean
  } {
    switch (error.code) {
      case TeamLockErrorCode.TEAM_LOCK_EXPIRED:
        return {
          message: "Your team session has expired. Please re-enter your team code.",
          shouldRedirectToSplash: true
        }

      case TeamLockErrorCode.TEAM_MISMATCH:
        return {
          message: "You don't have permission to access this team's data.",
          shouldRedirectToSplash: true
        }

      case TeamLockErrorCode.INVALID_TOKEN:
        return {
          message: "Your session is invalid. Please re-enter your team code.",
          shouldRedirectToSplash: true
        }

      default:
        return {
          message: "Failed to save changes. Please try again.",
          shouldRedirectToSplash: false
        }
    }
  }

  /**
   * Handle API response errors that might contain team lock issues
   */
  static async handleApiResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const error = await response.json()

      // Check for team lock related errors that require redirect
      if (error.code && ['TEAM_LOCK_EXPIRED', 'TEAM_MISMATCH', 'INVALID_TOKEN'].includes(error.code)) {
        // Clear invalid lock
        TeamLockService.clearLock()

        // Dispatch custom event for app to handle
        window.dispatchEvent(new CustomEvent('team-lock-invalid', {
          detail: { error, shouldRedirectToSplash: true }
        }))
      }

      throw error
    }

    return response.json()
  }

  /**
   * Wrap fetch calls with team lock error handling
   */
  static async safeFetch(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(url, options)
    return this.handleApiResponse(response)
  }
}