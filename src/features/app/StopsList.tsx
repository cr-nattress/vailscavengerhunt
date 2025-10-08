import React from 'react'
import StopCard from './StopCard'

interface StopsListProps {
  stops: any[]
  progress: any
  transitioningStops: Set<string>
  expandedStops: Record<string, boolean>
  onToggleExpanded: (stopId: string) => void
  uploadingStops: Set<string>
  onPhotoUpload: (stopId: string, file: File) => Promise<void>
  setProgress: (updateFn: any) => void
  seedProgress: (updateFn: any) => void
  previewUrls: Record<string, string>
  savingStops: Set<string>
  onNextStep?: (stopId: string) => void
  isPrePopulatedHunt?: boolean
}

export default function StopsList({
  stops,
  progress,
  transitioningStops,
  expandedStops,
  onToggleExpanded,
  uploadingStops,
  onPhotoUpload,
  setProgress,
  seedProgress,
  previewUrls,
  savingStops,
  onNextStep,
  isPrePopulatedHunt = false
}: StopsListProps) {
  // Get completed stops sorted by completion timestamp (earliest first)
  const completedStops = stops
    .filter(stop => progress[stop.id]?.done && !transitioningStops.has(stop.id))
    .sort((a, b) => {
      const timeA = progress[a.id]?.completedAt || '0'
      const timeB = progress[b.id]?.completedAt || '0'
      return timeA.localeCompare(timeB)
    })
  
  const completedCount = completedStops.length
  
  // Create a completion order lookup
  const completionOrder: Record<string, number> = {}
  completedStops.forEach((stop, index) => {
    completionOrder[stop.id] = index + 1
  })
  
  // Assign numbers based on completion status and order
  const stopsWithNumbers = [...stops].map((stop) => {
    const isCompleted = progress[stop.id]?.done
    const isTransitioning = transitioningStops.has(stop.id)
    
    if (isCompleted && !isTransitioning) {
      // For completed stops, use their actual completion order
      return {
        ...stop,
        originalNumber: completionOrder[stop.id] || 1
      }
    } else {
      // For transitioning or current uncompleted stop, show as next in sequence
      return {
        ...stop,
        originalNumber: completedCount + 1
      }
    }
  })
  
  // Find the first incomplete stop (excluding transitioning ones)
  // Only show if there are no transitioning stops (wait for completion transition to finish)
  const firstIncomplete = stopsWithNumbers.find(stop => !(progress[stop.id]?.done))

  // Get transitioning stops (keep them in their current position)
  const transitioningStopsArray = stopsWithNumbers
    .filter(stop => transitioningStops.has(stop.id))

  // Show ONLY transitioning stop during transition, or first incomplete stop
  // For pre-populated hunts, skip showing transitioning stop (go directly to next)
  const activeStops = []
  if (transitioningStopsArray.length > 0 && !isPrePopulatedHunt) {
    // During transition, only show the transitioning stop (unless pre-populated mode)
    activeStops.push(...transitioningStopsArray)
  } else if (firstIncomplete) {
    // After transition completes (or immediately in pre-populated mode), show next incomplete stop
    activeStops.push(firstIncomplete)
  }

  const revealNextHint = (stopId: string) => {
    const state = progress[stopId] || { done: false, notes: '', photo: null, revealedHints: 0 }
    const stop = stops.find(s => s.id === stopId)
    if (stop && stop.hints && state.revealedHints < stop.hints.length) {
      // Use seedProgress for local-only state (hints don't need server save)
      seedProgress({
        ...progress,
        [stopId]: { ...state, revealedHints: state.revealedHints + 1 }
      })
    }
  }

  return (
    <>
      {/* Render active stops (current task) */}
      {activeStops.map((s, i) => (
        <StopCard
          key={s.id}
          stop={s}
          progress={progress}
          onUpload={onPhotoUpload}
          onToggleExpanded={onToggleExpanded}
          expanded={expandedStops[s.id] || false}
          uploadingStops={uploadingStops}
          transitioningStops={transitioningStops}
          revealNextHint={() => revealNextHint(s.id)}
          index={i}
          previewImage={previewUrls[s.id]}
          isSaving={savingStops.has(s.id)}
          onNextStep={onNextStep}
        />
      ))}

      {/* Completed stops are now shown in the History tab */}
    </>
  )
}