/**
 * useActiveData Hook
 * Fetches all active hunt data in a single request
 * Replaces multiple separate API calls with one consolidated call
 */

import { useState, useEffect, useCallback } from 'react'
import ConsolidatedDataService from '../services/ConsolidatedDataService'
import { ConsolidatedActiveResponse, UseActiveDataResult } from '../types/consolidated'

export function useActiveData(
  orgId: string | undefined,
  teamId: string | undefined,
  huntId: string | undefined
): UseActiveDataResult {
  const [data, setData] = useState<ConsolidatedActiveResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    // Skip if missing required params
    if (!orgId || !teamId || !huntId) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useActiveData] Fetching consolidated data...')
      const response = await ConsolidatedDataService.getActiveData(orgId, teamId, huntId)

      setData(response)

      console.log('[useActiveData] Data loaded successfully:', {
        hasSettings: !!response.settings,
        progressCount: Object.keys(response.progress || {}).length,
        sponsorCount: response.sponsors?.items?.length || 0,
        configKeys: Object.keys(response.config || {}).length
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      console.error('[useActiveData] Error fetching data:', err)
      setError(errorMessage)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, teamId, huntId])

  // Fetch data when parameters change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}