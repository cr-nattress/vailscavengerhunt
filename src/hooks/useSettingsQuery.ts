import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ServerSettingsService } from '../services/ServerSettingsService'

interface SettingsQueryKey {
  orgId: string
  teamId: string
  huntId: string
}

interface Settings {
  locationName: string
  teamName: string
  sessionId: string
  eventName: string
  organizationId?: string
  huntId?: string
  lastModifiedBy?: string
  lastModifiedAt?: string
}

/**
 * Hook to fetch settings with React Query caching
 */
export function useSettings({ orgId, teamId, huntId }: SettingsQueryKey) {
  return useQuery({
    queryKey: ['settings', orgId, teamId, huntId],
    queryFn: async () => {
      const service = new ServerSettingsService()
      return await service.getSettings(orgId, teamId, huntId)
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
    enabled: !!(orgId && teamId && huntId), // Only fetch if all IDs are present
  })
}

/**
 * Hook to update settings with optimistic updates
 */
export function useUpdateSettings({ orgId, teamId, huntId }: SettingsQueryKey) {
  const queryClient = useQueryClient()
  const queryKey = ['settings', orgId, teamId, huntId]

  return useMutation({
    mutationFn: async (settings: Settings) => {
      const service = new ServerSettingsService()
      return await service.saveSettings(orgId, teamId, huntId, settings, settings.sessionId)
    },
    onMutate: async (newSettings) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey })

      // Save the previous value
      const previousSettings = queryClient.getQueryData(queryKey)

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: Settings | undefined) => ({
        ...old,
        ...newSettings,
        lastModifiedAt: new Date().toISOString()
      }))

      // Return the previous value for rollback
      return { previousSettings }
    },
    onError: (err, newSettings, context) => {
      // On error, rollback to the previous value
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKey, context.previousSettings)
      }
      console.error('Failed to update settings:', err)
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey })
    }
  })
}

/**
 * Hook to prefetch settings (useful for pre-loading data)
 */
export function usePrefetchSettings() {
  const queryClient = useQueryClient()

  return async ({ orgId, teamId, huntId }: SettingsQueryKey) => {
    await queryClient.prefetchQuery({
      queryKey: ['settings', orgId, teamId, huntId],
      queryFn: async () => {
        const service = new ServerSettingsService()
        return await service.getSettings(orgId, teamId, huntId)
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}