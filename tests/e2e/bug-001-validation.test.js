/**
 * BUG-001 Validation Tests
 * Validates that the storage bridge fixes resolve the E2E test failures
 */

import { describe, test, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888'
const API_PREFIX = '/.netlify/functions'

// Test data
const TEST_TEAM_CODES = ['ALPHA01', 'BETA02', 'GAMMA03', 'DELTA04', 'ECHO05']
const TEST_ORG_ID = 'bhhs'
const TEST_HUNT_ID = 'fall-2025'
const TEST_TEAM_ID = 'berrypicker'

describe('BUG-001: Storage Bridge Validation', () => {
  let authToken = null

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  describe('Team Verification Fixed', () => {
    test('ALPHA01 should authenticate successfully', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'ALPHA01',
          deviceHint: 'bug-001-test'
        })
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result).toHaveProperty('teamId')
      expect(result).toHaveProperty('teamName')
      expect(result).toHaveProperty('lockToken')
      expect(result).toHaveProperty('ttlSeconds')

      authToken = result.lockToken

      console.log('✅ Team verification working:', {
        teamId: result.teamId,
        teamName: result.teamName
      })
    })

    test('Multiple valid team codes should work', async () => {
      for (const code of TEST_TEAM_CODES) {
        const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            deviceHint: `bug-001-test-${code}`
          })
        })

        expect(response.status).toBe(200)

        const result = await response.json()
        expect(result.teamId).toBeTruthy()
        expect(result.teamName).toBeTruthy()

        console.log(`✅ ${code} → ${result.teamName}`)
      }
    })

    test('Invalid codes should still be rejected', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'INVALID99',
          deviceHint: 'bug-001-test'
        })
      })

      expect(response.status).toBe(401)

      const result = await response.json()
      expect(result).toHaveProperty('error')
      expect(result.code).toBe('TEAM_CODE_INVALID')
    })
  })

  describe('Progress Management Fixed', () => {
    test('Supabase progress GET should work', async () => {
      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-get-supabase/${TEST_ORG_ID}/${TEST_TEAM_ID}/${TEST_HUNT_ID}`)

      expect(response.status).toBe(200)

      const progress = await response.json()
      expect(typeof progress).toBe('object')

      // Should have progress for hunt stops
      if (Object.keys(progress).length > 0) {
        const firstStop = Object.values(progress)[0]
        expect(firstStop).toHaveProperty('done')
        expect(firstStop).toHaveProperty('revealedHints')
      }

      console.log(`✅ Progress retrieved: ${Object.keys(progress).length} stops`)
    })

    test('Supabase progress SET should work', async () => {
      const testProgress = {
        'international-bridge': {
          done: true,
          completedAt: new Date().toISOString(),
          revealedHints: 2,
          notes: 'BUG-001 validation test'
        }
      }

      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-set-supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      expect(result).toHaveProperty('updatedStops', 1)

      console.log('✅ Progress update successful')
    })

    test('Progress persistence should work end-to-end', async () => {
      // Set progress
      const testProgress = {
        'gore-range': {
          done: true,
          completedAt: new Date().toISOString(),
          revealedHints: 1,
          notes: 'End-to-end persistence test'
        }
      }

      const setResponse = await fetch(`${BASE_URL}${API_PREFIX}/progress-set-supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: TEST_ORG_ID,
          teamId: TEST_TEAM_ID,
          huntId: TEST_HUNT_ID,
          progress: testProgress
        })
      })

      expect(setResponse.status).toBe(200)

      // Wait a moment for consistency
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get progress back
      const getResponse = await fetch(`${BASE_URL}${API_PREFIX}/progress-get-supabase/${TEST_ORG_ID}/${TEST_TEAM_ID}/${TEST_HUNT_ID}`)
      expect(getResponse.status).toBe(200)

      const progress = await getResponse.json()
      expect(progress).toHaveProperty('gore-range')
      expect(progress['gore-range']).toHaveProperty('done', true)
      expect(progress['gore-range']).toHaveProperty('revealedHints', 1)
      expect(progress['gore-range']).toHaveProperty('notes', 'End-to-end persistence test')

      console.log('✅ End-to-end persistence working')
    })
  })

  describe('Team Authentication Flow', () => {
    test('Complete auth flow should work', async () => {
      if (!authToken) {
        console.log('Skipping auth flow test - no token available')
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

      console.log('✅ Team authentication flow working')
    })
  })

  describe('Data Integrity', () => {
    test('Supabase data should be intact', async () => {
      // Test that we can still access Supabase directly for validation
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      )

      // Check team codes still exist
      const { data: teamCodes, error } = await supabase
        .from('team_codes')
        .select('code, is_active')
        .eq('organization_id', TEST_ORG_ID)
        .eq('hunt_id', TEST_HUNT_ID)
        .eq('is_active', true)

      expect(error).toBeNull()
      expect(teamCodes.length).toBeGreaterThanOrEqual(5)

      const codes = teamCodes.map(tc => tc.code)
      for (const testCode of TEST_TEAM_CODES) {
        expect(codes).toContain(testCode)
      }

      console.log(`✅ Supabase integrity check: ${teamCodes.length} active team codes`)
    })
  })

  describe('Performance Validation', () => {
    test('Team verification should be fast', async () => {
      const startTime = Date.now()

      const response = await fetch(`${BASE_URL}${API_PREFIX}/team-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'BETA02',
          deviceHint: 'performance-test'
        })
      })

      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

      console.log(`✅ Team verification performance: ${duration}ms`)
    })

    test('Progress operations should be fast', async () => {
      const startTime = Date.now()

      const response = await fetch(`${BASE_URL}${API_PREFIX}/progress-get-supabase/${TEST_ORG_ID}/${TEST_TEAM_ID}/${TEST_HUNT_ID}`)

      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds

      console.log(`✅ Progress retrieval performance: ${duration}ms`)
    })
  })
})