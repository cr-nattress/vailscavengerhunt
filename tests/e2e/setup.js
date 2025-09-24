/**
 * E2E Test Setup
 * Global setup and configuration for end-to-end tests
 */

import { beforeAll, afterAll } from 'vitest'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Global test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8888',
  timeout: 30000,
  retryAttempts: 3,
  waitBetweenRetries: 1000
}

// Make config available globally
globalThis.TEST_CONFIG = TEST_CONFIG

beforeAll(async () => {
  console.log('🚀 Starting E2E Test Suite')
  console.log(`📍 Base URL: ${TEST_CONFIG.baseUrl}`)

  // Check if test environment is available
  await waitForServices()

  console.log('✅ Test environment ready')
})

afterAll(async () => {
  console.log('🏁 E2E Test Suite completed')
})

/**
 * Wait for services to be available before running tests
 */
async function waitForServices() {
  const maxAttempts = 10
  const delayMs = 2000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⏳ Checking services (attempt ${attempt}/${maxAttempts})...`)

      // Check if health endpoint is available
      const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/health`, {
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const health = await response.json()
        console.log(`✅ Services available - Status: ${health.status}`)
        return
      }

      throw new Error(`Health check failed: ${response.status}`)
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`)

      if (attempt === maxAttempts) {
        throw new Error(`Services not available after ${maxAttempts} attempts. Please ensure the development server is running.`)
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Utility function for retrying failed requests
 */
export async function retryRequest(requestFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }

      console.log(`Retry attempt ${attempt}/${maxRetries} failed: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.waitBetweenRetries))
    }
  }
}

/**
 * Create a test fetch wrapper with common headers and error handling
 */
export function createTestFetch(baseUrl = TEST_CONFIG.baseUrl) {
  return async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(TEST_CONFIG.timeout)
    })

    return response
  }
}

/**
 * Environment validation
 */
export function validateTestEnvironment() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`)
    console.warn('Some tests may be skipped')
    return false
  }

  return true
}

// Validate environment on setup
validateTestEnvironment()