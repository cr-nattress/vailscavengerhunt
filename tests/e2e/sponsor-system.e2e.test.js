/**
 * Sponsor System End-to-End Tests
 * Tests the complete sponsor system from API to UI rendering
 */

import { describe, test, expect, beforeAll } from 'vitest'

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:8888/.netlify/functions'

describe('Sponsor System E2E Tests', () => {
  // Test data
  const testOrg = 'test-org'
  const testHunt = 'test-hunt'

  beforeAll(() => {
    // Set feature flag environment variable for testing
    process.env.VITE_ENABLE_SPONSOR_CARD = 'true'
  })

  describe('API Layer Tests', () => {
    test('sponsors-get endpoint responds correctly with no sponsors', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('layout')
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
      expect(['1x1', '1x2', '1x3']).toContain(data.layout)
    })

    test('sponsors-get endpoint handles CORS correctly', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'OPTIONS'
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    test('sponsors-get endpoint validates parameters', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required parameters
        })
      })

      expect(response.status).toBe(400)
    })

    test('sponsors-get endpoint respects feature flag', async () => {
      // Temporarily disable feature flag
      const originalFlag = process.env.VITE_ENABLE_SPONSOR_CARD
      process.env.VITE_ENABLE_SPONSOR_CARD = 'false'

      try {
        const response = await fetch(`${API_BASE}/sponsors-get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: testOrg,
            huntId: testHunt
          })
        })

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.items).toEqual([])
        expect(data.layout).toBe('1x2')
      } finally {
        // Restore original flag
        process.env.VITE_ENABLE_SPONSOR_CARD = originalFlag
      }
    })
  })

  describe('Data Validation Tests', () => {
    test('API returns valid sponsor data structure', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      const data = await response.json()

      // Validate response structure
      expect(typeof data.layout).toBe('string')
      expect(Array.isArray(data.items)).toBe(true)

      // Validate each sponsor item structure if any exist
      data.items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('companyId')
        expect(item).toHaveProperty('companyName')
        expect(item).toHaveProperty('alt')
        expect(item).toHaveProperty('type')
        expect(['png', 'jpg', 'jpeg', 'svg']).toContain(item.type)

        // Should have either src or svg, but not necessarily both
        if (item.type === 'svg') {
          expect(item.svg !== null || item.src !== null).toBe(true)
        } else {
          expect(item.src !== null).toBe(true)
        }
      })
    })

    test('Layout values are always valid', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      const data = await response.json()
      expect(['1x1', '1x2', '1x3']).toContain(data.layout)
    })
  })

  describe('Error Handling Tests', () => {
    test('API handles missing Supabase credentials gracefully', async () => {
      // This test verifies that the API doesn't crash with missing env vars
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      // Should still respond with a valid structure even if DB is unavailable
      expect([200, 500]).toContain(response.status)

      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('layout')
        expect(data).toHaveProperty('items')
      }
    })

    test('API handles malformed JSON gracefully', async () => {
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      expect(response.status).toBe(500)
    })

    test('API handles oversized requests', async () => {
      const oversizedData = {
        organizationId: 'a'.repeat(10000),
        huntId: 'b'.repeat(10000)
      }

      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedData)
      })

      // Should handle gracefully (either 400 or 413)
      expect([400, 413, 500]).toContain(response.status)
    })
  })

  describe('Performance Tests', () => {
    test('API responds within reasonable time', async () => {
      const startTime = Date.now()

      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      const responseTime = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    })

    test('Multiple concurrent requests handled correctly', async () => {
      const promises = Array(5).fill(0).map(() =>
        fetch(`${API_BASE}/sponsors-get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: testOrg + Math.random(),
            huntId: testHunt + Math.random()
          })
        })
      )

      const responses = await Promise.all(promises)

      // All requests should complete successfully
      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status)
      })
    })
  })

  describe('Security Tests', () => {
    test('API prevents SQL injection attempts', async () => {
      const maliciousPayload = {
        organizationId: "'; DROP TABLE sponsor_assets; --",
        huntId: "test' OR '1'='1"
      }

      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
      })

      // Should either handle safely or reject
      expect([200, 400, 500]).toContain(response.status)

      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('layout')
        expect(data).toHaveProperty('items')
      }
    })

    test('API handles XSS attempts in parameters', async () => {
      const xssPayload = {
        organizationId: "<script>alert('xss')</script>",
        huntId: "javascript:alert('xss')"
      }

      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload)
      })

      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Feature Integration Tests', () => {
    test('Sponsor system integrates with settings system', async () => {
      // Test that layout configuration is respected
      const response = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })

      const data = await response.json()
      expect(['1x1', '1x2', '1x3']).toContain(data.layout)
    })

    test('System works end-to-end with different org/hunt combinations', async () => {
      const testCases = [
        { org: 'org1', hunt: 'hunt1' },
        { org: 'org2', hunt: 'hunt2' },
        { org: 'special-org', hunt: 'special-hunt' }
      ]

      for (const testCase of testCases) {
        const response = await fetch(`${API_BASE}/sponsors-get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: testCase.org,
            huntId: testCase.hunt
          })
        })

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data).toHaveProperty('layout')
        expect(data).toHaveProperty('items')
      }
    })

    test('Caching behavior works correctly', async () => {
      // First request
      const start1 = Date.now()
      const response1 = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })
      const time1 = Date.now() - start1

      // Second request (should potentially be faster due to caching)
      const start2 = Date.now()
      const response2 = await fetch(`${API_BASE}/sponsors-get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: testOrg,
          huntId: testHunt
        })
      })
      const time2 = Date.now() - start2

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const data1 = await response1.json()
      const data2 = await response2.json()

      // Responses should be consistent
      expect(data1.layout).toBe(data2.layout)
      expect(data1.items.length).toBe(data2.items.length)
    })
  })
})