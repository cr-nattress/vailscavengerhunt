import vailValleyData from '../data/vail-valley.json'
import vailVillageData from '../data/vail-village.json'
import bhhsData from '../data/bhhs-locations.json'

/**
 * Get location data based on selected location name
 */
function getLocationData(locationName: string): any[] {
  switch(locationName) {
    case 'BHHS':
      return bhhsData
    case 'Vail Village':
      return vailVillageData
    case 'Vail Valley':
      return vailValleyData
    case 'TEST':
      // For TEST, return a subset of Vail Valley data
      return vailValleyData.slice(0, 3)
    default:
      return bhhsData
  }
}

/**
 * Randomly selects locations from the specified location data
 * Uses a seeded approach to ensure consistent selection per session
 */
export function getRandomStops(locationName: string = 'BHHS', maxStops?: number): any[] {
  const locationData = getLocationData(locationName)
  
  // Create a copy of all locations to avoid mutating the original array
  const shuffled = [...locationData]
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // For BHHS, return all 9 locations; for others, return 5
  const defaultMaxStops = locationName === 'BHHS' ? shuffled.length : 5
  const stopCount = maxStops ?? defaultMaxStops
  return shuffled.slice(0, Math.min(stopCount, shuffled.length))
}