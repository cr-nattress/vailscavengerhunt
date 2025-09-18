import { configService } from '../services/ConfigService'

/**
 * Get location data based on selected location name
 */
function getLocationData(locationName: string): any[] {
  // Use ConfigService's legacy compatibility method
  const locations = configService.getLegacyLocationData(locationName)

  // For TEST mode, return a subset
  if (locationName === 'TEST') {
    const vailValleyLocations = configService.getLegacyLocationData('Vail Valley')
    return vailValleyLocations.slice(0, 3)
  }

  return locations || []
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