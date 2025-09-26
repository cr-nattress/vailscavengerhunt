/**
 * Monitoring and observability utilities for the logging system
 * US-008: Setup rollout and observability
 */

import { LogLevel } from './types'
import { createClientLogger } from './client'

// Conditional import for server logger (Node.js environment only)
let createServerLogger: any = null
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    // Dynamic import to avoid bundling server code in browser
    // Import directly from factory to avoid circular dependency
    const serverModule = require('./factories/serverLoggerFactory')
    createServerLogger = serverModule.createServerLogger
  } catch (e) {
    // Server modules not available in browser - that's expected
    createServerLogger = null
  }
}

interface LoggingMetrics {
  totalLogs: number
  logsByLevel: Record<LogLevel, number>
  errorRate: number
  lastLogTime: Date | null
  averageLogSize: number
  sentryEventsCount: number
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  metrics: LoggingMetrics
  timestamp: Date
}

class LoggingMonitor {
  private metrics: LoggingMetrics = {
    totalLogs: 0,
    logsByLevel: {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    },
    errorRate: 0,
    lastLogTime: null,
    averageLogSize: 0,
    sentryEventsCount: 0,
  }

  private logSizes: number[] = []
  private readonly MAX_LOG_SIZES = 1000 // Keep last 1000 log sizes for average

  /**
   * Record a log event for monitoring
   */
  recordLog(level: LogLevel, size: number = 0, containsPII: boolean = false): void {
    this.metrics.totalLogs++
    this.metrics.logsByLevel[level]++
    this.metrics.lastLogTime = new Date()

    // Track log sizes for average calculation
    this.logSizes.push(size)
    if (this.logSizes.length > this.MAX_LOG_SIZES) {
      this.logSizes.shift()
    }

    this.metrics.averageLogSize = this.logSizes.reduce((a, b) => a + b, 0) / this.logSizes.length

    // Calculate error rate
    const errorCount = this.metrics.logsByLevel[LogLevel.ERROR]
    this.metrics.errorRate = this.metrics.totalLogs > 0 ? (errorCount / this.metrics.totalLogs) * 100 : 0

  }

  /**
   * Record a Sentry event
   */
  recordSentryEvent(): void {
    this.metrics.sentryEventsCount++
  }

  /**
   * Get current metrics
   */
  getMetrics(): LoggingMetrics {
    return { ...this.metrics }
  }

