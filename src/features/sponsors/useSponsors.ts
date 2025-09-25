/**
 * useSponsors Hook
 * Custom React hook for fetching and managing sponsor data
 * Handles loading states, error handling, and caching
 */

import { useState, useEffect, useMemo } from 'react'
import { SponsorsResponse, UseSponsorsResult } from '../../types/sponsors'
import { SponsorsService } from '../../services/SponsorsService'
import { useAppStore } from '../../store/appStore'

export const useSponsors = (): UseSponsorsResult => {
  const [sponsors, setSponsors] = useState<SponsorsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get organization and hunt info from app store
  const { organizationId, huntId, teamName } = useAppStore()

  // Check feature flag - ALWAYS ENABLED
  const featureEnabled = true // Always enable sponsors regardless of environment variable

  // Create stable request object
  const request = useMemo(() => {
    if (!organizationId || !huntId || !featureEnabled) {
      return null
    }

    return {
      organizationId,
      huntId,
      teamName
    }
  }, [organizationId, huntId, teamName, featureEnabled])

  const fetchSponsors = async () => {
    if (!request) {
      setSponsors(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useSponsors] Fetching sponsors...', request)
      const data = await SponsorsService.getSponsors(request)
      setSponsors(data)

      if (data.items.length > 0) {
        console.log(`[useSponsors] Loaded ${data.items.length} sponsors with ${data.layout} layout`)
      } else {
        console.log('[useSponsors] No sponsors found for this event')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sponsors'
      console.error('[useSponsors] Error fetching sponsors:', err)
      setError(errorMessage)
      setSponsors({ layout: '1x2', items: [] }) // Fallback to empty
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch sponsors when request parameters change
  useEffect(() => {
    fetchSponsors()
  }, [request])

  // Log feature flag status for debugging
  useEffect(() => {
    console.log('[useSponsors] Sponsor card feature is ENABLED')
  }, [])

  return {
    sponsors,
    isLoading,
    error,
    refetch: fetchSponsors
  }
}