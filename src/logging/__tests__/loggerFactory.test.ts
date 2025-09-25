/**
 * Tests for logger factory functions
 * US-007: Add testing and QA
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClientLogger } from '../factories/clientLoggerFactory.js'
import { createServerLogger } from '../factories/serverLoggerFactory.js'
import { LogLevel } from '../types.js'

// Mock window to simulate browser/server environments
const originalWindow = global.window

describe('Logger Factories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('createClientLogger', () => {
    beforeEach(() => {
      // Mock browser environment
      global.window = {} as any
    })

    it('should create a client logger with default settings', () => {
      const logger = createClientLogger()

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.flush).toBe('function')
      expect(typeof logger.setContext).toBe('function')
    })

    it('should create a client logger with custom config', () => {
      const config = {
        minLevel: LogLevel.DEBUG,
        enableConsole: false,
        enableSentry: true,
        tags: ['test-tag']
      }

      const logger = createClientLogger(config)
      expect(logger).toBeDefined()
    })

    it('should handle missing window object gracefully', () => {
      delete (global as any).window

      const logger = createClientLogger()
      expect(logger).toBeDefined()
    })
  })

  describe('createServerLogger', () => {
    beforeEach(() => {
      // Mock server environment (no window)
      delete (global as any).window
    })

    it('should create a server logger with default settings', () => {
      const logger = createServerLogger()

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.flush).toBe('function')
      expect(typeof logger.setContext).toBe('function')
    })

    it('should create a server logger with custom config', () => {
      const config = {
        minLevel: LogLevel.WARN,
        enableConsole: true,
        enableSentry: false,
        enableFileLogging: true,
        tags: ['server-tag'],
        logFilePath: './test.log'
      }

      const logger = createServerLogger(config)
      expect(logger).toBeDefined()
    })
  })

  describe('Logger Functionality', () => {
    beforeEach(() => {
      global.window = {} as any
    })

    it('should log messages at different levels', async () => {
      const logger = createClientLogger({
        minLevel: LogLevel.DEBUG,
        enableConsole: true,
        enableSentry: false
      })

      // These should not throw errors
      expect(() => {
        logger.debug('test-component', 'test-action', { message: 'Debug message' })
        logger.info('test-component', 'test-action', { message: 'Info message' })
        logger.warn('test-component', 'test-action', { message: 'Warning message' })
        logger.error('test-component', 'test-action', new Error('Test error'), { message: 'Error message' })
      }).not.toThrow()
    })

    it('should set and use context', () => {
      const logger = createClientLogger()
      const context = { userId: '123', sessionId: 'abc' }

      expect(() => {
        logger.setContext(context)
        logger.info('test-component', 'test-action', { message: 'With context' })
      }).not.toThrow()
    })

    it('should flush logs', async () => {
      const logger = createClientLogger()

      await expect(logger.flush()).resolves.toBeUndefined()
    })

    it('should handle errors gracefully', () => {
      const logger = createClientLogger()

      expect(() => {
        logger.error('test-component', 'test-action', new Error('Test error'))
        logger.error('test-component', 'test-action', 'String error')
        logger.error('test-component', 'test-action', { customError: true })
      }).not.toThrow()
    })
  })

  describe('Environment Detection', () => {
    it('should detect browser environment correctly', () => {
      global.window = {} as any

      const logger = createClientLogger()
      expect(logger).toBeDefined()
    })

    it('should detect server environment correctly', () => {
      delete (global as any).window

      const logger = createServerLogger()
      expect(logger).toBeDefined()
    })
  })
})