# Task 002.01: Create Team Verification Netlify Function

## Problem
Need a secure server-side endpoint to verify team codes, validate device constraints, and issue lock tokens following existing Netlify Functions patterns.

## Solution
Create `team-verify.js` Netlify Function that handles team code validation and lock token issuance with comprehensive error handling.

## Implementation

### 1. Create Team Verify Function
```javascript
// netlify/functions/team-verify.js
const { TeamStorage } = require('./_lib/teamStorage')
const { LockUtils } = require('./_lib/lockUtils')
const { TeamErrorHandler } = require('./_lib/teamErrors')
const { TeamLogger } = require('./_lib/teamLogger')
const { validateSchema, TeamVerifyRequestSchema } = require('../../src/types/schemas')

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse and validate request
    const body = JSON.parse(event.body || '{}')
    const request = validateSchema(TeamVerifyRequestSchema, body, 'team verify request')

    const { code, deviceHint } = request
    const userAgent = event.headers['user-agent'] || ''
    const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown'

    // Generate device fingerprint
    const deviceFingerprint = LockUtils.generateDeviceHint(userAgent, ip)

    // Check for existing lock conflicts
    const existingLock = await checkDeviceLockConflict(deviceFingerprint, request.teamCode)
    if (existingLock) {
      TeamLogger.logVerificationAttempt(code, 'conflict', existingLock.teamId)
      const { error, status } = TeamErrorHandler.teamLockConflict(existingLock.remainingTtl)

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    // Look up team code mapping
    const mapping = await TeamStorage.getTeamCodeMapping(code)
    if (!mapping || !mapping.isActive) {
      TeamLogger.logVerificationAttempt(code, 'invalid_code')
      const { error, status } = TeamErrorHandler.teamCodeInvalid()

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    // Ensure team data exists
    const { data: teamData } = await TeamStorage.getTeamData(mapping.teamId)
    if (!teamData) {
      // Create team if mapping exists but team data doesn't
      const newTeam = await TeamStorage.createTeam(mapping.teamId, mapping.teamName)
      if (!newTeam) {
        TeamLogger.logVerificationAttempt(code, 'error', mapping.teamId, 'Failed to create team')
        const { error, status } = TeamErrorHandler.storageError('Team creation failed')

        return {
          statusCode: status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(error)
        }
      }
    }

    // Generate lock token
    const { token, expiresAt } = LockUtils.generateLockToken(mapping.teamId)
    const ttlSeconds = Math.floor((expiresAt * 1000 - Date.now()) / 1000)

    // Store device lock to prevent conflicts
    await storeDeviceLock(deviceFingerprint, mapping.teamId, expiresAt)

    // Log successful verification
    TeamLogger.logVerificationAttempt(code, 'success', mapping.teamId)
    TeamLogger.logLockOperation('issued', mapping.teamId, { deviceFingerprint })

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        teamId: mapping.teamId,
        teamName: mapping.teamName,
        lockToken: token,
        ttlSeconds
      })
    }

  } catch (error) {
    console.error('[team-verify] Unexpected error:', error)

    const { error: errorResponse, status } = TeamErrorHandler.storageError(error.message)
    return {
      statusCode: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse)
    }
  }
}

/**
 * Check if device already has a lock for a different team
 */
async function checkDeviceLockConflict(deviceFingerprint, requestedTeamCode) {
  try {
    // In production, this would query a device locks table
    // For now, simulate with Netlify Blobs
    const { getStore } = require('@netlify/blobs')
    const store = getStore('device-locks')

    const lockData = await store.get(deviceFingerprint, { type: 'json' })
    if (!lockData) return null

    const now = Date.now()
    if (lockData.expiresAt <= now) {
      // Lock expired, clean it up
      await store.delete(deviceFingerprint)
      return null
    }

    // Check if it's for the same team (no conflict)
    const requestedMapping = await TeamStorage.getTeamCodeMapping(requestedTeamCode)
    if (requestedMapping && lockData.teamId === requestedMapping.teamId) {
      return null // Same team, no conflict
    }

    return {
      teamId: lockData.teamId,
      remainingTtl: Math.floor((lockData.expiresAt - now) / 1000)
    }
  } catch (error) {
    console.error('[team-verify] Failed to check device lock:', error)
    return null // Allow on error to avoid blocking legitimate users
  }
}

/**
 * Store device lock to prevent multi-team participation
 */
async function storeDeviceLock(deviceFingerprint, teamId, expiresAt) {
  try {
    const { getStore } = require('@netlify/blobs')
    const store = getStore('device-locks')

    await store.set(deviceFingerprint, JSON.stringify({
      teamId,
      expiresAt: expiresAt * 1000, // Convert to milliseconds
      createdAt: Date.now()
    }))
  } catch (error) {
    console.error('[team-verify] Failed to store device lock:', error)
    // Don't fail the verification if device lock storage fails
  }
}
```

### 2. Create Team Current Context Function
```javascript
// netlify/functions/team-current.js
const { LockUtils } = require('./_lib/lockUtils')
const { TeamStorage } = require('./_lib/teamStorage')
const { TeamErrorHandler } = require('./_lib/teamErrors')

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get lock token from header
    const lockToken = event.headers['x-team-lock']
    if (!lockToken) {
      const { error, status } = TeamErrorHandler.invalidToken()

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    // Verify lock token
    const tokenData = LockUtils.verifyLockToken(lockToken)
    if (!tokenData) {
      const { error, status } = TeamErrorHandler.invalidToken()

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    // Check if token is expired
    if (LockUtils.isTokenExpired(tokenData.exp)) {
      const { error, status } = TeamErrorHandler.teamLockExpired()

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    // Get team data
    const { data: teamData } = await TeamStorage.getTeamData(tokenData.teamId)
    if (!teamData) {
      const { error, status } = TeamErrorHandler.storageError('Team data not found')

      return {
        statusCode: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(error)
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        teamId: teamData.teamId,
        teamName: teamData.name
      })
    }

  } catch (error) {
    console.error('[team-current] Unexpected error:', error)

    const { error: errorResponse, status } = TeamErrorHandler.storageError(error.message)
    return {
      statusCode: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorResponse)
    }
  }
}
```

## Benefits
- Secure server-side team code validation
- Device conflict detection prevents exploitation
- Comprehensive error handling with user-friendly messages
- Follows existing Netlify Functions patterns

## Success Criteria
- [ ] Team verification function handles all specified error cases
- [ ] Device fingerprinting prevents multi-team participation
- [ ] Lock tokens generated with proper security
- [ ] Team context retrieval works with valid tokens
- [ ] All responses follow API conventions

## Files Created
- `netlify/functions/team-verify.js` - Team verification endpoint
- `netlify/functions/team-current.js` - Team context endpoint

## Dependencies
- Foundation infrastructure from Story 001
- LockUtils, TeamStorage, TeamErrorHandler modules
- @netlify/blobs for device lock storage