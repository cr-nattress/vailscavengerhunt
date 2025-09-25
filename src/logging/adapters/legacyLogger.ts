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

// Conditional import for server logger
let createServerLogger: any = null
const isServer = typeof window === 'undefined'
if (isServer) {
  try {
    const serverModule = require('../factories/serverLoggerFactory')
    createServerLogger = serverModule.createServerLogger
  } catch (e) {
    createServerLogger = null
  }
}

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

    // Use appropriate logger based on environment
    if (isServer && createServerLogger) {
      this.logger = createServerLogger({
        minLevel,
        enableConsole,
        enableSentry,
        tags: ['legacy-logger', component]
      })
    } else {
      this.logger = createClientLogger({
        minLevel,
        enableConsole,
        enableSentry,
        tags: ['legacy-logger', component]
      })
    }
  }

  // Standard logging methods with overloads for backward compatibility
  info(messageOrComponent: string, messageOrData?: string | any, data?: any): void {
    if (typeof messageOrData === 'string' && data !== undefined) {
      // Legacy 3-parameter format: info(component, message, data)
      this.logger.info(messageOrData, { component: this.component, ...data })
    } else if (typeof messageOrData === 'string') {
      // Legacy 2-parameter format: info(component, message)
      this.logger.info(messageOrData, { component: this.component })
    } else {
      // New format: info(message, data)
      const contextData = messageOrData && typeof messageOrData === 'object' ? messageOrData : {}
      this.logger.info(messageOrComponent, { component: this.component, ...contextData })
    }
  }

  warn(messageOrComponent: string, messageOrData?: string | any, data?: any): void {
    if (typeof messageOrData === 'string' && data !== undefined) {
      // Legacy 3-parameter format: warn(component, message, data)
      this.logger.warn(messageOrData, { component: this.component, ...data })
    } else if (typeof messageOrData === 'string') {
      // Legacy 2-parameter format: warn(component, message)
      this.logger.warn(messageOrData, { component: this.component })
    } else {
      // New format: warn(message, data)
      const contextData = messageOrData && typeof messageOrData === 'object' ? messageOrData : {}
      this.logger.warn(messageOrComponent, { component: this.component, ...contextData })
    }
  }

  error(messageOrComponent: string, errorOrMessage?: Error | string | any, dataOrError?: any, data?: any): void {
    if (typeof errorOrMessage === 'string' && dataOrError instanceof Error) {
      // Legacy 4-parameter format: error(component, message, error, data)
      this.logger.error(errorOrMessage, dataOrError, { component: this.component, ...data })
    } else if (typeof errorOrMessage === 'string' && dataOrError && typeof dataOrError === 'object' && !(dataOrError instanceof Error)) {
      // Legacy 3-parameter format: error(component, message, data)
      this.logger.error(errorOrMessage, new Error(errorOrMessage), { component: this.component, ...dataOrError })
    } else if (typeof errorOrMessage === 'string') {
      // Legacy 2-parameter format: error(component, message)
      this.logger.error(errorOrMessage, new Error(errorOrMessage), { component: this.component })
    } else if (errorOrMessage instanceof Error) {
      // New format: error(message, error, data)
      this.logger.error(messageOrComponent, errorOrMessage, { component: this.component, ...dataOrError })
    } else {
      // New format: error(message, data)
      const contextData = errorOrMessage && typeof errorOrMessage === 'object' ? errorOrMessage : {}
      this.logger.error(messageOrComponent, new Error(messageOrComponent), { component: this.component, ...contextData })
    }
  }

  debug(messageOrComponent: string, messageOrData?: string | any, data?: any): void {
    if (typeof messageOrData === 'string' && data !== undefined) {
      // Legacy 3-parameter format: debug(component, message, data)
      this.logger.debug(messageOrData, { component: this.component, ...data })
    } else if (typeof messageOrData === 'string') {
      // Legacy 2-parameter format: debug(component, message)
      this.logger.debug(messageOrData, { component: this.component })
    } else {
      // New format: debug(message, data)
      const contextData = messageOrData && typeof messageOrData === 'object' ? messageOrData : {}
      this.logger.debug(messageOrComponent, { component: this.component, ...contextData })
    }
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
  const enableSentry = isServer ?
    !!process.env.SENTRY_DSN :
    !!(import.meta.env && import.meta.env.VITE_ENABLE_SENTRY === 'true')

  return new LegacyLogger({
    component: 'express',
    enableSentry
  })
}

export function createApiLogger(apiName?: string): LegacyLogger {
  const enableSentry = isServer ?
    !!process.env.SENTRY_DSN :
    !!(import.meta.env && import.meta.env.VITE_ENABLE_SENTRY === 'true')

  return new LegacyLogger({
    component: apiName ? `api.${apiName}` : 'api',
    enableSentry
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