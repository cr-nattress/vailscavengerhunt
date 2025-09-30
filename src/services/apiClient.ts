/**
 * Central API client with automatic base URL resolution, error handling,
 * timeout support, and both JSON and FormData request capabilities
 */
import { addApiResponseBreadcrumb, addApiErrorBreadcrumb } from '../logging/sentryBreadcrumbUtils'
import { createLegacyLogger } from '../logging/client'

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
  private logger = createLegacyLogger('api-client')

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

    // Env overrides for flexibility
    const env: any = (import.meta as any)?.env || {}
    if (env.VITE_API_BASE) {
      this.logger.info('🌐 Using VITE_API_BASE override', { base: env.VITE_API_BASE })
      return env.VITE_API_BASE as string
    }
    if (env.VITE_USE_NETLIFY_API === 'true') {
      this.logger.info('🌐 VITE_USE_NETLIFY_API=true, using /api (Netlify redirects to functions)')
      return '/api'
    }

    // If running on port 8888 (Netlify dev), use /api for redirects
    if (window.location.port === '8888') {
      this.logger.info('🌐 Detected Netlify dev (port 8888), using /api')
      return '/api'
    }

    // In production, use /api URLs (Netlify will redirect to functions)
    if (window.location.hostname !== 'localhost') {
      this.logger.info('🌐 Production mode, using /api URLs')
      return '/api'
    }

    // In development, default to local Express server unless overridden above
    const devUrl = 'http://localhost:3001/api'
    this.logger.info('🌐 Development mode, using local server', { devUrl })
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
   * Calculate retry delay with exponential backoff and jitter
   */
  private getRetryDelay(attempt: number): number {
    const baseDelays = [500, 1500, 3000]
    const baseDelay = baseDelays[Math.min(attempt, baseDelays.length - 1)]
    const jitter = Math.random() * 500
    return baseDelay + jitter
  }

  /**
   * Create a structured API error
   */
  private createApiError(response: Response, body?: any): ApiError {
    // Log detailed error information
    this.logger.error(`API Error: ${response.status} ${response.statusText}`, new Error(`API Error: ${response.status} ${response.statusText}`), {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      responseBody: body,
      headers: Object.fromEntries(response.headers.entries())
    });

    const errorMessage = body?.error || body?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage) as ApiError

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

    this.logger.info('Request started', {
      method: init.method || 'GET',
      url,
      message: `🌐 API Request: ${init.method || 'GET'} ${url}`
    })

    let lastError: Error
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      if (attempt > 0) {
        const delay = this.getRetryDelay(attempt - 1)
        this.logger.warn('Request retry', {
          message: `🔄 Retry attempt ${attempt}/${retryAttempts - 1}`,
          attempt,
          maxAttempts: retryAttempts - 1,
          delayMs: Math.round(delay)
        })
        await this.sleep(delay)
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

        const startTime = Date.now()
        const response = await fetch(url, requestInit)
        const duration = Date.now() - startTime

        this.logger.info('Response received', {
          message: `📥 Response: ${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          duration
        })

        let responseBody: any
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            responseBody = await response.json()
          } else {
            responseBody = await response.text()
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse response body', {
            message: '⚠️ Failed to parse response body',
            error: parseError
          })
          responseBody = null
        }

        if (!response.ok) {
          this.logger.error(`Non-OK response: ${response.status} ${response.statusText}`, new Error(`Non-OK response: ${response.status} ${response.statusText}`), {
            status: response.status,
            statusText: response.statusText,
            responseBody
          });

          // Add error breadcrumb
          addApiErrorBreadcrumb(
            init.method || 'GET',
            url,
            `${response.status} ${response.statusText}`,
            duration
          )

          throw this.createApiError(response, responseBody)
        }

        // Add success breadcrumb
        const responseSize = JSON.stringify(responseBody).length
        addApiResponseBreadcrumb(
          init.method || 'GET',
          url,
          response.status,
          duration,
          responseSize
        )

        return responseBody as T

      } catch (error) {
        lastError = error as Error

        this.logger.error('Request attempt failed', error as Error, {
          attempt: attempt + 1,
          errorType: error?.constructor?.name,
          url
        });

        if (error instanceof Error && error.name === 'AbortError') {
          this.logger.error('Request timeout', error as Error, {
            message: `⏰ Request timeout after ${timeout}ms`,
            timeout
          })
          addApiErrorBreadcrumb(
            init.method || 'GET',
            url,
            `Timeout after ${timeout}ms`
          )
          throw new Error(`Request timeout after ${timeout}ms`)
        }

        // Add general error breadcrumb for other errors
        if (attempt === retryAttempts - 1) {
          addApiErrorBreadcrumb(
            init.method || 'GET',
            url,
            error instanceof Error ? error.message : 'Unknown error'
          )
        }

        if (error instanceof Error && (error as ApiError).status) {
          // Don't retry client errors (4xx)
          const apiError = error as ApiError
          if (apiError.status >= 400 && apiError.status < 500) {
            throw error
          }
        }

        this.logger.warn('Request failed, retrying', {
          message: `❌ Request failed (attempt ${attempt + 1})`,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error)
        })
        
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