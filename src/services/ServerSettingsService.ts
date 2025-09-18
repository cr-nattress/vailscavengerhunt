/**
 * ServerSettingsService - Handles server-side storage of app settings
 * Replaces localStorage persistence with API calls
 */

interface Settings {
  locationName: string
  teamName: string
  sessionId: string
  eventName: string
  organizationId?: string
  huntId?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ServerSettingsService {
  private baseUrl: string
  private retryAttempts = 3
  private retryDelay = 1000 // Start with 1 second

  constructor() {
    // Use relative paths for API calls
    this.baseUrl = '/api'
  }

  /**
   * Get settings from server for a specific team's hunt
   */
  async getSettings(orgId: string, teamId: string, huntId: string): Promise<Settings | null> {
    if (!orgId || !teamId || !huntId) {
      console.warn('[ServerSettings] Missing required parameters')
      return null
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/settings/${orgId}/${teamId}/${huntId}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[ServerSettings] No settings found, returning null')
          return null
        }
        throw new Error(`Failed to fetch settings: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[ServerSettings] Settings loaded successfully:', data)
      return data
    } catch (error) {
      console.error('[ServerSettings] Failed to load settings:', error)
      return null
    }
  }

  /**
   * Save settings to server for a specific team's hunt
   * @param sessionId - Used for audit trail only, not for data location
   */
  async saveSettings(
    orgId: string,
    teamId: string,
    huntId: string,
    settings: Settings,
    sessionId: string
  ): Promise<boolean> {
    if (!orgId || !teamId || !huntId) {
      console.error('[ServerSettings] Missing required parameters')
      return false
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/settings/${orgId}/${teamId}/${huntId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings,
            sessionId, // For audit trail only
            timestamp: new Date().toISOString()
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`)
      }

      console.log('[ServerSettings] Settings saved successfully')
      return true
    } catch (error) {
      console.error('[ServerSettings] Failed to save settings:', error)
      return false
    }
  }

  /**
   * Initialize settings for a new hunt session
   */
  async initializeSettings(
    orgId: string,
    teamId: string,
    huntId: string,
    sessionId: string
  ): Promise<Settings> {
    // First try to load existing settings
    const existing = await this.getSettings(orgId, teamId, huntId)

    if (existing) {
      console.log('[ServerSettings] Using existing settings')
      // Update sessionId for this session but keep other settings
      return {
        ...existing,
        sessionId,
        organizationId: orgId,
        huntId
      }
    }

    // Create default settings for new hunt
    const defaultSettings: Settings = {
      locationName: 'BHHS',
      teamName: teamId,
      sessionId,
      eventName: '',
      organizationId: orgId,
      huntId
    }

    console.log('[ServerSettings] Creating new settings with defaults')
    await this.saveSettings(orgId, teamId, huntId, defaultSettings, sessionId)

    return defaultSettings
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options)

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response
        }

        // Retry on server errors (5xx) or network errors
        if (response.ok) {
          return response
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        lastError = error as Error
        console.warn(`[ServerSettings] Attempt ${attempt + 1} failed:`, error)
      }

      // Wait before retrying (exponential backoff)
      if (attempt < this.retryAttempts - 1) {
        const delay = this.retryDelay * Math.pow(2, attempt)
        console.log(`[ServerSettings] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('Failed after retries')
  }

  /**
   * Check if server is available
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const serverSettingsService = new ServerSettingsService()
export default serverSettingsService