  /**
   * Perform health check on logging system
   */
  performHealthCheck(): HealthCheckResult {
    const now = new Date()
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let message = 'Logging system is operating normally'

    // Check if we've received logs recently (within last 5 minutes)
    if (this.metrics.lastLogTime) {
      const timeSinceLastLog = now.getTime() - this.metrics.lastLogTime.getTime()
      const fiveMinutes = 5 * 60 * 1000

      if (timeSinceLastLog > fiveMinutes) {
        status = 'degraded'
        message = 'No recent log activity detected'
      }
    } else if (this.metrics.totalLogs === 0) {
      status = 'degraded'
      message = 'No logs recorded yet'
    }

    // Check error rate
    if (this.metrics.errorRate > 10) {
      status = 'unhealthy'
      message = `High error rate: ${this.metrics.errorRate.toFixed(2)}%`
    } else if (this.metrics.errorRate > 5) {
      status = 'degraded'
      message = `Elevated error rate: ${this.metrics.errorRate.toFixed(2)}%`
    }

    // Check average log size (flag if unusually large)
    if (this.metrics.averageLogSize > 10000) {
      status = status === 'healthy' ? 'degraded' : status
      message = `Large average log size: ${this.metrics.averageLogSize.toFixed(0)} characters`
    }

    return {
      status,
      message,
      metrics: this.getMetrics(),
      timestamp: now
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0
      },
      errorRate: 0,
      lastLogTime: null,
      averageLogSize: 0,
      sentryEventsCount: 0
    }
    this.logSizes = []
  }

  /**
   * Generate a metrics report
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const healthCheck = this.performHealthCheck()

    return `
Logging System Metrics Report
============================
Generated: ${new Date().toISOString()}
Status: ${healthCheck.status.toUpperCase()} - ${healthCheck.message}

Log Statistics:
- Total Logs: ${metrics.totalLogs}
- Debug Logs: ${metrics.logsByLevel[LogLevel.DEBUG]}
- Info Logs: ${metrics.logsByLevel[LogLevel.INFO]}
- Warning Logs: ${metrics.logsByLevel[LogLevel.WARN]}
- Error Logs: ${metrics.logsByLevel[LogLevel.ERROR]}
- Error Rate: ${metrics.errorRate.toFixed(2)}%

Performance:
- Average Log Size: ${metrics.averageLogSize.toFixed(0)} characters
- Last Log: ${metrics.lastLogTime ? metrics.lastLogTime.toISOString() : 'Never'}

Privacy & Security:
- Sentry Events: ${metrics.sentryEventsCount}

Recommendations:
${this.generateRecommendations(metrics)}
    `.trim()
  }

  private generateRecommendations(metrics: LoggingMetrics): string {
    const recommendations: string[] = []

    if (metrics.errorRate > 5) {
      recommendations.push('- Consider investigating high error rates')
    }

    if (metrics.averageLogSize > 5000) {
      recommendations.push('- Review log content size - consider reducing verbosity')
    }

    if (metrics.sentryEventsCount === 0 && metrics.logsByLevel[LogLevel.ERROR] > 0) {
      recommendations.push('- Check Sentry integration - errors not reaching Sentry')
    }

    if (metrics.totalLogs === 0) {
      recommendations.push('- Logging system may not be properly configured')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- System is operating optimally'
  }
}

// Global monitor instance
const globalMonitor = new LoggingMonitor()

/**
 * Get the global logging monitor instance
 */
export function getLoggingMonitor(): LoggingMonitor {
  return globalMonitor
}

/**
 * Test logging system functionality
 */
export async function testLoggingSystem(): Promise<HealthCheckResult> {
  const isServer = typeof window === 'undefined'

  try {
    // Create appropriate logger for environment
    const logger = isServer
      ? createServerLogger({
          minLevel: LogLevel.DEBUG,
          enableConsole: false, // Don't spam console during test
          enableSentry: false,  // Don't send test events to Sentry
          tags: ['health-check']
        })
      : createClientLogger({
          minLevel: LogLevel.DEBUG,
          enableConsole: false,
          enableSentry: false,
          tags: ['health-check']
        })

    // Test different log levels
    logger.debug('health-check', 'test-debug', { test: true })
    logger.info('health-check', 'test-info', { test: true })
    logger.warn('health-check', 'test-warn', { test: true })

    // Test error logging
    try {
      throw new Error('Test error for health check')
    } catch (error) {
      logger.error('health-check', 'test-error', error as Error, { test: true })
    }

    // Test PII redaction
    logger.info('health-check', 'test-pii', {
      email: 'test@example.com', // Should be redacted
      safeData: 'not-sensitive'
    })

    // Flush logs
    await logger.flush()

    return globalMonitor.performHealthCheck()
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Logging system test failed: ${(error as Error).message}`,
      metrics: globalMonitor.getMetrics(),
      timestamp: new Date()
    }
  }
}

/**
 * Start periodic health checks
 */
export function startHealthChecks(intervalMs: number = 60000): () => void {
  const interval = setInterval(() => {
    const healthCheck = globalMonitor.performHealthCheck()

    if (healthCheck.status !== 'healthy') {
      console.warn(`[LoggingMonitor] ${healthCheck.status.toUpperCase()}: ${healthCheck.message}`)
    }
  }, intervalMs)

  // Return cleanup function
  return () => {
    clearInterval(interval)
  }
}

/**
 * Export the monitor class for advanced usage
 */
export { LoggingMonitor }