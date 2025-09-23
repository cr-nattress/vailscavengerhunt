# Task 001.02: Create Lock Token Generation and Validation

## Problem
Need secure, server-side lock token generation and validation utilities that prevent tampering while supporting 24-hour TTL enforcement.

## Solution
Create utilities for JWT-based lock tokens with team ID binding, following existing service patterns.

## Implementation

### 1. Create Lock Utilities Module
```typescript
// netlify/functions/_lib/lockUtils.ts
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { LockTokenPayloadSchema, validateSchema } from '../../../src/types/schemas'

export class LockUtils {
  private static readonly JWT_SECRET = process.env.TEAM_LOCK_JWT_SECRET || 'default-dev-secret'
  private static readonly TTL_SECONDS = parseInt(process.env.TEAM_LOCK_TTL_SECONDS || '86400') // 24h

  /**
   * Generate a secure lock token for a team
   */
  static generateLockToken(teamId: string): { token: string, expiresAt: number } {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + this.TTL_SECONDS

    const payload = {
      teamId,
      exp: expiresAt,
      iat: now,
      sub: 'team-lock'
    }

    // Validate payload structure
    validateSchema(LockTokenPayloadSchema, payload, 'lock token payload')

    const token = jwt.sign(payload, this.JWT_SECRET, { algorithm: 'HS256' })

    return { token, expiresAt }
  }

  /**
   * Verify and decode a lock token
   */
  static verifyLockToken(token: string): { teamId: string, exp: number } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, { algorithms: ['HS256'] })

      // Validate decoded structure
      const payload = validateSchema(LockTokenPayloadSchema, decoded, 'decoded lock token')

      return {
        teamId: payload.teamId,
        exp: payload.exp
      }
    } catch (error) {
      console.warn('[LockUtils] Token verification failed:', error.message)
      return null
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(exp: number): boolean {
    const now = Math.floor(Date.now() / 1000)
    return exp <= now
  }

  /**
   * Generate device fingerprint for conflict detection
   */
  static generateDeviceHint(userAgent: string, ip: string): string {
    const seed = process.env.DEVICE_HINT_SEED || 'default-seed'
    const combined = `${userAgent}:${ip}:${seed}`
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16)
  }

  /**
   * Hash team code for secure logging
   */
  static hashTeamCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 12)
  }
}
```

### 2. Create Client Lock Manager
```typescript
// src/services/TeamLockService.ts
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
}
```

## Benefits
- Secure JWT-based tokens prevent client-side tampering
- Device fingerprinting helps prevent multi-device exploitation
- Automatic expiration handling with graceful fallbacks
- Type-safe validation using existing schema patterns

## Success Criteria
- [ ] JWT tokens generated with proper structure and security
- [ ] Token verification handles all edge cases (expired, invalid, etc.)
- [ ] Client lock service manages localStorage correctly
- [ ] Device fingerprinting works without storing PII
- [ ] All utilities follow existing service patterns

## Files Created
- `netlify/functions/_lib/lockUtils.ts` - Server-side lock utilities
- `src/services/TeamLockService.ts` - Client-side lock management

## Environment Variables Required
- `TEAM_LOCK_JWT_SECRET` - JWT signing secret
- `TEAM_LOCK_TTL_SECONDS` - Lock duration (default: 86400)
- `DEVICE_HINT_SEED` - Seed for device fingerprinting

## Dependencies
- `jsonwebtoken` npm package (likely already available)
- Existing schema validation utilities