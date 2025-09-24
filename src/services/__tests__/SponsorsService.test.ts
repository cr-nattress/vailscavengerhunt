/**
 * SponsorsService Tests
 * Tests for client-side sponsor data fetching service
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SponsorsService } from '../SponsorsService'
import { SponsorsRequest, SponsorsResponse } from '../../types/sponsors'

// Mock fetch globally
global.fetch = vi.fn()
const mockFetch = fetch as any

describe('SponsorsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    SponsorsService.clearCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSponsors', () => {
    const testRequest: SponsorsRequest = {
      organizationId: 'test-org',
      huntId: 'test-hunt'
    }

    test('fetches sponsors successfully', async () => {
      const mockResponse: SponsorsResponse = {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test Company',
            alt: 'Test logo',
            type: 'png',
            src: 'https://example.com/logo.png',
            svg: null
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith('/.netlify/functions/sponsors-get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest)
      })
    })

    test('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })

    test('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })

    test('validates response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })

    test('handles missing items array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ layout: '1x3' }) // Missing items
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result).toEqual({
        layout: '1x2',
        items: []
      })
    })

    test('handles invalid layout values', async () => {
      const mockResponse = {
        layout: 'invalid-layout',
        items: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result.layout).toBe('1x2') // Should default to 1x2
      expect(result.items).toEqual([])
    })

    test('filters out invalid sponsor items', async () => {
      const mockResponse = {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'valid',
            companyName: 'Valid Company',
            alt: 'Valid logo',
            type: 'png',
            src: 'https://example.com/valid.png',
            svg: null
          },
          {
            id: '2',
            // Missing required fields
            companyName: 'Invalid Company'
          },
          {
            id: '3',
            companyId: 'no-content',
            companyName: 'No Content Company',
            alt: 'No content logo',
            type: 'png',
            src: null, // No content
            svg: null
          },
          {
            id: '4',
            companyId: 'valid-svg',
            companyName: 'Valid SVG Company',
            alt: 'Valid SVG logo',
            type: 'svg',
            src: null,
            svg: '<svg>content</svg>'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result.items).toHaveLength(2) // Only valid ones
      expect(result.items[0].companyName).toBe('Valid Company')
      expect(result.items[1].companyName).toBe('Valid SVG Company')
    })

    test('filters out sponsors with invalid image types', async () => {
      const mockResponse = {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'valid',
            companyName: 'Valid Company',
            alt: 'Valid logo',
            type: 'png',
            src: 'https://example.com/valid.png',
            svg: null
          },
          {
            id: '2',
            companyId: 'invalid-type',
            companyName: 'Invalid Type Company',
            alt: 'Invalid type logo',
            type: 'gif', // Invalid type
            src: 'https://example.com/invalid.gif',
            svg: null
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await SponsorsService.getSponsors(testRequest)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].companyName).toBe('Valid Company')
    })
  })

  describe('Caching', () => {
    const testRequest: SponsorsRequest = {
      organizationId: 'test-org',
      huntId: 'test-hunt'
    }

    test('caches responses correctly', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      // First call
      await SponsorsService.getSponsors(testRequest)

      // Second call should use cache
      const result = await SponsorsService.getSponsors(testRequest)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResponse)
    })

    test('cache respects TTL', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      // First call
      await SponsorsService.getSponsors(testRequest)

      // Mock time passage beyond TTL (5 minutes)
      const originalNow = Date.now
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000)

      // Second call should fetch again
      await SponsorsService.getSponsors(testRequest)

      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Restore Date.now
      Date.now = originalNow
    })

    test('different org/hunt combinations use separate cache entries', async () => {
      const mockResponse1: SponsorsResponse = { layout: '1x1', items: [] }
      const mockResponse2: SponsorsResponse = { layout: '1x3', items: [] }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2
        } as Response)

      const request1: SponsorsRequest = { organizationId: 'org1', huntId: 'hunt1' }
      const request2: SponsorsRequest = { organizationId: 'org2', huntId: 'hunt2' }

      const result1 = await SponsorsService.getSponsors(request1)
      const result2 = await SponsorsService.getSponsors(request2)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result1.layout).toBe('1x1')
      expect(result2.layout).toBe('1x3')
    })

    test('clearCache removes all cached data', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      await SponsorsService.getSponsors(testRequest)

      SponsorsService.clearCache()

      await SponsorsService.getSponsors(testRequest)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('clearCacheFor removes specific cache entry', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const request1: SponsorsRequest = { organizationId: 'org1', huntId: 'hunt1' }
      const request2: SponsorsRequest = { organizationId: 'org2', huntId: 'hunt2' }

      await SponsorsService.getSponsors(request1)
      await SponsorsService.getSponsors(request2)

      SponsorsService.clearCacheFor('org1', 'hunt1')

      await SponsorsService.getSponsors(request1) // Should fetch again
      await SponsorsService.getSponsors(request2) // Should use cache

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Cache utility methods', () => {
    test('hasCachedSponsors returns false for uncached data', () => {
      expect(SponsorsService.hasCachedSponsors('test-org', 'test-hunt')).toBe(false)
    })

    test('hasCachedSponsors returns true for cached data with sponsors', async () => {
      const mockResponse: SponsorsResponse = {
        layout: '1x2',
        items: [
          {
            id: '1',
            companyId: 'test',
            companyName: 'Test',
            alt: 'Test',
            type: 'png',
            src: 'test.png',
            svg: null
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      await SponsorsService.getSponsors({ organizationId: 'test-org', huntId: 'test-hunt' })

      expect(SponsorsService.hasCachedSponsors('test-org', 'test-hunt')).toBe(true)
    })

    test('hasCachedSponsors returns false for cached empty data', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      await SponsorsService.getSponsors({ organizationId: 'test-org', huntId: 'test-hunt' })

      expect(SponsorsService.hasCachedSponsors('test-org', 'test-hunt')).toBe(false)
    })

    test('getCacheStats returns correct information', async () => {
      const mockResponse: SponsorsResponse = {
        layout: '1x3',
        items: [
          { id: '1', companyId: 'c1', companyName: 'C1', alt: 'C1', type: 'png', src: 'c1.png', svg: null },
          { id: '2', companyId: 'c2', companyName: 'C2', alt: 'C2', type: 'svg', src: null, svg: '<svg/>' }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      await SponsorsService.getSponsors({ organizationId: 'test-org', huntId: 'test-hunt' })

      const stats = SponsorsService.getCacheStats()

      expect(stats.size).toBe(1)
      expect(stats.entries[0].key).toBe('test-org-test-hunt')
      expect(stats.entries[0].itemCount).toBe(2)
      expect(stats.entries[0].layout).toBe('1x3')
      expect(stats.entries[0].expired).toBe(false)
    })
  })

  describe('Preloading', () => {
    test('preloadSponsors fetches data without errors', async () => {
      const mockResponse: SponsorsResponse = { layout: '1x2', items: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      await expect(
        SponsorsService.preloadSponsors({ organizationId: 'test-org', huntId: 'test-hunt' })
      ).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('preloadSponsors handles errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Preload failed'))

      await expect(
        SponsorsService.preloadSponsors({ organizationId: 'test-org', huntId: 'test-hunt' })
      ).resolves.not.toThrow()
    })
  })
})