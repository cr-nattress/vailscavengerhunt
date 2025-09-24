/**
 * E2E Test Runner Configuration
 * Sets up test environment and runs comprehensive API tests
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'e2e',
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 10000, // 10 seconds for setup/teardown
    include: ['tests/e2e/**/*.test.js'],
    exclude: ['tests/unit/**/*'],
    environment: 'node',
    globals: true,
    setupFiles: ['tests/e2e/setup.js'],
    reporters: ['verbose'],
    coverage: {
      enabled: false // Disable coverage for E2E tests
    },
    env: {
      // Test environment configuration
      NODE_ENV: 'test',
      TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:8888'
    }
  }
})