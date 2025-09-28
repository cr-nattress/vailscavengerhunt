import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import progressService from '../services/ProgressService'
import type { StopProgress, ProgressData } from '../services/ProgressService'

interface ProgressQueryKey {
  orgId: string
  teamId: string
  huntId: string
}

type Progress = ProgressData

interface UpdateStopParams {
  stopId: string
  update: Partial<StopProgress>
  sessionId: string
}

/**
 * Hook to fetch progress with React Query caching
 */
export function useProgress({ orgId, teamId, huntId }: ProgressQueryKey) {
  return useQuery({
    queryKey: ['progress', orgId, teamId, huntId],
    queryFn: async () => {
      return await progressService.getProgress(orgId, teamId, huntId)
    },
    // STORY-021: Progress must always be fresh from DB
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't keep in cache after unmount
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch after network reconnection
    retry: 3,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds for real-time updates
    enabled: !!(orgId && teamId && huntId), // Only fetch if all IDs are present
  })
}

/**
 * Hook to update entire progress with optimistic updates
 */
export function useUpdateProgress({ orgId, teamId, huntId }: ProgressQueryKey) {
  const queryClient = useQueryClient()
  const queryKey = ['progress', orgId, teamId, huntId]

  return useMutation({
    mutationFn: async ({ progress, sessionId }: { progress: Progress; sessionId: string }) => {
      return await progressService.saveProgress(orgId, teamId, huntId, progress, sessionId)
    },
    onMutate: async ({ progress }) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey })

      // Save the previous value
      const previousProgress = queryClient.getQueryData(queryKey)

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: Progress | undefined) => ({
        ...old,
        ...progress,
        lastModifiedAt: new Date().toISOString()
      }))

      // Return the previous value for rollback
      return { previousProgress }
    },
    onError: (err, variables, context) => {
      // On error, rollback to the previous value
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKey, context.previousProgress)
      }
      console.error('Failed to update progress:', err)
    },
    onSuccess: (data) => {
      // Update cache with server response
      if (data?.progress) {
        queryClient.setQueryData(queryKey, data.progress)
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey })
    }
  })
}

/**
 * Hook to update a specific stop with optimistic updates
 */
export function useUpdateStop({ orgId, teamId, huntId }: ProgressQueryKey) {
  const queryClient = useQueryClient()
  const queryKey = ['progress', orgId, teamId, huntId]

  return useMutation({
    mutationFn: async ({ stopId, update, sessionId }: UpdateStopParams) => {
      return await progressService.updateStop(orgId, teamId, huntId, stopId, update, sessionId)
    },
    onMutate: async ({ stopId, update }) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey })

      // Save the previous value
      const previousProgress = queryClient.getQueryData(queryKey) as Progress

      // Optimistically update the specific stop
      queryClient.setQueryData(queryKey, (old: Progress | undefined) => {
        if (!old) return old
        return {
          ...old,
          [stopId]: {
            ...old[stopId],
            ...update,
            lastModifiedAt: new Date().toISOString()
          }
        }
      })

      // Return the previous value for rollback
      return { previousProgress }
    },
    onError: (err, variables, context) => {
      // On error, rollback to the previous value
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKey, context.previousProgress)
      }
      console.error('Failed to update stop:', err)
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey })
    }
  })
}

/**
 * Hook to fetch leaderboard data
 */
export function useLeaderboard(orgId: string, huntId: string) {
  return useQuery({
    queryKey: ['leaderboard', orgId, huntId],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/${orgId}/${huntId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    enabled: !!(orgId && huntId),
  })
}

/**
 * Hook to prefetch progress (useful for pre-loading data)
 */
export function usePrefetchProgress() {
  const queryClient = useQueryClient()

  return async ({ orgId, teamId, huntId }: ProgressQueryKey) => {
    await queryClient.prefetchQuery({
      queryKey: ['progress', orgId, teamId, huntId],
      queryFn: async () => {
        return await progressService.getProgress(orgId, teamId, huntId)
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}