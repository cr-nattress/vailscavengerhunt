/**
 * Team error handling utilities
 * Provides standardized error responses for team operations
 */
const TeamLockErrorCode = {
  TEAM_CODE_INVALID: 'TEAM_CODE_INVALID',
  TEAM_LOCK_CONFLICT: 'TEAM_LOCK_CONFLICT',
  TEAM_LOCK_EXPIRED: 'TEAM_LOCK_EXPIRED',
  TEAM_MISMATCH: 'TEAM_MISMATCH',
  RATE_LIMITED: 'RATE_LIMITED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN'
}

class TeamErrorHandler {
  /**
   * Create standardized team error response
   */
  static createError(code, message, status, context) {
    return {
      error: {
        error: message,
        code,
        status,
        context
      },
      status
    }
  }

  /**
   * Handle team code validation errors
   */
  static teamCodeInvalid() {
    return this.createError(
      TeamLockErrorCode.TEAM_CODE_INVALID,
      "That code didn't work. Check with your host.",
      401
    )
  }

  /**
   * Handle team lock conflicts
   */
  static teamLockConflict(remainingTtlSeconds) {
    const hoursLeft = Math.ceil(remainingTtlSeconds / 3600)
    return this.createError(
      TeamLockErrorCode.TEAM_LOCK_CONFLICT,
      `You're already checked in with another team for the next ${hoursLeft}h.`,
      409,
      { remainingTtlSeconds }
    )
  }

  /**
   * Handle expired lock tokens
   */
  static teamLockExpired() {
    return this.createError(
      TeamLockErrorCode.TEAM_LOCK_EXPIRED,
      "Your team session has expired. Please re-enter your team code.",
      419
    )
  }

  /**
   * Handle team mismatch errors
   */
  static teamMismatch(expectedTeamId, actualTeamId) {
    return this.createError(
      TeamLockErrorCode.TEAM_MISMATCH,
      "You don't have permission to access this team's data.",
      403,
      { expectedTeamId, actualTeamId }
    )
  }

  /**
   * Handle rate limiting
   */
  static rateLimited(retryAfterSeconds = 60) {
    return this.createError(
      TeamLockErrorCode.RATE_LIMITED,
      "Too many attempts. Please try again later.",
      429,
      { retryAfterSeconds }
    )
  }

  /**
   * Handle storage errors
   */
  static storageError(details) {
    return this.createError(
      TeamLockErrorCode.STORAGE_ERROR,
      "Storage operation failed. Please try again.",
      500,
      details ? { details } : undefined
    )
  }

  /**
   * Handle invalid token errors
   */
  static invalidToken() {
    return this.createError(
      TeamLockErrorCode.INVALID_TOKEN,
      "Invalid or malformed team lock token.",
      401
    )
  }
}

module.exports = { TeamErrorHandler, TeamLockErrorCode }