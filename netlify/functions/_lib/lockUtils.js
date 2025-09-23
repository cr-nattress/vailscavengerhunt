/**
 * Lock token utilities for team authentication
 * Provides JWT-based lock token generation and validation
 */
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

class LockUtils {
  static get JWT_SECRET() {
    return process.env.TEAM_LOCK_JWT_SECRET || 'default-dev-secret'
  }

  static get TTL_SECONDS() {
    return parseInt(process.env.TEAM_LOCK_TTL_SECONDS || '86400') // 24h
  }

  /**
   * Generate a secure lock token for a team
   */
  static generateLockToken(teamId) {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + this.TTL_SECONDS

    const payload = {
      teamId,
      exp: expiresAt,
      iat: now,
      sub: 'team-lock'
    }

    const token = jwt.sign(payload, this.JWT_SECRET, { algorithm: 'HS256' })

    return { token, expiresAt }
  }

  /**
   * Verify and decode a lock token
   */
  static verifyLockToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, { algorithms: ['HS256'] })

      // Validate structure
      if (!decoded.teamId || !decoded.exp || decoded.sub !== 'team-lock') {
        return null
      }

      return {
        teamId: decoded.teamId,
        exp: decoded.exp
      }
    } catch (error) {
      console.warn('[LockUtils] Token verification failed:', error.message)
      return null
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(exp) {
    const now = Math.floor(Date.now() / 1000)
    return exp <= now
  }

  /**
   * Generate device fingerprint for conflict detection
   */
  static generateDeviceHint(userAgent, ip) {
    const seed = process.env.DEVICE_HINT_SEED || 'default-seed'
    const combined = `${userAgent}:${ip}:${seed}`
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16)
  }

  /**
   * Hash team code for secure logging
   */
  static hashTeamCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 12)
  }
}

module.exports = { LockUtils }