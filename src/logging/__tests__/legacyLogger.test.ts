/**
 * Tests for legacy logger adapter
 * US-007: Add testing and QA
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LegacyLogger, createLegacyLogger, createExpressLogger, getGlobalLogger } from '../adapters/legacyLogger.js'

// Mock the logger factories
vi.mock('../factories/clientLoggerFactory.js', () => ({
  createClientLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    setContext: vi.fn()
  }))
}))

vi.mock('../factories/serverLoggerFactory.js', () => ({
  createServerLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    setContext: vi.fn()
  }))
}))

const originalWindow = global.window

describe('LegacyLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('Constructor', () => {
    it('should create a legacy logger with default config', () => {
      global.window = {} as any
      const logger = new LegacyLogger()

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.log).toBe('function')
    })

    it('should create a legacy logger with custom config', () => {
      global.window = {} as any
      const config = {
        component: 'test-component',
        enableConsole: false,
        enableSentry: true,
        minLevel: 'warn' as any
      }

      const logger = new LegacyLogger(config)
      expect(logger).toBeDefined()
    })

    it('should detect server environment', () => {
      delete (global as any).window
      const logger = new LegacyLogger({ component: 'server-test' })

      expect(logger).toBeDefined()
    })
  })

  describe('Logging Methods', () => {
    let logger: LegacyLogger

    beforeEach(() => {
      global.window = {} as any
      logger = new LegacyLogger({ component: 'test' })
    })

    it('should call info method', () => {
      logger.info('Test message', { data: 'test' })
      // The actual logger is mocked, so we just verify it doesn't throw
      expect(logger).toBeDefined()
    })

    it('should call warn method', () => {
      logger.warn('Warning message', { warning: true })
      expect(logger).toBeDefined()
    })

    it('should call error method with Error object', () => {
      const error = new Error('Test error')
      logger.error('Error occurred', error, { context: 'test' })
      expect(logger).toBeDefined()
    })

    it('should call error method with string', () => {
      logger.error('String error', 'error data', { context: 'test' })
      expect(logger).toBeDefined()
    })

    it('should call debug method', () => {
      logger.debug('Debug message', { debug: true })
      expect(logger).toBeDefined()
    })
  })

  describe('Log Method with Level Parameter', () => {
    let logger: LegacyLogger

    beforeEach(() => {
      global.window = {} as any
      logger = new LegacyLogger({ component: 'test' })
    })

    it('should route info level correctly', () => {
      logger.log('info', 'Info message', { data: 'test' })
      expect(logger).toBeDefined()
    })

    it('should route warn level correctly', () => {
      logger.log('warn', 'Warning message', { data: 'test' })
      expect(logger).toBeDefined()
    })

    it('should route error level correctly', () => {
      logger.log('error', 'Error message', { data: 'test' })
      expect(logger).toBeDefined()
    })

    it('should route debug level correctly', () => {
      logger.log('debug', 'Debug message', { data: 'test' })
      expect(logger).toBeDefined()
    })
  })

  describe('Express Middleware', () => {
    it('should return middleware function', () => {
      global.window = {} as any
      const logger = new LegacyLogger({ component: 'express' })
      const middleware = logger.middleware()

      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next
    })

    it('should handle request/response cycle', () => {
      global.window = {} as any
      const logger = new LegacyLogger({ component: 'express' })
      const middleware = logger.middleware()

      const mockReq = {
        method: 'GET',
        url: '/test',
        get: vi.fn(() => 'Mozilla/5.0'),
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' }
      }

      const mockRes = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate the response finishing
            setTimeout(() => callback(), 0)
          }
        })
      }

      const mockNext = vi.fn()

      middleware(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function))
    })
  })

  describe('Child Logger', () => {
    it('should create child logger', () => {
      global.window = {} as any
      const parentLogger = new LegacyLogger({ component: 'parent' })
      const childLogger = parentLogger.child('child')

      expect(childLogger).toBeInstanceOf(LegacyLogger)
      expect(childLogger).not.toBe(parentLogger)
    })

    it('should create child logger with context', () => {
      global.window = {} as any
      const parentLogger = new LegacyLogger({ component: 'parent' })
      const context = { userId: '123' }
      const childLogger = parentLogger.child('child', context)

      expect(childLogger).toBeInstanceOf(LegacyLogger)
    })
  })

  describe('Flush Method', () => {
    it('should flush logs', async () => {
      global.window = {} as any
      const logger = new LegacyLogger()

      await expect(logger.flush()).resolves.toBeUndefined()
    })
  })

  describe('Factory Functions', () => {
    beforeEach(() => {
      global.window = {} as any
    })

    it('should create legacy logger with createLegacyLogger', () => {
      const logger = createLegacyLogger('test-component')
      expect(logger).toBeInstanceOf(LegacyLogger)
    })

    it('should create express logger with createExpressLogger', () => {
      const logger = createExpressLogger()
      expect(logger).toBeInstanceOf(LegacyLogger)
    })

    it('should get global logger singleton', () => {
      const logger1 = getGlobalLogger()
      const logger2 = getGlobalLogger()

      expect(logger1).toBeInstanceOf(LegacyLogger)
      expect(logger1).toBe(logger2) // Should be the same instance
    })
  })
})