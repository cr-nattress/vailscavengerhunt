/**
 * useActiveDataQuery Hook
 * STORY-021: React Query version of useActiveData with always-fresh configuration
 * Fetches all active hunt data (locations, progress, settings) with no-cache policy
 */

import { useQuery } from '@tanstack/react-query'
import ConsolidatedDataService from '../services/ConsolidatedDataService'
import { ConsolidatedActiveResponse } from '../types/consolidated'

interface ActiveDataParams {
  orgId: string | undefined
  teamId: string | undefined
  huntId: string | undefined
}

export function useActiveDataQuery({ orgId, teamId, huntId }: ActiveDataParams) {
  return useQuery<ConsolidatedActiveResponse>({
    queryKey: ['active-data', orgId, teamId, huntId],
    queryFn: async () => {
      if (!orgId || !teamId || !huntId) {
        throw new Error('Missing required parameters')
      }
      return await ConsolidatedDataService.getActiveData(orgId, teamId, huntId)
    },
    // STORY-021: Always fresh configuration for locations and progress
    staleTime: 0, // Data is immediately stale, forcing refetch
    gcTime: 0, // Don't keep in cache after unmount
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch after network reconnection
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!(orgId && teamId && huntId), // Only fetch if all IDs are present
  })
}

/**
 * Hook for locations-only queries with fresh data
 */
export function useLocationsQuery({ orgId, teamId, huntId }: ActiveDataParams) {
  return useQuery({
    queryKey: ['locations', orgId, huntId],
    queryFn: async () => {
      if (!orgId || !teamId || !huntId) {
        throw new Error('Missing required parameters')
      }
      const data = await ConsolidatedDataService.getActiveData(orgId, teamId, huntId)
      return data.locations
    },
    // STORY-021: Locations must always be fresh
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!(orgId && teamId && huntId),
  })
}

/**
 * Hook for progress-only queries with fresh data
 */
export function useProgressDataQuery({ orgId, teamId, huntId }: ActiveDataParams) {
  return useQuery({
    queryKey: ['progress-data', orgId, teamId, huntId],
    queryFn: async () => {
      if (!orgId || !teamId || !huntId) {
        throw new Error('Missing required parameters')
      }
      const data = await ConsolidatedDataService.getActiveData(orgId, teamId, huntId)
      return data.progress
    },
    // STORY-021: Progress must always be fresh
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    enabled: !!(orgId && teamId && huntId),
  })
}