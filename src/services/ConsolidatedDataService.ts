/**
 * ConsolidatedDataService - Fetches multiple data types in a single request
 * Reduces API calls and improves performance
 */

import { ConsolidatedActiveResponse } from '../types/consolidated'

interface CachedData {
  data: ConsolidatedActiveResponse
  timestamp: number
}

class ConsolidatedDataService {
  private static cache = new Map<string, CachedData>()
  private static readonly CACHE_TTL = 30 * 1000 // 30 seconds cache

  /**
   * Fetch all active hunt data in a single request
   */
  static async getActiveData(
    orgId: string,
    teamId: string,
    huntId: string
  ): Promise<ConsolidatedActiveResponse> {
    const cacheKey = `${orgId}/${teamId}/${huntId}`

    // Check cache in development (short TTL)
    if (import.meta.env.DEV) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('[ConsolidatedDataService] Returning cached data')
        return cached.data
      }
    }

    try {
      console.log(`[ConsolidatedDataService] Fetching active data for ${orgId}/${teamId}/${huntId}`)

      // Get team lock token if available
      const lockToken = localStorage.getItem('team_lock_token')
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      }

      if (lockToken) {
        headers['X-Team-Lock'] = lockToken
      }

      const response = await fetch(`/api/consolidated/active/${orgId}/${teamId}/${huntId}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch active data: ${response.statusText}`)
      }

      const data: ConsolidatedActiveResponse = await response.json()

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      console.log('[ConsolidatedDataService] Active data fetched successfully:', {
        hasSettings: !!data.settings,
        progressCount: Object.keys(data.progress || {}).length,
        sponsorCount: data.sponsors?.items?.length || 0
      })

      return data
    } catch (error) {
      console.error('[ConsolidatedDataService] Failed to fetch active data:', error)
      throw error
    }
  }

  /**
   * Clear cache for a specific team
   */
  static clearCache(orgId?: string, teamId?: string, huntId?: string) {
    if (orgId && teamId && huntId) {
      const cacheKey = `${orgId}/${teamId}/${huntId}`
      this.cache.delete(cacheKey)
    } else {
      this.cache.clear()
    }
  }
}

export default ConsolidatedDataService