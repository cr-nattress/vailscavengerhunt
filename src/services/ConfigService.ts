/**
 * ConfigService - Centralized configuration management
 * Fetches hunt locations and team configurations from the API
 */

import { ConsolidatedDataService } from './ConsolidatedDataService'
import {
  HuntConfig,
  Location,
  TeamsConfig,
  TeamConfig,
  OrganizationConfig
} from '../types/config'

class ConfigService {
  private locationCache: Record<string, Record<string, HuntConfig>> = {}
  private teamsCache: TeamsConfig | null = null

  /**
   * Get location configuration for a specific org and hunt
   * Fetches from the API via ConsolidatedDataService
   */
  async getLocations(org: string, hunt: string): Promise<HuntConfig | null> {
    // Check cache first
    if (this.locationCache[org]?.[hunt]) {
      return this.locationCache[org][hunt]
    }

    try {
      // Get data from the consolidated active endpoint
      const activeData = await ConsolidatedDataService.getActiveData(
        org,
        'temp', // We need a team ID, use a placeholder
        hunt
      )

      if (activeData?.locations) {
        // Cache the result
        if (!this.locationCache[org]) {
          this.locationCache[org] = {}
        }
        this.locationCache[org][hunt] = activeData.locations

        return activeData.locations
      }

      console.warn(`[ConfigService] No locations found for org: ${org}, hunt: ${hunt}`)
      return null
    } catch (error) {
      console.error(`[ConfigService] Error fetching locations for org: ${org}, hunt: ${hunt}:`, error)
      return null
    }
  }

  /**
   * Get location configuration synchronously (from cache only)
   * For backward compatibility - components should migrate to async version
   */
  getLocationsSync(org: string, hunt: string): HuntConfig | null {
    const cached = this.locationCache[org]?.[hunt]
    if (!cached) {
      console.warn(`[ConfigService] No cached locations for org: ${org}, hunt: ${hunt}. Use getLocations() for async fetch.`)
      return null
    }
    return cached
  }

  /**
   * Get a specific location by ID
   */
  async getLocationById(org: string, hunt: string, locationId: string): Promise<Location | null> {
    const config = await this.getLocations(org, hunt)
    if (!config) return null

    return config.locations.find(loc => loc.id === locationId) || null
  }

  /**
   * Get a specific location by ID (sync version - from cache only)
   */
  getLocationByIdSync(org: string, hunt: string, locationId: string): Location | null {
    const config = this.getLocationsSync(org, hunt)
    if (!config) return null

    return config.locations.find(loc => loc.id === locationId) || null
  }

  /**
   * Preload location data into cache
   * Call this during app initialization
   */
  async preloadLocations(org: string, hunt: string, teamId: string): Promise<void> {
    try {
      const activeData = await ConsolidatedDataService.getActiveData(org, teamId, hunt)

      if (activeData?.locations) {
        if (!this.locationCache[org]) {
          this.locationCache[org] = {}
        }
        this.locationCache[org][hunt] = activeData.locations
        console.log(`[ConfigService] Preloaded locations for ${org}/${hunt}`)
      }
    } catch (error) {
      console.error('[ConfigService] Failed to preload locations:', error)
    }
  }

  /**
   * Get all teams configuration
   * Note: This currently returns a stub as teams are managed differently
   */
  getTeamsConfig(): TeamsConfig {
    if (!this.teamsCache) {
      // Return a stub for now - actual teams come from the API
      this.teamsCache = {
        organizations: {}
      }
    }
    return this.teamsCache
  }

  /**
   * Get organization configuration
   */
  getOrganization(orgId: string): OrganizationConfig | null {
    const config = this.getTeamsConfig()
    return config.organizations[orgId] || null
  }

  /**
   * Get teams for a specific org and hunt
   * Note: This should fetch from the API in the future
   */
  getTeams(org: string, hunt: string): TeamConfig[] {
    // Return empty for now - actual teams come from the API
    return []
  }

  /**
   * Get team by ID
   */
  getTeamById(org: string, hunt: string, teamId: string): TeamConfig | null {
    const teams = this.getTeams(org, hunt)
    return teams.find(team => team.id === teamId) || null
  }

  /**
   * Check if a configuration exists in cache
   */
  hasConfig(org: string, hunt: string): boolean {
    return !!(this.locationCache[org]?.[hunt])
  }

  /**
   * Get all available organizations from cache
   */
  getOrganizations(): string[] {
    return Object.keys(this.locationCache)
  }

  /**
   * Get all hunts for an organization from cache
   */
  getHunts(org: string): string[] {
    return Object.keys(this.locationCache[org] || {})
  }

  /**
   * Get location data compatible with legacy format
   * Used for backward compatibility during migration
   */
  getLegacyLocationData(locationName: string): any {
    // Map legacy names to new org/hunt structure
    const mappings: Record<string, [string, string]> = {
      'BHHS': ['bhhs', 'fall-2025'],
      'Vail Valley': ['vail-valley', 'default'],
      'Vail Village': ['vail-village', 'default']
    }

    const [org, hunt] = mappings[locationName] || ['bhhs', 'fall-2025']
    const config = this.getLocationsSync(org, hunt)

    if (!config) return []

    // Return in legacy format (array of locations)
    return config.locations
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.locationCache = {}
    this.teamsCache = null
    console.log('[ConfigService] Cache cleared')
  }
}

// Export singleton instance
export const configService = new ConfigService()
export default configService