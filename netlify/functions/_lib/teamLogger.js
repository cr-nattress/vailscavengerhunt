/**
 * Team logging utilities
 * Provides secure logging for team operations
 */
const { LockUtils } = require('./lockUtils')

class TeamLogger {
  /**
   * Log team verification attempts (with hashed codes)
   */
  static logVerificationAttempt(teamCode, outcome, teamId, details) {
    const hashedCode = LockUtils.hashTeamCode(teamCode)
    console.log(`[TeamVerify] ${outcome}`, {
      hashedCodePrefix: hashedCode,
      teamId: teamId || 'unknown',
      timestamp: new Date().toISOString(),
      details
    })
  }

  /**
   * Log lock token operations
   */
  static logLockOperation(operation, teamId, details) {
    console.log(`[TeamLock] ${operation}`, {
      teamId: teamId || 'unknown',
      timestamp: new Date().toISOString(),
      details
    })
  }

  /**
   * Log write rejections
   */
  static logWriteRejection(endpoint, reason, teamId) {
    console.log(`[TeamWrite] rejected`, {
      endpoint,
      reason,
      teamId: teamId || 'unknown',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log storage operations
   */
  static logStorageOperation(operation, resource, success, details) {
    console.log(`[TeamStorage] ${operation}`, {
      resource,
      success,
      timestamp: new Date().toISOString(),
      details
    })
  }

  /**
   * Log security events
   */
  static logSecurityEvent(event, details) {
    console.log(`[TeamSecurity] ${event}`, {
      timestamp: new Date().toISOString(),
      details
    })
  }
}

module.exports = { TeamLogger }