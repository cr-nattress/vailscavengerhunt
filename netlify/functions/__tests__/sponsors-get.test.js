/**
 * Tests for sponsors-get Netlify function
 * Tests API functionality, error handling, and edge cases
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { handler } from '../sponsors-get'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  })),
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(() => Promise.resolve({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null
      }))
    }))
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('sponsors-get function', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.VITE_ENABLE_SPONSOR_CARD = 'true'

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.VITE_ENABLE_SPONSOR_CARD
  })

  describe('CORS handling', () => {
    test('handles OPTIONS request correctly', async () => {
      const event = { httpMethod: 'OPTIONS' }
      const result = await handler(event, {})

      expect(result.statusCode).toBe(200)
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS')
      expect(result.body).toBe('')
    })

    test('includes CORS headers in all responses', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})

      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('Feature flag handling', () => {
    test('returns empty array when feature is disabled', async () => {
      process.env.VITE_ENABLE_SPONSOR_CARD = 'false'

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items).toEqual([])
      expect(body.layout).toBe('1x2')
    })
  })

  describe('Parameter validation', () => {
    test('returns 400 for missing organizationId', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(400)
    })

    test('returns 400 for missing huntId', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org'
        })
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(400)
    })

    test('returns 400 for completely missing body', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({})
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(400)
    })

    test('handles GET request parameters', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          organizationId: 'test-org',
          huntId: 'test-hunt'
        }
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(200)
    })
  })

  describe('Empty results handling', () => {
    test('returns empty array when no sponsors found', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [], error: null })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items).toEqual([])
      expect(body.layout).toBe('1x2')
    })

    test('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: null, error: null })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items).toEqual([])
    })
  })

  describe('Successful responses', () => {
    test('returns sponsors with image URLs', async () => {
      const mockSponsors = [
        {
          id: '1',
          organization_id: 'test-org',
          hunt_id: 'test-hunt',
          company_id: 'company-1',
          company_name: 'Test Company',
          image_type: 'png',
          image_alt: 'Test Company logo',
          order_index: 0,
          is_active: true,
          storage_path: 'test-org/test-hunt/logo.png',
          svg_text: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items).toHaveLength(1)
      expect(body.items[0].companyName).toBe('Test Company')
      expect(body.items[0].src).toBe('https://example.com/signed-url')
      expect(body.items[0].svg).toBeNull()
    })

    test('returns sponsors with SVG content', async () => {
      const mockSponsors = [
        {
          id: '2',
          organization_id: 'test-org',
          hunt_id: 'test-hunt',
          company_id: 'company-2',
          company_name: 'SVG Company',
          image_type: 'svg',
          image_alt: 'SVG Company logo',
          order_index: 0,
          is_active: true,
          storage_path: null,
          svg_text: '<svg viewBox="0 0 100 40"><rect width="100" height="40" fill="blue"/></svg>'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items[0].svg).toContain('<svg')
      expect(body.items[0].src).toBeNull()
    })
  })

  describe('Error handling', () => {
    test('returns 500 for missing Supabase credentials', async () => {
      delete process.env.SUPABASE_URL

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(500)
    })

    test('returns 500 for database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              })
            })
          })
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(500)
    })

    test('handles signed URL generation errors gracefully', async () => {
      const mockSponsors = [{
        id: '1',
        organization_id: 'test-org',
        hunt_id: 'test-hunt',
        company_id: 'company-1',
        company_name: 'Test Company',
        image_type: 'png',
        image_alt: 'Test Company logo',
        order_index: 0,
        is_active: true,
        storage_path: 'invalid/path.png',
        svg_text: null
      }]

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSponsors, error: null })
              })
            })
          })
        })
      })

      mockSupabase.storage.from.mockReturnValue({
        createSignedUrl: () => Promise.resolve({
          data: null,
          error: { message: 'File not found' }
        })
      })

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org',
          huntId: 'test-hunt'
        })
      }

      const result = await handler(event, {})
      const body = JSON.parse(result.body)

      expect(result.statusCode).toBe(200)
      expect(body.items[0].src).toBeNull()
    })

    test('handles malformed JSON in request body', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      }

      const result = await handler(event, {})
      expect(result.statusCode).toBe(500)
    })
  })
})