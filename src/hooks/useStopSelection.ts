/**
 * Custom hook for selecting and shuffling hunt stops
 * Extracted from ActiveView to improve testability and reusability
 */

import { useState, useEffect } from 'react'

interface Location {
  id: string
  title: string
  description?: string
  [key: string]: any
}

interface UseStopSelectionOptions {
  locations: Location[] | undefined
  locationName: string
  stopCount?: number | 'all'
}

/**
 * Fisher-Yates shuffle algorithm
 * @param array - Array to shuffle
 * @returns Shuffled array (mutates original)
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

/**
 * Select stops from available locations
 * - Shuffles locations randomly
 * - Selects appropriate number based on hunt type
 * - BHHS: All stops, Others: 5 stops max
 *
 * @param options - Configuration options
 * @returns Selected stops array
 *
 * @example
 * const stops = useStopSelection({
 *   locations: activeData?.locations?.locations,
 *   locationName: 'BHHS'
 * })
 */
export function useStopSelection({
  locations,
  locationName,
  stopCount
}: UseStopSelectionOptions) {
  const [stops, setStops] = useState<Location[]>([])

  useEffect(() => {
    if (!locations || locations.length === 0) {
      setStops([])
      return
    }

    console.log(`🗺️ Loaded ${locations.length} locations from API`)

    // Create copy to avoid mutating original
    const allLocations = [...locations]

    // Shuffle using Fisher-Yates
    shuffleArray(allLocations)

    // Determine how many stops to select
    let count: number

    if (stopCount === 'all') {
      count = allLocations.length
    } else if (typeof stopCount === 'number') {
      count = Math.min(stopCount, allLocations.length)
    } else {
      // Default behavior: BHHS gets all, others get max 5
      count = locationName === 'BHHS'
        ? allLocations.length
        : Math.min(5, allLocations.length)
    }

    const selectedStops = allLocations.slice(0, count)
    setStops(selectedStops)

    console.log(`✅ Selected ${selectedStops.length} stops for ${locationName}`)
  }, [locations, locationName, stopCount])

  return stops
}

/**
 * Utility function to shuffle array (exported for testing)
 * Does not mutate original array
 *
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  return shuffleArray([...array])
}

/**
 * Utility function to select N random items from array
 *
 * @param array - Source array
 * @param count - Number of items to select
 * @returns Array of randomly selected items
 */
export function selectRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array)
  return shuffled.slice(0, Math.min(count, array.length))
}
