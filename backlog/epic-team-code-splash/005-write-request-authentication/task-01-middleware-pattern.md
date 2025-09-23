# Task 005.01: Create Team Lock Validation Middleware

## Problem
Need a reusable middleware pattern to validate team lock tokens on all write operations, following existing Netlify Functions patterns.

## Solution
Create a shared middleware function that can be easily added to existing and new write endpoints.

## Implementation

### 1. Create Team Lock Middleware
```javascript
// netlify/functions/_lib/teamLockMiddleware.js
const { LockUtils } = require('./lockUtils')
const { TeamErrorHandler } = require('./teamErrors')
const { TeamLogger } = require('./teamLogger')

/**
 * Middleware to validate team lock tokens on write operations
 */
async function validateTeamLock(event, requiredTeamId = null) {
  try {
    // Get lock token from header
    const lockToken = event.headers['x-team-lock']
    if (!lockToken) {
      TeamLogger.logWriteRejection(event.path, 'MISSING_TOKEN')
      return TeamErrorHandler.invalidToken()
    }

    // Verify lock token
    const tokenData = LockUtils.verifyLockToken(lockToken)
    if (!tokenData) {
      TeamLogger.logWriteRejection(event.path, 'INVALID_TOKEN')
      return TeamErrorHandler.invalidToken()
    }

    // Check if token is expired
    if (LockUtils.isTokenExpired(tokenData.exp)) {
      TeamLogger.logWriteRejection(event.path, 'EXPIRED_TOKEN', tokenData.teamId)
      return TeamErrorHandler.teamLockExpired()
    }

    // Check team ID match if required
    if (requiredTeamId && tokenData.teamId !== requiredTeamId) {
      TeamLogger.logWriteRejection(event.path, 'TEAM_MISMATCH', tokenData.teamId)
      return TeamErrorHandler.teamMismatch(requiredTeamId, tokenData.teamId)
    }

    // Return valid team context
    return {
      success: true,
      teamId: tokenData.teamId,
      exp: tokenData.exp
    }
  } catch (error) {
    console.error('[teamLockMiddleware] Validation error:', error)
    TeamLogger.logWriteRejection(event.path, 'VALIDATION_ERROR')
    return TeamErrorHandler.storageError('Token validation failed')
  }
}

/**
 * Extract team ID from URL path (for endpoints like /api/progress/{orgId}/{teamId}/{huntId})
 */
function extractTeamIdFromPath(path) {
  const pathParts = path.split('/')
  // Assuming pattern: /api/progress/{orgId}/{teamId}/{huntId}
  if (pathParts.length >= 5 && pathParts[2] === 'progress') {
    return pathParts[4] // teamId is the 4th segment (0-indexed)
  }
  return null
}

/**
 * Higher-order function to wrap Netlify Functions with team lock validation
 */
function withTeamLock(handler, options = {}) {
  return async (event, context) => {
    // Skip validation for non-write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)) {
      return handler(event, context)
    }

    // Skip validation if explicitly disabled
    if (options.skipTeamLock) {
      return handler(event, context)
    }

    // Extract team ID from path if needed
    const requiredTeamId = options.extractTeamId
      ? extractTeamIdFromPath(event.path)
      : options.teamId

    // Validate team lock
    const validation = await validateTeamLock(event, requiredTeamId)

    if (!validation.success) {
      return {
        statusCode: validation.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(validation.error)
      }
    }

    // Add team context to event for use in handler
    event.teamContext = {
      teamId: validation.teamId,
      exp: validation.exp
    }

    // Call original handler
    return handler(event, context)
  }
}

module.exports = {
  validateTeamLock,
  extractTeamIdFromPath,
  withTeamLock
}
```

### 2. Update Existing Progress Function
```javascript
// netlify/functions/progress-set.js (updated)
const { withTeamLock } = require('./_lib/teamLockMiddleware')
// ... existing imports

const originalHandler = async (event, context) => {
  // Existing progress-set logic
  // Now has access to event.teamContext.teamId if team lock is valid

  try {
    const body = JSON.parse(event.body || '{}')
    const { orgId, teamId, huntId } = body

    // Validate that the team ID in the request matches the lock
    if (event.teamContext && event.teamContext.teamId !== teamId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Team ID mismatch',
          code: 'TEAM_MISMATCH'
        })
      }
    }

    // ... rest of existing logic
  } catch (error) {
    // ... existing error handling
  }
}

// Wrap with team lock validation
exports.handler = withTeamLock(originalHandler, {
  extractTeamId: true // Extract team ID from URL path for validation
})
```

### 3. Create Client Header Injection Service
```typescript
// src/services/AuthenticatedFetch.ts
import { TeamLockService } from './TeamLockService'

export class AuthenticatedFetch {
  /**
   * Make authenticated request with team lock token
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const lockToken = TeamLockService.getLockToken()

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(lockToken && { 'X-Team-Lock': lockToken })
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  /**
   * Make authenticated POST request
   */
  static async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * Make authenticated PATCH request
   */
  static async patch(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * Handle response with team lock error detection
   */
  static async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const error = await response.json()

      // Check for team lock related errors that require redirect
      if (error.code && ['TEAM_LOCK_EXPIRED', 'TEAM_MISMATCH', 'INVALID_TOKEN'].includes(error.code)) {
        // Clear invalid lock and trigger app to show splash
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
}
```

## Benefits
- Reusable middleware pattern for all write endpoints
- Automatic header injection on client side
- Clear separation of team validation logic
- Graceful error handling with appropriate redirects

## Success Criteria
- [ ] Middleware can be easily added to any Netlify Function
- [ ] Team ID validation works for URL-based and body-based team references
- [ ] Client automatically includes lock tokens in write requests
- [ ] Error handling triggers appropriate user flows
- [ ] Existing endpoints can be protected incrementally

## Files Created
- `netlify/functions/_lib/teamLockMiddleware.js` - Server middleware
- `src/services/AuthenticatedFetch.ts` - Client request service

## Dependencies
- LockUtils, TeamErrorHandler, TeamLogger from foundation tasks
- TeamLockService for client-side token management