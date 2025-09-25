/**
 * Backward-compatible console adapter
 * US-005: Create backward-compatible adapters
 *
 * This adapter provides console.* method replacements that integrate with our logging system
 * while maintaining the same API as the native console methods.
 */

import { createClientLogger } from '../factories/clientLoggerFactory.js'
import { LogLevel } from '../types.js'

// Always use client logger to avoid importing Node.js modules in browser
const logger = createClientLogger({
  minLevel: LogLevel.DEBUG,
  enableSentry: true,
  tags: ['console-adapter']
})

/**
 * Enhanced console methods that integrate with our logging system
 */
export const enhancedConsole = {
  log: (...args: any[]) => {
    // Call original console.log for immediate visibility
    console.log(...args)

    // Log through our system
    logger.info('console', 'log', {
      message: args.map(arg =>
        typeof arg === 'string' ? arg :
        typeof arg === 'object' ? JSON.stringify(arg) :
        String(arg)
      ).join(' '),
      args: args.length <= 5 ? args : args.slice(0, 5), // Limit args to prevent large payloads
    })
  },

  info: (...args: any[]) => {
    console.info(...args)
    logger.info('console', 'info', {
      message: args.map(arg =>
        typeof arg === 'string' ? arg :
        typeof arg === 'object' ? JSON.stringify(arg) :
        String(arg)
      ).join(' '),
      args: args.length <= 5 ? args : args.slice(0, 5),
    })
  },

  warn: (...args: any[]) => {
    console.warn(...args)
    logger.warn('console', 'warn', {
      message: args.map(arg =>
        typeof arg === 'string' ? arg :
        typeof arg === 'object' ? JSON.stringify(arg) :
        String(arg)
      ).join(' '),
      args: args.length <= 5 ? args : args.slice(0, 5),
    })
  },

  error: (...args: any[]) => {
    console.error(...args)

    // Handle Error objects specially
    const errorObj = args.find(arg => arg instanceof Error)
    if (errorObj) {
      logger.error('console', 'error', errorObj, {
        message: args.map(arg =>
          arg instanceof Error ? `${arg.name}: ${arg.message}` :
          typeof arg === 'string' ? arg :
          typeof arg === 'object' ? JSON.stringify(arg) :
          String(arg)
        ).join(' '),
        args: args.length <= 5 ? args : args.slice(0, 5),
      })
    } else {
      logger.error('console', 'error', new Error(args.join(' ')), {
        message: args.map(arg =>
          typeof arg === 'string' ? arg :
          typeof arg === 'object' ? JSON.stringify(arg) :
          String(arg)
        ).join(' '),
        args: args.length <= 5 ? args : args.slice(0, 5),
      })
    }
  },

  debug: (...args: any[]) => {
    console.debug(...args)
    logger.debug('console', 'debug', {
      message: args.map(arg =>
        typeof arg === 'string' ? arg :
        typeof arg === 'object' ? JSON.stringify(arg) :
        String(arg)
      ).join(' '),
      args: args.length <= 5 ? args : args.slice(0, 5),
    })
  },

  // Additional console methods for completeness
  trace: (...args: any[]) => {
    console.trace(...args)
    logger.debug('console', 'trace', {
      message: args.map(arg =>
        typeof arg === 'string' ? arg :
        typeof arg === 'object' ? JSON.stringify(arg) :
        String(arg)
      ).join(' '),
      args: args.length <= 5 ? args : args.slice(0, 5),
    })
  },

  // Pass-through methods that don't need logging
  clear: console.clear.bind(console),
  count: console.count.bind(console),
  countReset: console.countReset.bind(console),
  time: console.time.bind(console),
  timeEnd: console.timeEnd.bind(console),
  timeLog: console.timeLog.bind(console),
  table: console.table.bind(console),
  group: console.group.bind(console),
  groupCollapsed: console.groupCollapsed.bind(console),
  groupEnd: console.groupEnd.bind(console),
}

/**
 * Install the enhanced console globally
 * This replaces the global console with our enhanced version
 */
export function installEnhancedConsole(): void {
  if (typeof globalThis !== 'undefined') {
    // Store original console for restoration if needed
    ;(globalThis as any).__originalConsole = globalThis.console

    // Replace global console
    globalThis.console = enhancedConsole as any
  }
}

/**
 * Restore the original console
 */
export function restoreOriginalConsole(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__originalConsole) {
    globalThis.console = (globalThis as any).__originalConsole
    delete (globalThis as any).__originalConsole
  }
}