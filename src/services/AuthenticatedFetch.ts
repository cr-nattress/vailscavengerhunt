/**
 * AuthenticatedFetch - Service for making requests with team lock tokens
 * Automatically includes team lock headers and handles errors
 */
import { TeamLockService } from './TeamLockService'
import { ClientTeamErrorHandler } from './TeamErrorHandler'

export class AuthenticatedFetch {
  /**
   * Make authenticated request with team lock token
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const lockToken = TeamLockService.getLockToken()

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(lockToken && { 'X-Team-Lock': lockToken })
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  /**
   * Make authenticated POST request
   */
  static async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * Make authenticated PATCH request
   */
  static async patch(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * Make authenticated PUT request
   */
  static async put(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    })
  }

  /**
   * Make authenticated DELETE request
   */
  static async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      method: 'DELETE',
      ...options
    })
  }

  /**
   * Handle response with team lock error detection
   */
  static async handleResponse(response: Response): Promise<any> {
    return ClientTeamErrorHandler.handleApiResponse(response)
  }

  /**
   * Make authenticated request and handle response
   */
  static async fetchAndHandle(url: string, options: RequestInit = {}): Promise<any> {
    const response = await this.fetch(url, options)
    return this.handleResponse(response)
  }

  /**
   * Make authenticated POST and handle response
   */
  static async postAndHandle(url: string, data: any, options: RequestInit = {}): Promise<any> {
    const response = await this.post(url, data, options)
    return this.handleResponse(response)
  }

  /**
   * Make authenticated PATCH and handle response
   */
  static async patchAndHandle(url: string, data: any, options: RequestInit = {}): Promise<any> {
    const response = await this.patch(url, data, options)
    return this.handleResponse(response)
  }

  /**
   * Check if we have a valid team lock for authenticated requests
   */
  static hasValidLock(): boolean {
    return TeamLockService.hasValidLock()
  }

  /**
   * Check if lock expires within specified minutes
   */
  static lockExpiresWithin(minutes: number): boolean {
    return TeamLockService.lockExpiresWithin(minutes)
  }
}