/**
 * @file components/SentryTestComponent.jsx
 * @component SentryTestComponent
 * @category Testing/Debugging
 *
 * @description
 * Development component for testing Sentry error monitoring integration.
 * Features:
 * - Verifies Sentry initialization
 * - Tests error capture, messages, and breadcrumbs
 * - Validates user context and transactions
 * - Provides visual feedback for debugging
 * - Tests both direct Sentry API and logger wrapper
 *
 * @purpose
 * - Verify Sentry is properly configured
 * - Test error reporting pipeline
 * - Debug production issues locally
 * - Validate monitoring setup before deployment
 *
 * @usage
 * This component should only be rendered in development/staging
 * Typically accessible via a debug route or admin panel
 *
 * @security
 * - Should NEVER be exposed in production builds
 * - Contains sensitive debugging information
 * - Can generate test errors that pollute monitoring
 *
 * @relatedComponents
 * - clientLoggerFactory: Logger abstraction over Sentry
 * - Error boundaries: Production error handling
 */

import React, { useState } from 'react'
import * as Sentry from '@sentry/react'
import { createUILogger } from '../logging/factories/clientLoggerFactory'

export const SentryTestComponent = () => {
  const [testStatus, setTestStatus] = useState([])
  const logger = createUILogger()

  const addStatus = (message, type = 'info') => {
    setTestStatus(prev => [...prev, { message, type, timestamp: new Date().toISOString() }])
  }

  const testSentryInitialization = () => {
    try {
      /**
       * VERIFICATION: Check Sentry client exists
       * getDsn() confirms proper initialization
       * Host shown for privacy (not full DSN)
       */
      const client = Sentry.getClient()
      const dsn = client?.getDsn()
      if (dsn) {
        addStatus(`✅ Sentry is initialized with DSN: ${dsn.host}`, 'success')
        return true
      } else {
        addStatus('❌ Sentry is not initialized (no DSN found)', 'error')
        return false
      }
    } catch (error) {
      addStatus(`❌ Error checking Sentry initialization: ${error.message}`, 'error')
      return false
    }
  }

  const testCaptureMessage = () => {
    try {
      const testMessage = `Test message from SentryTestComponent at ${new Date().toISOString()}`
      Sentry.captureMessage(testMessage, 'info')
      addStatus(`📤 Sent test message: "${testMessage}"`, 'info')

      // Also test through logger
      logger.info('sentry-test', 'capture-message', { testMessage })
      addStatus('📤 Sent test message through logger', 'info')
    } catch (error) {
      addStatus(`❌ Failed to send message: ${error.message}`, 'error')
    }
  }

  const testCaptureException = () => {
    try {
      /**
       * TEST ERROR: Create identifiable test exception
       * - Timestamp ensures uniqueness
       * - Custom name helps filtering in Sentry
       * - Tags and contexts aid debugging
       */
      const testError = new Error(`Test error from SentryTestComponent at ${new Date().toISOString()}`)
      testError.name = 'TestError'

      Sentry.captureException(testError, {
        tags: {
          test: true, // FILTER: Allows excluding test errors from alerts
          component: 'SentryTestComponent'
        },
        contexts: {
          test: {
            timestamp: new Date().toISOString(),
            purpose: 'Testing Sentry error capture'
          }
        }
      })

      addStatus(`📤 Sent test error: "${testError.message}"`, 'warning')

      // DUAL TEST: Verify logger wrapper also works
      logger.error('sentry-test', 'capture-exception', testError)
      addStatus('📤 Sent test error through logger', 'warning')
    } catch (error) {
      addStatus(`❌ Failed to send error: ${error.message}`, 'error')
    }
  }

  const testBreadcrumbs = () => {
    try {
      Sentry.addBreadcrumb({
        message: 'Test breadcrumb from SentryTestComponent',
        category: 'test',
        level: 'info',
        data: {
          timestamp: new Date().toISOString(),
          testType: 'breadcrumb'
        }
      })
      addStatus('📤 Added test breadcrumb', 'info')

      // Test through logger (breadcrumbs are added automatically for non-error logs)
      logger.debug('sentry-test', 'breadcrumb-test', { testType: 'breadcrumb' })
      addStatus('📤 Added breadcrumb through logger', 'info')
    } catch (error) {
      addStatus(`❌ Failed to add breadcrumb: ${error.message}`, 'error')
    }
  }

  const testUserContext = () => {
    try {
      Sentry.setUser({
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com'
      })
      addStatus('📤 Set test user context', 'info')
    } catch (error) {
      addStatus(`❌ Failed to set user context: ${error.message}`, 'error')
    }
  }

  const testTransaction = () => {
    try {
      /**
       * PERFORMANCE: Test transaction/span tracking
       * Transactions measure performance of operations
       * Spans break down transactions into steps
       */
      const transaction = Sentry.startTransaction({
        name: 'test-transaction',
        op: 'test'
      })

      const span = transaction.startChild({
        op: 'test-span',
        description: 'Testing span creation'
      })

      // ASYNC: Simulate real operation timing
      setTimeout(() => {
        span.finish()
        transaction.finish()
        addStatus('📤 Completed test transaction with span', 'info')
      }, 100)

      addStatus('📤 Started test transaction', 'info')
    } catch (error) {
      addStatus(`❌ Failed to create transaction: ${error.message}`, 'error')
    }
  }

  const testFlush = async () => {
    try {
      addStatus('⏳ Flushing Sentry client...', 'info')
      /**
       * FLUSH: Force send all buffered events
       * - 2000ms timeout prevents hanging
       * - Returns false if timeout exceeded
       * - Critical before app shutdown
       */
      const flushed = await Sentry.flush(2000)
      if (flushed) {
        addStatus('✅ Successfully flushed all events to Sentry', 'success')
      } else {
        addStatus('⚠️ Flush timeout - some events may not have been sent', 'warning')
      }
    } catch (error) {
      addStatus(`❌ Failed to flush: ${error.message}`, 'error')
    }
  }

  const runAllTests = async () => {
    setTestStatus([])
    addStatus('🚀 Starting Sentry tests...', 'info')

    /**
     * PREREQUISITE: Verify Sentry is ready
     * Without initialization, all tests will fail
     */
    const isInitialized = testSentryInitialization()

    if (!isInitialized) {
      // TROUBLESHOOTING: Common initialization issues
      addStatus('⚠️ Sentry initialization failed. Please check:', 'warning')
      addStatus('1. VITE_SENTRY_DSN is set correctly in .env (optional but recommended)', 'warning')
      addStatus('2. Application has been restarted after env changes', 'warning')
      return
    }

    /**
     * TEST SEQUENCE: Order matters
     * 1. Breadcrumbs - context for later errors
     * 2. User context - identifies test session
     * 3. Messages - simplest event type
     * 4. Exceptions - error tracking
     * 5. Transactions - performance monitoring
     */
    testBreadcrumbs()
    testUserContext()
    testCaptureMessage()
    testCaptureException()
    testTransaction()

    // TIMING: Allow async operations to complete
    setTimeout(async () => {
      await testFlush()
      addStatus('✅ All tests completed! Check your Sentry dashboard for events.', 'success')
    }, 500)
  }

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Sentry Integration Test</h2>

        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Environment Status:</h3>
          <div className="space-y-1 text-sm">
            <div>Sentry: ✅ Always Enabled</div>
            <div>VITE_SENTRY_DSN: {import.meta.env.VITE_SENTRY_DSN ? '✅ Custom DSN Set' : '⚠️ Using default (set DSN for production)'}</div>
            <div>Environment: {import.meta.env.MODE}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Run All Tests
          </button>
          <button
            onClick={testSentryInitialization}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Check Init
          </button>
          <button
            onClick={testCaptureMessage}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Message
          </button>
          <button
            onClick={testCaptureException}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Test Error
          </button>
          <button
            onClick={testFlush}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Flush Events
          </button>
        </div>

        <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          {testStatus.length === 0 ? (
            <p className="text-gray-500">Click "Run All Tests" to begin</p>
          ) : (
            <div className="space-y-1">
              {testStatus.map((status, index) => (
                <div key={index} className={`text-sm ${getStatusColor(status.type)}`}>
                  <span className="text-gray-400">[{status.timestamp}]</span> {status.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}