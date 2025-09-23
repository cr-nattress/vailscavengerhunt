# Task 001.04: Define Standardized Error Codes

## Problem
Need consistent error codes and handling patterns for team lock operations that align with existing API conventions and provide clear user feedback.

## Solution
Define standard error codes, HTTP status mappings, and error response patterns following existing schema patterns.

## Implementation

### 1. Add Error Schemas to schemas.ts
```typescript
// Team lock specific error codes
export enum TeamLockErrorCode {
  TEAM_CODE_INVALID = 'TEAM_CODE_INVALID',
  TEAM_LOCK_CONFLICT = 'TEAM_LOCK_CONFLICT',
  TEAM_LOCK_EXPIRED = 'TEAM_LOCK_EXPIRED',
  TEAM_MISMATCH = 'TEAM_MISMATCH',
  RATE_LIMITED = 'RATE_LIMITED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN'
}

// Enhanced error response schema for team operations
export const TeamErrorResponseSchema = ErrorResponseSchema.extend({
  code: z.nativeEnum(TeamLockErrorCode),
  context: z.object({
    teamId: z.string().optional(),
    remainingTtlSeconds: z.number().optional(),
    retryAfterSeconds: z.number().optional()
  }).optional()
})

export type TeamErrorResponse = z.infer<typeof TeamErrorResponseSchema>
```

### 2. Create Error Handler Utility
```typescript
// netlify/functions/_lib/teamErrors.ts
import { TeamLockErrorCode, TeamErrorResponse } from '../../../src/types/schemas'

export class TeamErrorHandler {
  /**
   * Create standardized team error response
   */
  static createError(
    code: TeamLockErrorCode,
    message: string,
    status: number,
    context?: any
  ): { error: TeamErrorResponse, status: number } {
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
  static teamCodeInvalid(): { error: TeamErrorResponse, status: number } {
    return this.createError(
      TeamLockErrorCode.TEAM_CODE_INVALID,
      "That code didn't work. Check with your host.",
      401
    )
  }

  /**
   * Handle team lock conflicts
   */
  static teamLockConflict(remainingTtlSeconds: number): { error: TeamErrorResponse, status: number } {
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
  static teamLockExpired(): { error: TeamErrorResponse, status: number } {
    return this.createError(
      TeamLockErrorCode.TEAM_LOCK_EXPIRED,
      "Your team session has expired. Please re-enter your team code.",
      419
    )
  }

  /**
   * Handle team mismatch errors
   */
  static teamMismatch(expectedTeamId: string, actualTeamId: string): { error: TeamErrorResponse, status: number } {
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
  static rateLimited(retryAfterSeconds: number = 60): { error: TeamErrorResponse, status: number } {
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
  static storageError(details?: string): { error: TeamErrorResponse, status: number } {
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
  static invalidToken(): { error: TeamErrorResponse, status: number } {
    return this.createError(
      TeamLockErrorCode.INVALID_TOKEN,
      "Invalid or malformed team lock token.",
      401
    )
  }
}
```

### 3. Create Client Error Handler
```typescript
// src/services/TeamErrorHandler.ts
import { TeamLockErrorCode, TeamErrorResponse } from '../types/schemas'

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
}
```

### 4. Add Logging Utilities
```typescript
// netlify/functions/_lib/teamLogger.ts
import { TeamLockErrorCode } from '../../../src/types/schemas'
import { LockUtils } from './lockUtils'

export class TeamLogger {
  /**
   * Log team verification attempts (with hashed codes)
   */
  static logVerificationAttempt(
    teamCode: string,
    outcome: 'success' | 'invalid_code' | 'conflict' | 'error',
    teamId?: string,
    details?: any
  ): void {
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
  static logLockOperation(
    operation: 'issued' | 'verified' | 'expired' | 'invalid',
    teamId?: string,
    details?: any
  ): void {
    console.log(`[TeamLock] ${operation}`, {
      teamId: teamId || 'unknown',
      timestamp: new Date().toISOString(),
      details
    })
  }

  /**
   * Log write rejections
   */
  static logWriteRejection(
    endpoint: string,
    reason: TeamLockErrorCode,
    teamId?: string
  ): void {
    console.log(`[TeamWrite] rejected`, {
      endpoint,
      reason,
      teamId: teamId || 'unknown',
      timestamp: new Date().toISOString()
    })
  }
}
```

## Benefits
- Consistent error handling across all team operations
- User-friendly error messages with actionable guidance
- Secure logging that doesn't expose sensitive data
- Clear mapping between error codes and appropriate responses

## Success Criteria
- [ ] Error codes defined for all team lock scenarios
- [ ] HTTP status codes follow REST conventions
- [ ] Client error handling provides clear user guidance
- [ ] Logging utilities hash sensitive data appropriately
- [ ] Error responses include helpful context for debugging

## Files Modified/Created
- `src/types/schemas.ts` - Add error schemas and enums
- `netlify/functions/_lib/teamErrors.ts` - Server error handler
- `src/services/TeamErrorHandler.ts` - Client error handler
- `netlify/functions/_lib/teamLogger.ts` - Logging utilities

## Security Considerations
- Team codes are hashed in logs to prevent exposure
- Error messages don't reveal system internals
- Rate limiting prevents brute force attacks
- Audit trail maintained for security analysis