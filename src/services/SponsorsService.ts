/**
 * SponsorsService
 * Client-side service for fetching sponsor data from the API
 * Includes caching, error handling, and type safety
 */

import { SponsorsRequest, SponsorsResponse, SponsorServiceCache } from '../types/sponsors'
import { createClient } from '@supabase/supabase-js'

export class SponsorsService {
  private static cache = new Map<string, SponsorServiceCache>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Fetch sponsor assets for a given organization and hunt
   */
  static async getSponsors(request: SponsorsRequest): Promise<SponsorsResponse> {
    const cacheKey = `${request.organizationId}-${request.huntId}`

    // Check cache first (disabled in development for fresh data)
    const cached = this.cache.get(cacheKey)
    const isDevelopment = import.meta.env.DEV
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL && !isDevelopment) {
      console.log('[SponsorsService] Returning cached sponsor data')
      return cached.data
    }

    if (isDevelopment && cached) {
      console.log('[SponsorsService] Cache found but disabled in development, fetching fresh data')
    }

    try {
      console.log('[SponsorsService] Fetching sponsors from API', request)

      // Try Express server first in development, then Netlify functions
      const isDevelopment = import.meta.env.DEV
      let apiUrl = isDevelopment
        ? `${import.meta.env.VITE_API_URL}/sponsors`
        : '/.netlify/functions/sponsors-get'

      console.log('[SponsorsService] Using API URL:', apiUrl)
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
        console.warn('[SponsorsService] Invalid or missing layout, using default')
        data.layout = '1x2'
      }

      // Validate sponsor items
      data.items = data.items.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('[SponsorsService] Filtering out invalid sponsor item:', item)
          return false
        }

        if (!item.id || !item.companyId || !item.companyName || !item.alt || !item.type) {
          console.warn('[SponsorsService] Filtering out incomplete sponsor item:', item)
          return false
        }

        if (!['svg', 'png', 'jpeg', 'jpg'].includes(item.type)) {
          console.warn('[SponsorsService] Filtering out sponsor with invalid type:', item)
          return false
        }

        // Must have either src or svg content
        if (!item.src && !item.svg) {
          console.warn('[SponsorsService] Filtering out sponsor with no content:', item)
          return false
        }

        return true
      })

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      console.log(`[SponsorsService] Fetched ${data.items.length} sponsors with ${data.layout} layout`)
      return data

    } catch (error) {
      console.error('[SponsorsService] Failed to fetch sponsors:', error)

      // In development, try direct Supabase access
      const isDevelopment = import.meta.env.DEV
      if (isDevelopment && import.meta.env.VITE_ENABLE_SPONSOR_CARD === 'true') {
        console.log('[SponsorsService] Trying direct Supabase access in development...')

        try {
          const supabaseResponse = await this.fetchSponsorsFromSupabase(request)
          if (supabaseResponse.items.length > 0) {
            return supabaseResponse
          }
        } catch (supabaseError) {
          console.warn('[SponsorsService] Direct Supabase access failed:', supabaseError)
        }

        // Fallback to mock data if Supabase also fails
        console.log('[SponsorsService] Using development mock data as fallback')
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

    console.log(`[SponsorsService] Found ${sponsors.length} sponsors from Supabase`)

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
    console.log('[SponsorsService] Cache cleared')
  }

  /**
   * Clear cache for specific organization/hunt
   */
  static clearCacheFor(organizationId: string, huntId: string): void {
    const cacheKey = `${organizationId}-${huntId}`
    this.cache.delete(cacheKey)
    console.log(`[SponsorsService] Cache cleared for ${cacheKey}`)
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
    console.log('[SponsorsService] Cache stats:', stats)
    return stats
  }

  /**
   * Preload sponsors for better performance
   * Useful when you know sponsors will be needed soon
   */
  static async preloadSponsors(request: SponsorsRequest): Promise<void> {
    try {
      await this.getSponsors(request)
      console.log(`[SponsorsService] Preloaded sponsors for ${request.organizationId}/${request.huntId}`)
    } catch (error) {
      console.warn(`[SponsorsService] Failed to preload sponsors for ${request.organizationId}/${request.huntId}:`, error)
    }
  }
}