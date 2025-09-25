/**
 * SponsorsService
 * Client-side service for fetching sponsor data from the API
 * Includes caching, error handling, and type safety
 */

import { SponsorsRequest, SponsorsResponse, SponsorServiceCache } from '../types/sponsors'
import { createClient } from '@supabase/supabase-js'
import { createLegacyLogger } from '../logging/client'

export class SponsorsService {
  private static cache = new Map<string, SponsorServiceCache>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private static logger = createLegacyLogger('sponsors-service')

  /**
   * Fetch sponsor assets for a given organization and hunt
   */
  static async getSponsors(request: SponsorsRequest): Promise<SponsorsResponse> {
    const cacheKey = `${request.organizationId}-${request.huntId}`

    // Check cache first (disabled in development for fresh data)
    const cached = this.cache.get(cacheKey)
    const isDevelopment = import.meta.env.DEV
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL && !isDevelopment) {
      this.logger.info('SponsorsService', 'get-sponsors-cached', {
        message: 'Returning cached sponsor data',
        cacheKey
      })
      return cached.data
    }

    if (isDevelopment && cached) {
      this.logger.info('SponsorsService', 'get-sponsors-dev-bypass', {
        message: 'Cache found but disabled in development, fetching fresh data'
      })
    }

    try {
      this.logger.info('SponsorsService', 'get-sponsors-start', {
        message: 'Fetching sponsors from API',
        request
      })

      // Try Express server first in development, then Netlify functions
      const isDevelopment = import.meta.env.DEV
      let apiUrl = isDevelopment
        ? `${import.meta.env.VITE_API_URL}/sponsors`
        : '/.netlify/functions/sponsors-get'

      this.logger.info('SponsorsService', 'get-sponsors-url', {
        message: 'Using API URL',
        apiUrl,
        isDevelopment
      })
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data: SponsorsResponse = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format: expected object')
      }

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid response format: missing items array')
      }

      if (!data.layout || !['1x1', '1x2', '1x3'].includes(data.layout)) {
        this.logger.warn('SponsorsService', 'invalid-layout', {
          message: 'Invalid or missing layout, using default',
          originalLayout: data.layout
        })
        data.layout = '1x2'
      }

      // Validate sponsor items
      data.items = data.items.filter(item => {
        if (!item || typeof item !== 'object') {
          this.logger.warn('SponsorsService', 'filter-invalid-item', {
            message: 'Filtering out invalid sponsor item',
            item
          })
          return false
        }

        if (!item.id || !item.companyId || !item.companyName || !item.alt || !item.type) {
          this.logger.warn('SponsorsService', 'filter-incomplete-item', {
            message: 'Filtering out incomplete sponsor item',
            item
          })
          return false
        }

        if (!['svg', 'png', 'jpeg', 'jpg'].includes(item.type)) {
          this.logger.warn('SponsorsService', 'filter-invalid-type', {
            message: 'Filtering out sponsor with invalid type',
            item
          })
          return false
        }

        // Must have either src or svg content
        if (!item.src && !item.svg) {
          this.logger.warn('SponsorsService', 'filter-no-content', {
            message: 'Filtering out sponsor with no content',
            item
          })
          return false
        }

        return true
      })

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      this.logger.info('SponsorsService', 'get-sponsors-success', {
        message: `Fetched ${data.items.length} sponsors with ${data.layout} layout`,
        count: data.items.length,
        layout: data.layout
      })
      return data

    } catch (error) {
      this.logger.error('SponsorsService', 'get-sponsors-error', error as Error, {
        message: 'Failed to fetch sponsors'
      })

      // In development, try direct Supabase access
      const isDevelopment = import.meta.env.DEV
      if (isDevelopment && import.meta.env.VITE_ENABLE_SPONSOR_CARD === 'true') {
        this.logger.info('SponsorsService', 'try-supabase-fallback', {
          message: 'Trying direct Supabase access in development'
        })

        try {
          const supabaseResponse = await this.fetchSponsorsFromSupabase(request)
          if (supabaseResponse.items.length > 0) {
            return supabaseResponse
          }
        } catch (supabaseError) {
          this.logger.warn('SponsorsService', 'supabase-fallback-error', {
            message: 'Direct Supabase access failed',
            error: supabaseError
          })
        }

        // Fallback to mock data if Supabase also fails
        this.logger.info('SponsorsService', 'use-mock-data', {
          message: 'Using development mock data as fallback'
        })
        const mockResponse: SponsorsResponse = {
          layout: '1x2',
          items: [
            {
              id: 'dev-sponsor-1',
              companyId: 'vail-resorts',
              companyName: 'Vail Resorts',
              alt: 'Vail Resorts logo',
              type: 'svg',
              src: null,
              svg: '<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="60" fill="#1e3a8a" rx="8"/><text x="100" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Vail Resorts</text></svg>'
            },
            {
              id: 'dev-sponsor-2',
              companyId: 'burton',
              companyName: 'Burton Snowboards',
              alt: 'Burton Snowboards logo',
              type: 'svg',
              src: null,
              svg: '<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="60" fill="#dc2626" rx="8"/><text x="100" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Burton</text></svg>'
            }
          ]
        }

        // Cache the mock response
        this.cache.set(cacheKey, {
          data: mockResponse,
          timestamp: Date.now()
        })

        return mockResponse
      }

      // Return empty response on error to prevent UI breakage
      const fallbackResponse: SponsorsResponse = {
        layout: '1x2',
        items: []
      }

      // Cache the error result briefly to avoid repeated failed requests
      this.cache.set(cacheKey, {
        data: fallbackResponse,
        timestamp: Date.now()
      })

      return fallbackResponse
    }
  }

  /**
   * Development method: Fetch sponsors directly from Supabase
   * Used when Netlify functions are not available in dev mode
   */
  private static async fetchSponsorsFromSupabase(request: SponsorsRequest): Promise<SponsorsResponse> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Query sponsor assets
    const { data: sponsors, error } = await supabase
      .from('sponsor_assets')
      .select('*')
      .eq('organization_id', request.organizationId)
      .eq('hunt_id', request.huntId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`)
    }

    if (!sponsors || sponsors.length === 0) {
      return { layout: '1x2', items: [] }
    }

    this.logger.info('SponsorsService', 'supabase-sponsors-found', {
      message: `Found ${sponsors.length} sponsors from Supabase`,
      count: sponsors.length
    })

    // Transform data to match API response format
    const items = sponsors.map(sponsor => ({
      id: sponsor.id,
      companyId: sponsor.company_id,
      companyName: sponsor.company_name,
      alt: sponsor.image_alt,
      type: sponsor.image_type,
      src: null, // No signed URLs in dev mode for now
      svg: sponsor.svg_text
    }))

    return {
      layout: '1x2', // Default layout for dev
      items
    }
  }

  /**
   * Clear the sponsors cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear()
    this.logger.info('SponsorsService', 'cache-cleared', {
      message: 'Cache cleared'
    })
  }

  /**
   * Clear cache for specific organization/hunt
   */
  static clearCacheFor(organizationId: string, huntId: string): void {
    const cacheKey = `${organizationId}-${huntId}`
    this.cache.delete(cacheKey)
    this.logger.info('SponsorsService', 'cache-cleared-for', {
      message: `Cache cleared for ${cacheKey}`,
      cacheKey
    })
  }

  /**
   * Check if sponsors exist for the given org/hunt without making API call
   */
  static hasCachedSponsors(organizationId: string, huntId: string): boolean {
    const cacheKey = `${organizationId}-${huntId}`
    const cached = this.cache.get(cacheKey)
    return !!(cached && cached.data.items.length > 0)
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats() {
    const stats = {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        itemCount: value.data.items.length,
        layout: value.data.layout,
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.CACHE_TTL
      }))
    }
    this.logger.info('SponsorsService', 'cache-stats', {
      message: 'Cache stats',
      stats
    })
    return stats
  }

  /**
   * Preload sponsors for better performance
   * Useful when you know sponsors will be needed soon
   */
  static async preloadSponsors(request: SponsorsRequest): Promise<void> {
    try {
      await this.getSponsors(request)
      this.logger.info('SponsorsService', 'preload-success', {
        message: `Preloaded sponsors for ${request.organizationId}/${request.huntId}`,
        organizationId: request.organizationId,
        huntId: request.huntId
      })
    } catch (error) {
      this.logger.warn('SponsorsService', 'preload-error', {
        message: `Failed to preload sponsors for ${request.organizationId}/${request.huntId}`,
        organizationId: request.organizationId,
        huntId: request.huntId,
        error
      })
    }
  }
}