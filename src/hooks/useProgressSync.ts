/**
 * Custom hook for syncing progress from server data
 * Extracted from ActiveView to improve separation of concerns
 */

import { useEffect } from 'react'

interface ProgressItem {
  title: string
  description: string
  done: boolean
  completedAt?: string | null
  photo?: string | null
  revealedHints?: number
  notes?: string | null
}

interface UseProgressSyncOptions {
  serverProgress: Record<string, ProgressItem> | undefined
  seedProgress: (progress: Record<string, any>) => void
}

/**
 * Syncs progress from server data
 * - Loads progress when server data is available
 * - Resets revealedHints to 0 on page refresh (hints hidden by default)
 * - Uses seedProgress to avoid unnecessary server saves on load
 *
 * @param options - Configuration options
 *
 * @example
 * useProgressSync({
 *   serverProgress: activeData?.progress,
 *   seedProgress
 * })
 */
export function useProgressSync({
  serverProgress,
  seedProgress
}: UseProgressSyncOptions) {
  useEffect(() => {
    if (!serverProgress) {
      return
    }

    if (Object.keys(serverProgress).length > 0) {
      // Reset revealedHints to 0 on page refresh to hide hints
      const progressWithResetHints: Record<string, any> = {}

      for (const [stopId, stopProgress] of Object.entries(serverProgress)) {
        progressWithResetHints[stopId] = {
          ...stopProgress,
          revealedHints: 0 // Always start with hints hidden
        }
      }

      // Use seedProgress instead of setProgress to avoid unnecessary server save on page load
      seedProgress(progressWithResetHints)

      console.log(`✅ Loaded ${Object.keys(progressWithResetHints).length} completed stops from server`)
    } else {
      // Initialize with empty progress if no progress exists yet
      seedProgress({})
      console.log('✅ Initialized empty progress')
    }
  }, [serverProgress, seedProgress])
}
