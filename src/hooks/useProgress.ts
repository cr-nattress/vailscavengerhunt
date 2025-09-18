import { useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import progressService, { ProgressData, StopProgress } from '../services/ProgressService'
import { useAppStore } from '../store/appStore'

/**
 * useProgress
 * Manages per-stop completion and notes with server persistence.
 * Progress is shared across all team members.
 * Returns { progress, setProgress, completeCount, percent, isLoading, error }.
 */
export function useProgress(stops: any[]) {
  // Get org/team/hunt context from app store
  const { organizationId, huntId, teamName, sessionId } = useAppStore()

  // Construct the SWR key - unique per team's hunt
  const swrKey = organizationId && teamName && huntId
    ? `/api/progress/${organizationId}/${teamName}/${huntId}`
    : null

  // Fetch progress from server with SWR
  const { data: progress = {}, error, isLoading, mutate: mutateProgress } = useSWR<ProgressData>(
    swrKey,
    async () => {
      if (!organizationId || !teamName || !huntId) {
        console.warn('[useProgress] Missing org/team/hunt context')
        return {}
      }
      return await progressService.getProgress(organizationId, teamName, huntId)
    },
    {
      revalidateOnFocus: true, // Refresh when tab gains focus (see team updates)
      revalidateOnReconnect: true, // Refresh when network reconnects
      refreshInterval: 30000, // Poll every 30 seconds for team updates
      fallbackData: {}, // Use empty object while loading
    }
  )

  // Update progress with optimistic updates
  const setProgress = useCallback(async (updater: ((prev: ProgressData) => ProgressData) | ProgressData) => {
    if (!organizationId || !teamName || !huntId) {
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
        teamName,
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
      console.error('[useProgress] Error saving progress:', err)
      // Rollback will happen automatically
    }
  }, [progress, mutateProgress, organizationId, teamName, huntId, sessionId])
  
  // Derived values for the progress UI
  const completeCount = useMemo(
    () => stops.reduce((acc, s) => acc + ((progress[s.id]?.done) ? 1 : 0), 0),
    [progress, stops]
  )
  const percent = stops.length === 0 ? 0 : Math.round((completeCount / stops.length) * 100)

  return {
    progress,
    setProgress,
    completeCount,
    percent,
    isLoading,
    error
  }
}