/**
 * End-to-End Tests for Netlify Functions
 * Tests the actual API endpoints to verify data flow and responses
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888'
const API_PREFIX = '/.netlify/functions'

// Test data
const TEST_TEAM_CODE = 'ALPHA01' // BHHS team code from migration
const TEST_ORG_ID = 'bhhs'
const TEST_HUNT_ID = 'fall-2025'
const TEST_TEAM_ID = 'berrypicker'

describe('Netlify Functions E2E Tests', () => {
  let authToken = null

  beforeAll(async () => {
    // Wait a moment for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  afterAll(async () => {
    // Cleanup any test data if needed
  })

  describe('Health Check', () => {
    test('GET /health should return system status', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/health`)

      expect(response.status).toBe(200)

      const health = await response.json()
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('environment')
      expect(health).toHaveProperty('cloudinary')
      expect(health).toHaveProperty('blobs')
      expect(health).toHaveProperty('checks')

      // Verify basic structure
      expect(health.environment).toHaveProperty('nodeVersion')
      expect(health.environment).toHaveProperty('isNetlify')
      expect(health.cloudinary).toHaveProperty('cloudNamePresent')
      expect(health.blobs).toHaveProperty('kv')
      expect(health.blobs).toHaveProperty('huntData')
    })
  })

  describe('Team Verification', () => {
    test('POST /team-verify should validate team codes', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: TEST_TEAM_CODE,
          deviceHint: 'test-device'
        })
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('teamId')
      expect(result).toHaveProperty('teamName')
      expect(result).toHaveProperty('lockToken')
      expect(result).toHaveProperty('ttlSeconds')

      // Store auth token for subsequent tests
      authToken = result.lockToken

      console.log('Team verification successful:', {
        teamId: result.teamId,
        teamName: result.teamName,
        hasToken: !!result.lockToken
      })
    })

    test('POST /team-verify should reject invalid codes', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'INVALID99',
          deviceHint: 'test-device'
        })
      })

      expect(response.status).toBe(404)

      const result = await response.json()
      expect(result).toHaveProperty('error')
    })

    test('POST /team-verify should require code parameter', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceHint: 'test-device'
        })
      })

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result).toHaveProperty('error')
    })
  })

  describe('Team Current', () => {
    test('GET /team-current should return team data with valid token', async () => {
      if (!authToken) {
        console.log('Skipping team-current test - no auth token available')
        return
      }

      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-current`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)

      const team = await response.json()
      expect(team).toHaveProperty('teamId')
      expect(team).toHaveProperty('name')
      expect(team).toHaveProperty('organizationId')
      expect(team).toHaveProperty('huntId')
    })

    test('GET /team-current should reject requests without auth', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-current`)

      expect(response.status).toBe(401)

      const result = await response.json()
      expect(result).toHaveProperty('error')
    })
  })

  describe('Progress Management', () => {
    test('GET /progress-get should return progress data', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-get/${TEST_ORG_ID}/${TEST_TEAM_ID}/${TEST_HUNT_ID}`)

      expect(response.status).toBe(200)

      const progress = await response.json()
      // Progress might be empty for new teams, that's ok
      expect(typeof progress).toBe('object')
    })

    test('POST /progress-set should update progress data', async () => {
      const testProgress = {
        'covered-bridge': {
          completed: true,
          completedAt: new Date().toISOString(),
          hintsRevealed: 1
        }
      }

      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId: TEST_ORG_ID,
          teamId: TEST_TEAM_ID,
          huntId: TEST_HUNT_ID,
          progress: testProgress
        })
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('success', true)
    })

    test('GET /progress-get should return updated progress', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-get/${TEST_ORG_ID}/${TEST_TEAM_ID}/${TEST_HUNT_ID}`)

      expect(response.status).toBe(200)

      const progress = await response.json()
      expect(progress).toHaveProperty('covered-bridge')
      expect(progress['covered-bridge']).toHaveProperty('completed', true)
    })
  })

  describe('KV Store Operations', () => {
    const TEST_KEY = 'test-e2e-key'
    const TEST_VALUE = { message: 'test-data', timestamp: Date.now() }

    test('POST /kv-set should store data', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/kv-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: TEST_KEY,
          value: TEST_VALUE
        })
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('success', true)
    })

    test('GET /kv-get should retrieve stored data', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/kv-get?key=${TEST_KEY}`)

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('value')
      expect(result.value).toEqual(TEST_VALUE)
    })

    test('GET /kv-list should list stored keys', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/kv-list`)

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('keys')
      expect(Array.isArray(result.keys)).toBe(true)
      expect(result.keys).toContain(TEST_KEY)
    })

    // Cleanup test data
    afterAll(async () => {
      try {
        await fetch(`${BASE_URL}${API_PREFIX}/kv-set`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key: TEST_KEY })
        })
      } catch (error) {
        console.log('Cleanup failed (non-critical):', error.message)
      }
    })
  })

  describe('Settings Management', () => {
    test('GET /settings-get should return default settings', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/settings-get`)

      expect(response.status).toBe(200)

      const settings = await response.json()
      expect(typeof settings).toBe('object')
    })

    test('POST /settings-set should update settings', async () => {
      const testSettings = {
        theme: 'dark',
        notifications: true,
        testMode: true
      }

      const response = await fetch(`${BASE_URL}${API_PREFIX}/settings-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testSettings)
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('Leaderboard', () => {
    test('GET /leaderboard-get should return leaderboard data', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/leaderboard-get`)

      expect(response.status).toBe(200)

      const leaderboard = await response.json()
      expect(Array.isArray(leaderboard)).toBe(true)

      // Check structure if teams exist
      if (leaderboard.length > 0) {
        const team = leaderboard[0]
        expect(team).toHaveProperty('teamId')
        expect(team).toHaveProperty('name')
        expect(team).toHaveProperty('score')
      }
    })
  })

  describe('CORS Headers', () => {
    test('OPTIONS requests should return CORS headers', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/health`, {
        method: 'OPTIONS'
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
    })

    test('All responses should include CORS headers', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/health`)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('Error Handling', () => {
    test('Non-existent endpoints should return 404', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/non-existent-function`)

      expect(response.status).toBe(404)
    })

    test('Invalid HTTP methods should be rejected', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/health`, {
        method: 'DELETE'
      })

      expect(response.status).toBe(405)
    })
  })
})