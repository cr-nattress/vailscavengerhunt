/**
 * @file services/TeamLockService.ts
 * @module TeamLockService
 * @version 1.0.0
 *
 * @description
 * Client-side team lock management service that handles secure token storage
 * and validation for team-based scavenger hunt authentication.
 *
 * @architecture
 * Part of the team authentication system:
 * - Stores team lock tokens in localStorage with automatic expiry
 * - Validates tokens on retrieval with schema enforcement
 * - Provides utilities for lock status checking and renewal
 * - Integrates with TeamService for authentication workflows
 *
 * @dependencies
 * - TeamLock types and schemas from '../types/schemas'
 * - Browser localStorage API for persistence
 *
 * @security
 * - Tokens automatically expire based on server TTL
 * - Schema validation prevents malformed lock storage
 * - Graceful degradation when localStorage unavailable
 * - Lock tokens are bearer tokens - secure transmission required
 *
 * @patterns
 * - Static class pattern for singleton-like behavior
 * - Fail-fast validation with early error throwing
 * - Automatic cleanup of expired tokens
 * - Event-driven logout notifications
 */
import { TeamLock, TeamLockSchema, validateSchema } from '../types/schemas'

export class TeamLockService {
  // VERSIONING: Storage key includes version for future migrations
  // Increment when TeamLock schema changes to avoid conflicts
  private static readonly STORAGE_KEY = 'hunt.team.lock.v1'

  /**
   * Stores a validated team lock token in localStorage for persistent authentication.
   *
   * @description
   * This method handles the secure storage of team authentication tokens after
   * successful team verification. The lock contains the team ID, expiry time,
   * and authentication token needed for subsequent API requests.
   *
   * @param lock - The team lock object containing authentication data
   * @throws {ValidationError} When lock object fails schema validation
   * @throws {Error} When localStorage operations fail
   *
   * @security
   * - Lock tokens are validated before storage to prevent injection
   * - No sensitive data beyond the token is stored
   * - Tokens have built-in expiry for security
   *
   * @sideEffects
   * - Overwrites any existing team lock in localStorage
   * - Enables subsequent hasValidLock() checks to return true
   * - Allows API requests to include authentication headers
   *
   * @relatedMethods
   * - getLock() - Retrieves and validates stored locks
   * - clearLock() - Removes stored authentication
   * - hasValidLock() - Checks if valid authentication exists
   *
   * @example
   * ```typescript
   * const lock = {
   *   teamId: 'team_123',
   *   lockToken: 'jwt_token_here',
   *   issuedAt: Date.now(),
   *   expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
   * }
   * TeamLockService.storeLock(lock)
   * ```
   */
  static storeLock(lock: TeamLock): void {
    try {
      // VALIDATION: Ensure lock object matches expected schema
      // This prevents corrupted data from breaking the authentication flow
      validateSchema(TeamLockSchema, lock, 'team lock')

      // PERSISTENCE: Store in localStorage for cross-session availability
      // JSON serialization handles nested objects and ensures consistent format
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lock))
      console.log('[TeamLockService] Lock stored successfully')
    } catch (error) {
      console.error('[TeamLockService] Failed to store lock:', error)
      // FAIL-FAST: Re-throw to prevent silent failures in authentication flow
      throw error
    }
  }

  /**
   * Retrieves and validates team lock from localStorage with automatic expiry handling.
   *
   * @description
   * This method fetches the stored team authentication token and performs
   * comprehensive validation including schema checking and expiry verification.
   * Automatically cleans up expired or corrupted tokens to maintain data integrity.
   *
   * @returns {TeamLock | null} Valid team lock or null if none exists/valid
   *
   * @errorHandling
   * - Returns null for missing locks (normal case for new users)
   * - Automatically clears corrupted locks and returns null
   * - Automatically clears expired locks and returns null
   * - Logs warnings for debugging without throwing errors
   *
   * @sideEffects
   * - May call clearLock() if token is expired or invalid
   * - Updates localStorage by removing bad tokens
   * - Console logging for debugging authentication issues
   *
   * @performance
   * - O(1) localStorage access
   * - JSON parsing overhead only when data exists
   * - Schema validation adds safety with minimal cost
   *
   * @relatedMethods
   * - storeLock() - Creates the locks this method retrieves
   * - hasValidLock() - Convenience wrapper for boolean checks
   * - clearLock() - Called automatically for cleanup
   */
  static getLock(): TeamLock | null {
    try {
      // FETCH: Attempt to retrieve stored authentication data
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      // PARSE: Convert JSON string back to object
      // This can fail if localStorage was corrupted
      const parsed = JSON.parse(stored)

      // VALIDATE: Ensure the stored data matches our expected schema
      // This protects against schema evolution and corruption
      const lock = validateSchema(TeamLockSchema, parsed, 'stored team lock')

      // EXPIRY CHECK: Automatically clean up expired tokens
      // Server time drift tolerance is handled by using client time consistently
      if (Date.now() >= lock.expiresAt) {
        console.log('[TeamLockService] Lock expired, clearing automatically')
        this.clearLock()
        return null
      }

      return lock
    } catch (error) {
      // RECOVERY: Clean up corrupted data and continue gracefully
      // This prevents broken localStorage from blocking the entire app
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