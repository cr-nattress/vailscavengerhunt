/**
 * LoginService - Consolidated login and initialization service
 * Single API call for complete app initialization
 */

import { TeamLockService } from './TeamLockService'

// Types
export interface LoginInitializeRequest {
  orgId: string
  huntId: string
  teamCode?: string
  lockToken?: string
  sessionId: string
  deviceFingerprint?: string
}

export interface LoginInitializeResponse {
  // Public configuration
  config: {
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

  // Organization metadata
  organization: {
    id: string
    name: string
    logoUrl?: string
  }

  // Hunt metadata
  hunt: {
    id: string
    name: string
    description?: string
    startDate?: string
    endDate?: string
    isActive: boolean
  }

  // Team verification result
  teamVerification?: {
    success: boolean
    teamId?: string
    teamName?: string
    ttlSeconds?: number
    lockToken?: string
    error?: string
  }

  // Existing team from lock token
  currentTeam?: {
    teamId: string
    teamName: string
    lockValid: boolean
  }

  // Full active data (if team is verified/locked)
  activeData?: {
    settings: {
      locationName: string
      teamName: string
      teamId?: string
      sessionId: string
      eventName: string
      organizationId?: string
      huntId?: string
      lastModifiedBy?: string
      lastModifiedAt?: string
    }
    progress: Record<string, any>
    sponsors: {
      layout: string
      items: Array<{
        id: string
        companyId: string
        companyName: string
        alt: string
        type: string
        src?: string
        svg?: string
      }>
    }
  }

  // Available features
  features: {
    sponsorCardEnabled: boolean
    photoUploadsEnabled: boolean
    leaderboardEnabled: boolean
    tipsEnabled: boolean
  }
}

class LoginServiceClass {
  private baseUrl = '/.netlify/functions/login-initialize'
  private cache: LoginInitializeResponse | null = null
  private cacheTimestamp = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Initialize the application with a single API call
   * Handles team verification, settings, and data loading
   */
  async initialize(request: LoginInitializeRequest): Promise<LoginInitializeResponse> {
    try {
      // Check cache if we're not doing a new team verification
      if (!request.teamCode && this.cache && this.isCacheValid()) {
        console.log('[LoginService] Returning cached initialization data')
        return this.cache
      }

      console.log('[LoginService] Initializing with:', {
        orgId: request.orgId,
        huntId: request.huntId,
        hasTeamCode: !!request.teamCode,
        hasLockToken: !!request.lockToken
      })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `Initialization failed: ${response.statusText}`)
      }

      const data = await response.json() as LoginInitializeResponse

      // Cache the response if successful
      if (!request.teamCode) {
        this.cache = data
        this.cacheTimestamp = Date.now()
      }

      // Handle successful team verification
      if (data.teamVerification?.success && data.teamVerification.lockToken) {
        console.log('[LoginService] Team verified successfully:', data.teamVerification.teamId)
        // Create and save the lock
        const lock = {
          teamId: data.teamVerification.teamId,
          issuedAt: Date.now(),
          expiresAt: Date.now() + (data.teamVerification.ttlSeconds || 86400) * 1000,
          lockToken: data.teamVerification.lockToken
        }
        TeamLockService.storeLock(lock)
      }

      return data
    } catch (error) {
      console.error('[LoginService] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Quick initialization using existing lock token
   */
  async quickInit(orgId: string, huntId: string, sessionId: string): Promise<LoginInitializeResponse> {
    const lockToken = TeamLockService.getLockToken()

    return this.initialize({
      orgId,
      huntId,
      lockToken,
      sessionId
    })
  }

  /**
   * Verify team code and initialize
   */
  async verifyTeam(
    orgId: string,
    huntId: string,
    teamCode: string,
    sessionId: string
  ): Promise<LoginInitializeResponse> {
    // Generate device fingerprint
    const deviceFingerprint = await this.generateDeviceFingerprint()

    return this.initialize({
      orgId,
      huntId,
      teamCode,
      sessionId,
      deviceFingerprint
    })
  }

  /**
   * Check if initialization is needed
   */
  needsInitialization(): boolean {
    return !TeamLockService.hasLockToken() || !this.cache || !this.isCacheValid()
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
  }

  /**
   * Get the current context (orgId, huntId, teamId) from cached initialization
   * Falls back to values inside activeData.settings when available.
   * Returns nulls if not yet initialized.
   */
  getCurrentContext(): { orgId: string | null; huntId: string | null; teamId: string | null } {
    if (!this.cache || !this.isCacheValid()) {
      return { orgId: null, huntId: null, teamId: null }
    }

    const orgId = this.cache.organization?.id || this.cache.activeData?.settings?.organizationId || null
    const huntId = this.cache.hunt?.id || this.cache.activeData?.settings?.huntId || null
    const teamId = this.cache.teamVerification?.teamId
      || this.cache.currentTeam?.teamId
      || this.cache.activeData?.settings?.teamId
      || null

    return { orgId, huntId, teamId }
  }

  /**
   * Get cached config if available
   */
  getCachedConfig(): LoginInitializeResponse['config'] | null {
    if (this.cache && this.isCacheValid()) {
      return this.cache.config
    }
    return null
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL
  }

  /**
   * Generate a device fingerprint for lock tracking
   */
  private async generateDeviceFingerprint(): Promise<string> {
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        navigator.platform
      ]

      const fingerprint = components.join('|')

      // Simple hash using Web Crypto API
      const msgUint8 = new TextEncoder().encode(fingerprint)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      return hashHex.substring(0, 16) // Return first 16 chars
    } catch (error) {
      console.warn('[LoginService] Failed to generate device fingerprint:', error)
      // Fallback to random ID
      return Math.random().toString(36).substring(2, 18)
    }
  }

  /**
   * Check if the service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const LoginService = new LoginServiceClass()
export default LoginService