import { useMemo, useCallback } from 'react'
import useSWR from 'swr'
import progressService from '../services/ProgressService'
import { type ProgressData } from '../types/schemas'
import { useAppStore } from '../store/appStore'

/**
 * useProgress
 * Manages per-stop completion and notes with server persistence.
 * Progress is shared across all team members.
 * Returns { progress, setProgress, completeCount, percent, isLoading, error }.
 */
export function useProgress(stops: any[]) {
  // Get org/team/hunt context from app store
  const { organizationId, huntId, teamName, teamId, sessionId } = useAppStore()

  // Use teamId if available (from team verification), otherwise fall back to teamName
  const effectiveTeamId = teamId || teamName

  // Construct the SWR key - unique per team's hunt
  const swrKey = organizationId && effectiveTeamId && huntId
    ? `/api/progress/${organizationId}/${effectiveTeamId}/${huntId}`
    : null

  // Fetch progress from server with SWR
  const { data: progress = {}, error, isLoading, mutate: mutateProgress } = useSWR<ProgressData>(
    swrKey,
    async () => {
      if (!organizationId || !effectiveTeamId || !huntId) {
        console.warn('[useProgress] Missing org/team/hunt context')
        return {}
      }
      return await progressService.getProgress(organizationId, effectiveTeamId, huntId)
    },
    {
      // Disable automatic revalidation/polling. We'll refresh explicitly after writes.
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshInterval: 0,
      fallbackData: {}, // Use empty object while loading
    }
  )

  // Update progress with optimistic updates
  const setProgress = useCallback(async (updater: ((prev: ProgressData) => ProgressData) | ProgressData) => {
    if (!organizationId || !effectiveTeamId || !huntId) {
      console.error('[useProgress] Cannot update - missing context')
      return
    }

    // Calculate new progress
    const newProgress = typeof updater === 'function' ? updater(progress) : updater

    // Optimistic update - update UI immediately
    await mutateProgress(newProgress, {
      optimisticData: newProgress,
      rollbackOnError: true,
      revalidate: false, // Don't revalidate immediately
    })

    try {
      // Save to server (sessionId for audit only)
      const success = await progressService.saveProgress(
        organizationId,
        effectiveTeamId,
        huntId,
        newProgress,
        sessionId
      )

      if (!success) {
        console.error('[useProgress] Failed to save progress to server')
        // Rollback will happen automatically due to rollbackOnError
      } else {
        // Revalidate after successful save to get any concurrent team updates
        mutateProgress()
      }
    } catch (err) {
      // Rollback will happen automatically
    }
  }, [progress, mutateProgress, organizationId, teamName, huntId, sessionId])

  // Seed progress locally without persisting to server
  // Useful for initializing from consolidated endpoint data
  const seedProgress = useCallback(async (newProgress: ProgressData) => {
    await mutateProgress(newProgress, {
      optimisticData: newProgress,
      rollbackOnError: false,
      revalidate: false
    })
  }, [mutateProgress])
  
  // Derived values for the progress UI
  const completeCount = useMemo(
    () => stops.reduce((acc, s) => {
      const val = (progress as ProgressData)[s.id]
      const isDone = val && typeof val === 'object' && (val as any).done === true
      return acc + (isDone ? 1 : 0)
    }, 0),
    [progress, stops]
  )
  const percent = stops.length === 0 ? 0 : Math.round((completeCount / stops.length) * 100)

  return {
    progress,
    setProgress,
    seedProgress,
    completeCount,
    percent,
    isLoading,
    error,
    refetch: () => mutateProgress()
  }
}