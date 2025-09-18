/**
 * ConfigService - Centralized configuration management
 * Manages all hunt locations and team configurations
 */

import { bhhsLocations } from '../data/locations/bhhs'
import { vailValleyLocations } from '../data/locations/vail-valley'
import { vailVillageLocations } from '../data/locations/vail-village'
import { teamsConfig } from '../data/teams/config'
import {
  HuntConfig,
  Location,
  TeamsConfig,
  TeamConfig,
  OrganizationConfig
} from '../types/config'

class ConfigService {
  private locationConfigs: Record<string, Record<string, HuntConfig>> = {
    'bhhs': {
      'fall-2025': bhhsLocations
    },
    'vail-valley': {
      'default': vailValleyLocations
    },
    'vail-village': {
      'default': vailVillageLocations
    }
  }

  private teamsConfig: TeamsConfig = teamsConfig

  /**
   * Get location configuration for a specific org and hunt
   */
  getLocations(org: string, hunt: string): HuntConfig | null {
    const orgConfigs = this.locationConfigs[org]
    if (!orgConfigs) {
      console.warn(`[ConfigService] No configuration found for org: ${org}`)
      return null
    }

    const huntConfig = orgConfigs[hunt]
    if (!huntConfig) {
      console.warn(`[ConfigService] No hunt configuration found for org: ${org}, hunt: ${hunt}`)
      return null
    }

    return huntConfig
  }

  /**
   * Get a specific location by ID
   */
  getLocationById(org: string, hunt: string, locationId: string): Location | null {
    const config = this.getLocations(org, hunt)
    if (!config) return null

    return config.locations.find(loc => loc.id === locationId) || null
  }

  /**
   * Get all teams configuration
   */
  getTeamsConfig(): TeamsConfig {
    return this.teamsConfig
  }

  /**
   * Get organization configuration
   */
  getOrganization(orgId: string): OrganizationConfig | null {
    return this.teamsConfig.organizations[orgId] || null
  }

  /**
   * Get teams for a specific org and hunt
   */
  getTeams(org: string, hunt: string): TeamConfig[] {
    const orgConfig = this.getOrganization(org)
    if (!orgConfig) return []

    const huntConfig = orgConfig.hunts[hunt]
    if (!huntConfig) return []

    return huntConfig.teams
  }

  /**
   * Get team by ID
   */
  getTeamById(org: string, hunt: string, teamId: string): TeamConfig | null {
    const teams = this.getTeams(org, hunt)
    return teams.find(team => team.id === teamId) || null
  }

  /**
   * Check if a configuration exists
   */
  hasConfig(org: string, hunt: string): boolean {
    return !!(this.locationConfigs[org]?.[hunt])
  }

  /**
   * Get all available organizations
   */
  getOrganizations(): string[] {
    return Object.keys(this.teamsConfig.organizations)
  }

  /**
   * Get all hunts for an organization
   */
  getHunts(org: string): string[] {
    const orgConfig = this.getOrganization(org)
    if (!orgConfig) return []
    return Object.keys(orgConfig.hunts)
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
    const config = this.getLocations(org, hunt)

    if (!config) return []

    // Return in legacy format (array of locations)
    return config.locations
  }
}

// Export singleton instance
export const configService = new ConfigService()
export default configService