import { useState, useMemo, useCallback } from 'react'
import progressService from '../services/ProgressService'
import { type ProgressData } from '../types/schemas'
import { useAppStore } from '../store/appStore'

/**
 * useProgress
 * Manages per-stop completion and notes with server persistence.
 * Progress is shared across all team members.
 * 
 * NOTE: This hook no longer fetches progress data. Progress should be initialized
 * via seedProgress() with data from consolidated/active endpoint.
 * 
 * Returns { progress, setProgress, seedProgress, completeCount, percent }.
 */
export function useProgress(stops: any[]) {
  // Get org/team/hunt context from app store
  const { organizationId, huntId, teamName, teamId, sessionId } = useAppStore()

  // Use teamId if available (from team verification), otherwise fall back to teamName
  const effectiveTeamId = teamId || teamName

  // Local state for progress (initialized from consolidated/active)
  const [progress, setProgressState] = useState<ProgressData>({})

  // Update progress with optimistic updates
  const setProgress = useCallback(async (updater: ((prev: ProgressData) => ProgressData) | ProgressData) => {
    if (!organizationId || !effectiveTeamId || !huntId) {
      console.error('[useProgress] Cannot update - missing context')
      return
    }

    // Calculate new progress
    const newProgress = typeof updater === 'function' ? updater(progress) : updater

    // Optimistic update - update UI immediately
    setProgressState(newProgress)

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
        // Rollback on error
        setProgressState(progress)
      }
    } catch (err) {
      console.error('[useProgress] Error saving progress:', err)
      // Rollback on error
      setProgressState(progress)
    }
  }, [progress, organizationId, effectiveTeamId, huntId, sessionId])

  // Seed progress locally without persisting to server
  // Useful for initializing from consolidated endpoint data
  const seedProgress = useCallback((newProgress: ProgressData) => {
    setProgressState(newProgress)
  }, [])
  
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
    percent
  }
}