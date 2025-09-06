/**
 * Central API client with automatic base URL resolution, error handling,
 * timeout support, and both JSON and FormData request capabilities
 */

interface RequestOptions {
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

interface ApiError extends Error {
  status: number
  statusText: string
  body?: any
}

class ApiClient {
  private static instance: ApiClient
  private baseUrl: string

  private constructor() {
    this.baseUrl = this.resolveApiBase()
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  /**
   * Resolve API base URL based on environment
   */
  private resolveApiBase(): string {
    if (typeof window === 'undefined') {
      return ''
    }

    // Check for explicit API URL from environment first
    const apiUrl = import.meta.env?.VITE_API_URL
    if (apiUrl) {
      console.log('🌐 Using VITE_API_URL:', apiUrl)
      return apiUrl
    }

    // If running on port 8888 (Netlify dev), use Netlify Functions
    if (window.location.port === '8888') {
      console.log('🌐 Detected Netlify dev (port 8888), using Functions')
      return '/.netlify/functions'
    }

    // In production, use relative URLs for Netlify Functions
    if (window.location.hostname !== 'localhost') {
      console.log('🌐 Production mode, using relative URLs')
      return '/.netlify/functions'
    }

    // In development, use local Express server
    const devUrl = 'http://localhost:3001/api'
    console.log('🌐 Development mode, using local server:', devUrl)
    return devUrl
  }

  /**
   * Create an AbortController with timeout
   */
  private createAbortController(timeout: number = 30000): AbortController {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    return controller
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create a structured API error
   */
  private createApiError(response: Response, body?: any): ApiError {
    const error = new Error(
      body?.error || body?.message || `HTTP ${response.status}: ${response.statusText}`
    ) as ApiError
    
    error.name = 'ApiError'
    error.status = response.status
    error.statusText = response.statusText
    error.body = body
    
    return error
  }

  /**
   * Make a JSON request with automatic error handling and retries
   */
  async request<T>(
    path: string, 
    init: RequestInit = {}, 
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = 30000, retryAttempts = 1, retryDelay = 1000 } = options
    const url = `${this.baseUrl}${path}`
    
    console.log(`🌐 API Request: ${init.method || 'GET'} ${url}`)

    let lastError: Error
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retryAttempts - 1}`)
        await this.sleep(retryDelay)
      }

      const controller = this.createAbortController(timeout)
      
      try {
        const requestInit: RequestInit = {
          ...init,
          signal: controller.signal
        }

        // Add JSON headers if body is an object (but not FormData)
        if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
          requestInit.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...init.headers
          }
          requestInit.body = JSON.stringify(init.body)
        } else if (!requestInit.headers) {
          requestInit.headers = {
            'Accept': 'application/json',
            ...init.headers
          }
        }

        const response = await fetch(url, requestInit)
        
        console.log(`📥 Response: ${response.status} ${response.statusText}`)

        let responseBody: any
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            responseBody = await response.json()
          } else {
            responseBody = await response.text()
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse response body:', parseError)
          responseBody = null
        }

        if (!response.ok) {
          throw this.createApiError(response, responseBody)
        }

        return responseBody as T

      } catch (error) {
        lastError = error as Error
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`⏰ Request timeout after ${timeout}ms`)
          throw new Error(`Request timeout after ${timeout}ms`)
        }

        if (error instanceof Error && (error as ApiError).status) {
          // Don't retry client errors (4xx)
          const apiError = error as ApiError
          if (apiError.status >= 400 && apiError.status < 500) {
            throw error
          }
        }

        console.warn(`❌ Request failed (attempt ${attempt + 1}):`, error.message)
        
        // If this is the last attempt, throw the error
        if (attempt === retryAttempts - 1) {
          throw error
        }
      }
    }

    throw lastError!
  }

  /**
   * Make a FormData request (for file uploads)
   */
  async requestFormData<T>(
    path: string,
    formData: FormData,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type - let browser set it with boundary
          'Accept': 'application/json'
        }
      },
      options
    )
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { method: 'GET' }, options)
  }

  post<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: data }, options)
  }

  put<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: data }, options)
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' }, options)
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance()
export type { ApiError, RequestOptions }