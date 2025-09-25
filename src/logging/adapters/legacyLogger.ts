/**
 * Legacy logger adapter
 * US-005: Create backward-compatible adapters
 *
 * This adapter provides a backward-compatible interface for existing logging patterns
 * while routing everything through our new unified logging system.
 * Fixed: Client-only imports for browser compatibility
 */

import { createClientLogger } from '../factories/clientLoggerFactory.js'
import { LogLevel, Logger } from '../types.js'

interface LegacyLoggerConfig {
  component?: string
  enableConsole?: boolean
  enableSentry?: boolean
  minLevel?: LogLevel
}

/**
 * Legacy logger that maintains compatibility with existing code patterns
 */
export class LegacyLogger {
  private logger: Logger
  private component: string

  constructor(config: LegacyLoggerConfig = {}) {
    const {
      component = 'legacy',
      enableConsole = true,
      enableSentry = true,
      minLevel = LogLevel.INFO
    } = config

    this.component = component

    // Always use client logger to avoid importing Node.js modules in browser
    this.logger = createClientLogger({
      minLevel,
      enableConsole,
      enableSentry,
      tags: ['legacy-logger', component]
    })
  }

  // Standard logging methods
  info(message: string, data?: any): void {
    this.logger.info(this.component, 'info', { message, data })
  }

  warn(message: string, data?: any): void {
    this.logger.warn(this.component, 'warn', { message, data })
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (error instanceof Error) {
      this.logger.error(this.component, 'error', error, { message, data })
    } else {
      this.logger.error(this.component, 'error', new Error(message), {
        message,
        errorData: error,
        data
      })
    }
  }

  debug(message: string, data?: any): void {
    this.logger.debug(this.component, 'debug', { message, data })
  }

  // Common legacy patterns
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    switch (level) {
      case 'info':
        this.info(message, data)
        break
      case 'warn':
        this.warn(message, data)
        break
      case 'error':
        this.error(message, data)
        break
      case 'debug':
        this.debug(message, data)
        break
    }
  }

  // Express-style logging
  middleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now()

      res.on('finish', () => {
        const duration = Date.now() - start
        const level = res.statusCode >= 400 ? 'warn' : 'info'

        this.log(level, `${req.method} ${req.url}`, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection?.remoteAddress
        })
      })

      next()
    }
  }

  // Child logger creation (common pattern)
  child(childComponent: string, context?: Record<string, any>): LegacyLogger {
    const childLogger = new LegacyLogger({
      component: `${this.component}.${childComponent}`
    })

    if (context) {
      // Set context on the underlying logger
      childLogger.logger.setContext(context)
    }

    return childLogger
  }

  // Flush logs (useful for shutdown)
  async flush(): Promise<void> {
    await this.logger.flush()
  }
}

/**
 * Factory functions for creating legacy loggers
 */
export function createLegacyLogger(component?: string): LegacyLogger {
  return new LegacyLogger({ component })
}

export function createExpressLogger(): LegacyLogger {
  return new LegacyLogger({
    component: 'express',
    enableSentry: !!process.env.SENTRY_DSN
  })
}

export function createApiLogger(apiName?: string): LegacyLogger {
  return new LegacyLogger({
    component: apiName ? `api.${apiName}` : 'api',
    enableSentry: !!process.env.SENTRY_DSN
  })
}

// Global logger instance for simple cases
let globalLegacyLogger: LegacyLogger | null = null

export function getGlobalLogger(): LegacyLogger {
  if (!globalLegacyLogger) {
    globalLegacyLogger = new LegacyLogger({ component: 'global' })
  }
  return globalLegacyLogger
}