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
  // STORY-020: Removed cache for locations/progress to ensure DB is single source of truth
  // Only keeping transient cache in React Query, not here
  private static cache = new Map<string, CachedData>()
  private static readonly CACHE_TTL = 0 // Disabled caching per DB Source of Truth epic

  /**
   * Fetch all active hunt data in a single request
   */
  static async getActiveData(
    orgId: string,
    teamId: string,
    huntId: string
  ): Promise<ConsolidatedActiveResponse> {
    const cacheKey = `${orgId}/${teamId}/${huntId}`

    // STORY-020: Cache disabled to ensure fresh data from DB
    // Cache check removed per DB Source of Truth requirements

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

      // STORY-020: Response caching disabled - data always fresh from DB
      // React Query handles any necessary caching at the component level

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