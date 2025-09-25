import { Logger, LoggerConfig, LogLevel } from '../types'
import { MultiSinkLogger } from '../MultiSinkLogger'
import { ConsoleSink } from '../sinks/ConsoleSink'
import { ClientFileSink } from '../sinks/ClientFileSink'
import { SentryBrowserSink } from '../sinks/SentryBrowserSink'

export interface ClientLoggerFactoryConfig {
  minLevel?: LogLevel
  enableConsole?: boolean
  enableFile?: boolean
  enableSentry?: boolean
  fileEndpoint?: string
  fileBatchSize?: number
  fileFlushInterval?: number
  tags?: string[]
  context?: Record<string, any>
}

export function createClientLogger(config: ClientLoggerFactoryConfig = {}): Logger {
  const {
    minLevel = LogLevel.INFO,
    enableConsole = true,
    enableFile = false,
    enableSentry = false,
    fileEndpoint = '/.netlify/functions/write-log',
    fileBatchSize = 10,
    fileFlushInterval = 5000,
    tags,
    context
  } = config

  const loggerConfig: LoggerConfig = {
    minLevel,
    tags,
    context
  }

  const logger = new MultiSinkLogger(loggerConfig)

  if (enableConsole) {
    const consoleSink = new ConsoleSink({
      minLevel,
      colorize: false, // Disable colors in browser console
      includeTimestamp: true
    })
    logger.addSink(consoleSink)
  }

  if (enableFile && fileEndpoint) {
    const fileSink = new ClientFileSink({
      endpoint: fileEndpoint,
      minLevel,
      batchSize: fileBatchSize,
      flushInterval: fileFlushInterval,
      maxRetries: 3,
      retryDelay: 1000
    })
    logger.addSink(fileSink)
  }

  if (enableSentry) {
    const sentrySink = new SentryBrowserSink()
    logger.addSink(sentrySink)
  }

  // Auto-generate session ID for client loggers
  const sessionId = generateSessionId()
  logger.setSessionId(sessionId)

  return logger
}

function generateSessionId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createPhotoFlowLogger(): Logger {
  return createClientLogger({
    minLevel: LogLevel.DEBUG,
    enableConsole: true,
    enableFile: true,
    enableSentry: true,  // Always enable Sentry
    fileBatchSize: 5,
    fileFlushInterval: 3000,
    tags: ['photo-flow'],
    context: {
      component: 'photo-upload'
    }
  })
}

export function createUILogger(): Logger {
  return createClientLogger({
    minLevel: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    enableSentry: true,  // Always enable Sentry
    tags: ['ui'],
    context: {
      environment: 'browser'
    }
  })
}