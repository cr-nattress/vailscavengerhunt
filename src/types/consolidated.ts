/**
 * Types for consolidated API endpoints
 * These endpoints return multiple data types in a single response
 */

import { ProgressData } from './schemas'
import { SponsorsResponse } from './sponsors'
import { HuntConfig } from './config'

/**
 * Public configuration data
 */
export interface PublicConfig {
  API_URL: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SENTRY_DSN: string
  SENTRY_ENVIRONMENT: string
  SENTRY_RELEASE: string
  SENTRY_TRACES_SAMPLE_RATE: string
  SPONSOR_CARD_ENABLED: boolean
  MAX_UPLOAD_BYTES: number
  ALLOW_LARGE_UPLOADS: boolean
  ENABLE_UNSIGNED_UPLOADS: boolean
  DISABLE_CLIENT_RESIZE: boolean
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_UNSIGNED_PRESET: string
  CLOUDINARY_UPLOAD_FOLDER: string
}

/**
 * Team settings data
 */
export interface TeamSettings {
  locationName: string
  teamName: string
  sessionId: string
  eventName: string
  organizationId?: string
  huntId?: string
  lastModifiedBy?: string
  lastModifiedAt?: string
}

/**
 * Current team info from lock token
 */
export interface CurrentTeamInfo {
  teamId: string
  teamName: string
  lockValid: boolean
}

/**
 * Response from consolidated-active endpoint
 */
export interface ConsolidatedActiveResponse {
  orgId: string
  teamId: string
  huntId: string
  settings: TeamSettings | null
  progress: ProgressData
  sponsors: SponsorsResponse
  config: PublicConfig
  locations: HuntConfig | null
  currentTeam: CurrentTeamInfo | null
  lastUpdated: string
}

/**
 * Hook result for useActiveData
 */
export interface UseActiveDataResult {
  data: ConsolidatedActiveResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}