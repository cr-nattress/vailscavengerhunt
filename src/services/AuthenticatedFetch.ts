/**
 * @file services/AuthenticatedFetch.ts
 * @module AuthenticatedFetch
 * @category API Services
 *
 * @description
 * HTTP client wrapper for team-authenticated API requests.
 * Features:
 * - Automatic team lock token injection
 * - Consistent error handling across all requests
 * - Response validation with team context
 * - Lock expiration checking
 * - RESTful method shortcuts
 *
 * @architecture
 * Acts as a middleware layer between application and fetch API:
 * ```
 * Component → AuthenticatedFetch → fetch() → API
 *                ↓                    ↑
 *          TeamLockService      TeamErrorHandler
 * ```
 *
 * @security
 * - Team lock tokens sent via X-Team-Lock header
 * - Tokens are short-lived (30 min default)
 * - Invalid tokens trigger re-authentication flow
 * - No sensitive data in URL parameters
 *
 * @errorHandling
 * - 401: Invalid/expired team lock
 * - 403: Team doesn't have access
 * - 409: Lock conflict (another session active)
 * - All errors handled by TeamErrorHandler
 *
 * @usage
 * ```typescript
 * // Simple GET with auto-auth
 * const data = await AuthenticatedFetch.fetchAndHandle('/api/progress')
 *
 * // POST with data
 * const result = await AuthenticatedFetch.postAndHandle('/api/save', { stop: 1 })
 * ```
 *
 * @relatedServices
 * - TeamLockService: Manages team session tokens
 * - TeamErrorHandler: Processes API error responses
 */

import { TeamLockService } from './TeamLockService'
import { ClientTeamErrorHandler } from './TeamErrorHandler'

export class AuthenticatedFetch {
  /**
   * Core fetch wrapper with automatic authentication.
   *
   * @description
   * Base method that all HTTP verbs use internally.
   * Injects team lock token if available.
   *
   * @param url - Target endpoint URL
   * @param options - Standard fetch options
   * @returns Raw Response object (not parsed)
   *
   * @sideEffects
   * - Reads team lock from localStorage
   * - May trigger network request
   *
   * @pattern Decorator Pattern
   * Decorates native fetch with auth headers
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // AUTHENTICATION: Get current team's session token
    const lockToken = TeamLockService.getLockToken()

    /**
     * HEADER COMPOSITION:
     * 1. Default Content-Type for JSON APIs
     * 2. Preserve caller's custom headers
     * 3. Conditionally add auth token
     */
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(lockToken && { 'X-Team-Lock': lockToken }) // CONDITIONAL: Only add if token exists
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  /**
   * POST request with automatic JSON serialization.
   *
   * @param url - Target endpoint
   * @param data - Payload to send (will be JSON.stringified)
   * @param options - Additional fetch options
   * @returns Raw Response object
   *
   * @useCase Creating new resources, form submissions
   */
  static async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data), // SERIALIZATION: Auto-convert to JSON
      ...options
    })
  }

  /**
   * PATCH request for partial updates.
   *
   * @description
   * Use for updating specific fields without sending full resource.
   * More efficient than PUT for large objects.
   *
   * @useCase Updating progress, toggling flags
   */
  static async patch(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * PUT request for full resource replacement.
   *
   * @description
   * Replaces entire resource at URL.
   * Server should treat missing fields as null/deleted.
   *
   * @useCase Full object updates, idempotent operations
   */
  static async put(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * DELETE request for resource removal.
   *
   * @description
   * No body sent with DELETE per REST conventions.
   *
   * @useCase Removing resources, clearing data
   */
  static async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'DELETE',
      ...options
    })
  }

  /**
   * Process API response with error handling.
   *
   * @description
   * Delegates to TeamErrorHandler for:
   * - Team lock validation errors
   * - Session expiration
   * - Lock conflicts
   * - General HTTP errors
   *
   * @param response - Raw fetch Response
   * @returns Parsed JSON data or throws error
   *
   * @throws TeamLockError for auth issues
   * @throws ApiError for other HTTP errors
   */
  static async handleResponse(response: Response): Promise<any> {
    // DELEGATION: Specialized error handler manages team-specific errors
    return ClientTeamErrorHandler.handleApiResponse(response)
  }

  /**
   * Convenience method: Fetch + automatic response handling.
   *
   * @description
   * Combines fetch() and handleResponse() for common use case.
   * Most components should use this instead of raw fetch().
   *
   * @returns Parsed response data
   * @throws Processed errors from TeamErrorHandler
   *
   * @example
   * const stops = await AuthenticatedFetch.fetchAndHandle('/api/stops')
   */
  static async fetchAndHandle(url: string, options: RequestInit = {}): Promise<any> {
    const response = await this.fetch(url, options)
    return this.handleResponse(response)
  }

  /**
   * Convenience method: POST + automatic response handling.
   *
   * @description
   * Full request-response cycle with error handling.
   *
   * @pattern Command Pattern
   * Encapsulates complete POST operation
   *
   * @example
   * const result = await AuthenticatedFetch.postAndHandle('/api/upload', formData)
   */
  static async postAndHandle(url: string, data: any, options: RequestInit = {}): Promise<any> {
    const response = await this.post(url, data, options)
    return this.handleResponse(response)
  }

  /**
   * Convenience method: PATCH + automatic response handling.
   *
   * @description
   * Partial update with full error handling.
   *
   * @useCase Progress updates, status changes
   */
  static async patchAndHandle(url: string, data: any, options: RequestInit = {}): Promise<any> {
    const response = await this.patch(url, data, options)
    return this.handleResponse(response)
  }

  /**
   * Check if team authentication is valid.
   *
   * @description
   * Validates both token presence and expiration.
   * Use before showing authenticated UI.
   *
   * @returns true if team can make authenticated requests
   *
   * @useCase
   * - Conditional UI rendering
   * - Route guards
   * - Pre-flight checks
   */
  static hasValidLock(): boolean {
    return TeamLockService.hasValidLock()
  }

  /**
   * Check if team lock is expiring soon.
   *
   * @description
   * Useful for proactive renewal or warnings.
   *
   * @param minutes - Time window to check
   * @returns true if lock expires within window
   *
   * @useCase
   * - Show renewal prompt at 5 minutes
   * - Auto-refresh at 2 minutes
   * - Warn before important operations
   *
   * @example
   * if (AuthenticatedFetch.lockExpiresWithin(5)) {
   *   showRenewalPrompt()
   * }
   */
  static lockExpiresWithin(minutes: number): boolean {
    return TeamLockService.lockExpiresWithin(minutes)
  }
}