import { Logger, LoggerConfig, LogLevel } from '../types'
import { MultiSinkLogger } from '../MultiSinkLogger'
import { ConsoleSink } from '../sinks/ConsoleSink'
import { ServerFileSink } from '../sinks/ServerFileSink'
import { SentryNodeSink } from '../sinks/SentryNodeSink'
import * as path from 'path'

export interface ServerLoggerFactoryConfig {
  minLevel?: LogLevel
  enableConsole?: boolean
  enableFile?: boolean
  enableSentry?: boolean
  logDir?: string
  logFileName?: string
  maxFileSize?: number
  maxFiles?: number
  tags?: string[]
  context?: Record<string, any>
}

export function createServerLogger(config: ServerLoggerFactoryConfig = {}): Logger {
  const {
    minLevel = LogLevel.INFO,
    enableConsole = true,
    enableFile = true,
    enableSentry = true,  // Always enable Sentry by default
    logDir = './logs',
    logFileName = 'server.log',
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5,
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
      colorize: true, // Enable colors in server console
      includeTimestamp: true
    })
    logger.addSink(consoleSink)
  }

  if (enableFile) {
    const logFilePath = path.join(logDir, logFileName)
    const fileSink = new ServerFileSink({
      filePath: logFilePath,
      minLevel,
      maxFileSize,
      maxFiles
    })
    logger.addSink(fileSink)
  }

  if (enableSentry) {
    const sentrySink = new SentryNodeSink()
    logger.addSink(sentrySink)
  }

  // Auto-generate session ID for server loggers
  const sessionId = generateSessionId()
  logger.setSessionId(sessionId)

  return logger
}

function generateSessionId(): string {
  return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createExpressServerLogger(): Logger {
  return createServerLogger({
    minLevel: LogLevel.INFO,
    enableConsole: true,
    enableFile: true,
    enableSentry: true,  // Always enable Sentry
    logFileName: 'express-server.log',
    tags: ['express', 'server'],
    context: {
      service: 'express-api',
      environment: process.env.NODE_ENV || 'development'
    }
  })
}

export function createNetlifyFunctionLogger(functionName: string): Logger {
  return createServerLogger({
    minLevel: LogLevel.DEBUG,
    enableConsole: true,
    enableFile: false, // Netlify handles file logging
    enableSentry: true,  // Always enable Sentry
    tags: ['netlify-function', functionName],
    context: {
      service: 'netlify-function',
      function: functionName,
      environment: process.env.NETLIFY ? 'production' : 'development'
    }
  })
}