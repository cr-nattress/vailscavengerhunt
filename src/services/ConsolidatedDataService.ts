/**
 * ConsolidatedDataService - Fetches multiple data types in a single request
 * Reduces API calls and improves performance
 */

import { ConsolidatedActiveResponse } from '../types/consolidated'
import * as Sentry from '@sentry/react'

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
        const errorMessage = `Failed to fetch active data: ${response.status} ${response.statusText}`

        // Report to Sentry for 500 errors
        if (response.status >= 500) {
          Sentry.captureMessage(errorMessage, {
            level: 'error',
            tags: {
              component: 'ConsolidatedDataService',
              http_status: response.status,
              endpoint: 'consolidated_active'
            },
            extra: {
              orgId,
              teamId,
              huntId,
              url: `/api/consolidated/active/${orgId}/${teamId}/${huntId}`
            }
          })
        }

        throw new Error(errorMessage)
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
        sponsorCount: data.sponsors?.items?.length || 0,
        locationCount: data.locations?.locations?.length || 0
      })

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[ConsolidatedDataService] Failed to fetch active data:', errorMessage)

      // Report non-HTTP errors to Sentry (HTTP errors already reported above)
      if (error instanceof Error && !error.message.includes('Failed to fetch active data:')) {
        Sentry.captureException(error, {
          tags: {
            component: 'ConsolidatedDataService',
            error_type: 'network_or_parse'
          },
          extra: {
            orgId,
            teamId,
            huntId
          }
        })
      }

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

export { ConsolidatedDataService }
export default ConsolidatedDataService