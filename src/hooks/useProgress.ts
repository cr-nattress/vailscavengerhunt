import { useState, useEffect, useMemo } from 'react'

const STORAGE_KEY = 'vail-love-hunt-progress'

/**
 * useProgress
 * Manages per-stop completion and notes with localStorage persistence.
 * Returns { progress, setProgress, completeCount, percent }.
 */
export function useProgress(stops: any[]) {
  const [progress, setProgress] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  
  useEffect(() => {
    try {
      // Persist whenever progress changes. If in private mode or blocked, this might throw.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch (error: any) {
      // Handle quota exceeded or other localStorage errors
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded - clearing old data and trying again')
        // Try to clear existing data and save again
        localStorage.removeItem(STORAGE_KEY)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
        } catch {
          console.error('Failed to save progress even after clearing storage')
        }
      }
    }
  }, [progress])
  
  // Derived values for the progress UI
  const completeCount = useMemo(() => stops.reduce((acc, s) => acc + ((progress[s.id]?.done) ? 1 : 0), 0), [progress, stops])
  const percent = stops.length === 0 ? 0 : Math.round((completeCount / stops.length) * 100)
  
  return { progress, setProgress, completeCount, percent }
}