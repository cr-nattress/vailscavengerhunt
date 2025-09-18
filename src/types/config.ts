/**
 * Configuration type definitions for the scavenger hunt application
 */

export interface Position {
  lat: number
  lng: number
}

export interface Location {
  id: string
  title: string
  clue: string
  hints: string[]
  position?: Position
  description?: string
  address?: string
}

export interface HuntConfig {
  name: string
  locations: Location[]
}

export interface TeamConfig {
  id: string
  displayName: string
}

export interface HuntInfo {
  id: string
  name: string
  teams: TeamConfig[]
}

export interface OrganizationConfig {
  id: string
  name: string
  hunts: Record<string, HuntInfo>
}

export interface TeamsConfig {
  organizations: Record<string, OrganizationConfig>
}

export interface ConfigStore {
  locations: Record<string, Record<string, HuntConfig>>
  teams: TeamsConfig
}