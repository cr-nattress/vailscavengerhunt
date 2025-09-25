import * as Sentry from '@sentry/node'
import { LogSink, LogEntry, LogLevel } from '../types'
import { redactPII } from '../piiRedaction.js'

export class SentryNodeSink implements LogSink {
  private isEnabled: boolean

  constructor() {
    // Check if Sentry is initialized
    this.isEnabled = this.checkSentryAvailable()
  }

  private checkSentryAvailable(): boolean {
    try {
      return Sentry.getCurrentScope() !== undefined
    } catch {
      return false
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    try {
      const { component, action, data, message, level, timestamp, context, tags, userId, sessionId } = entry

      // Set user context if provided
      if (userId || sessionId) {
        Sentry.setUser({
          id: userId,
          ...(sessionId && { sessionId }),
        })
      }

      // Set tags if provided
      if (tags && tags.length > 0) {
        Sentry.setTags(
          tags.reduce((acc, tag) => {
            acc[tag] = true
            return acc
          }, {} as Record<string, boolean>)
        )
      }

      // Add context data
      const contextData = {
        component,
        action,
        ...(data && { data: this.sanitizeData(data) }),
        ...(context && { context: this.sanitizeData(context) }),
        timestamp: timestamp.toISOString(),
      }

      if (level === LogLevel.ERROR) {
        // For errors, capture as exceptions
        if (data instanceof Error) {
          Sentry.captureException(data, {
            tags: {
              component,
              action,
            },
            extra: contextData,
            fingerprint: [component, action, data.message],
          })
        } else {
          // If no error object, create one from the message
          const error = new Error(message || `Error in ${component}:${action}`)
          Sentry.captureException(error, {
            tags: {
              component,
              action,
            },
            extra: contextData,
            fingerprint: [component, action, error.message],
          })
        }
      } else {
        // For info, warn, debug - add as breadcrumbs
        Sentry.addBreadcrumb({
          category: component,
          message: `${action}${message ? ': ' + message : ''}`,
          level: this.mapLogLevelToBreadcrumbLevel(level),
          data: contextData,
          timestamp: timestamp.getTime() / 1000, // Sentry expects timestamp in seconds
        })
      }
    } catch (error) {
      // Fail silently to not disrupt application flow
      console.warn('[SentryNodeSink] Failed to log entry:', error)
    }
  }

  private mapLogLevelToBreadcrumbLevel(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case LogLevel.ERROR:
        return 'error'
      case LogLevel.WARN:
        return 'warning'
      case LogLevel.INFO:
        return 'info'
      case LogLevel.DEBUG:
        return 'debug'
      default:
        return 'info'
    }
  }

  /**
   * Sanitize data to remove sensitive information and large payloads
   * Uses comprehensive PII redaction (US-004)
   */
  private sanitizeData(data: any): any {
    if (!data) return data

    try {
      return redactPII(data)
    } catch (error) {
      console.warn('[SentryNodeSink] Failed to sanitize data:', error)
      return '[SANITIZATION_ERROR]'
    }
  }

  async flush(): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    try {
      // Flush Sentry client - wait up to 2 seconds
      await Sentry.flush(2000)
    } catch (error) {
      console.warn('[SentryNodeSink] Failed to flush:', error)
    }
  }

  async close(): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    try {
      await Sentry.flush(5000)
    } catch (error) {
      console.warn('[SentryNodeSink] Failed to close:', error)
    }

    this.isEnabled = false
  }
}