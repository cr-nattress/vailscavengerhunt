/**
 * TeamLockService - Client-side team lock management
 * Handles localStorage operations for team lock state
 */
import { TeamLock, TeamLockSchema, validateSchema } from '../types/schemas'

export class TeamLockService {
  private static readonly STORAGE_KEY = 'hunt.team.lock.v1'

  /**
   * Store team lock in localStorage
   */
  static storeLock(lock: TeamLock): void {
    try {
      // Validate before storing
      validateSchema(TeamLockSchema, lock, 'team lock')

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lock))
      console.log('[TeamLockService] Lock stored successfully')
    } catch (error) {
      console.error('[TeamLockService] Failed to store lock:', error)
      throw error
    }
  }

  /**
   * Retrieve and validate team lock from localStorage
   */
  static getLock(): TeamLock | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      const lock = validateSchema(TeamLockSchema, parsed, 'stored team lock')

      // Check if expired
      if (Date.now() >= lock.expiresAt) {
        this.clearLock()
        return null
      }

      return lock
    } catch (error) {
      console.warn('[TeamLockService] Invalid stored lock, clearing:', error)
      this.clearLock()
      return null
    }
  }

  /**
   * Clear team lock from localStorage
   */
  static clearLock(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('[TeamLockService] Lock cleared')
  }

  /**
   * Check if current lock is valid for team operations
   */
  static hasValidLock(): boolean {
    return this.getLock() !== null
  }

  /**
   * Get lock token for authenticated requests
   */
  static getLockToken(): string | null {
    const lock = this.getLock()
    return lock?.lockToken || null
  }

  /**
   * Get current team ID from lock
   */
  static getCurrentTeamId(): string | null {
    const lock = this.getLock()
    return lock?.teamId || null
  }

  /**
   * Get lock expiration timestamp
   */
  static getLockExpiration(): number | null {
    const lock = this.getLock()
    return lock?.expiresAt || null
  }

  /**
   * Check if lock expires within specified minutes
   */
  static lockExpiresWithin(minutes: number): boolean {
    const lock = this.getLock()
    if (!lock) return false

    const expiresInMs = lock.expiresAt - Date.now()
    const thresholdMs = minutes * 60 * 1000
    return expiresInMs <= thresholdMs
  }
}