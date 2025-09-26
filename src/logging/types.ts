export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  error?: Error
  tags?: string[]
  userId?: string
  sessionId?: string
  // Added to support Sentry sinks usage
  component?: string
  action?: string
  data?: any
}

export interface LogSink {
  write(entry: LogEntry): Promise<void>
  flush?(): Promise<void>
  close?(): Promise<void>
}

export interface Logger {
  debug(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, error?: Error, context?: Record<string, any>): void

  setContext(context: Record<string, any>): void
  clearContext(): void

  addTag(tag: string): void
  removeTags(...tags: string[]): void
  clearTags(): void

  setUserId(userId: string): void
  setSessionId(sessionId: string): void

  flush(): Promise<void>
  close(): Promise<void>
}

export interface LoggerConfig {
  minLevel: LogLevel
  tags?: string[]
  context?: Record<string, any>
  userId?: string
  sessionId?: string
}

export interface SinkConfig {
  minLevel?: LogLevel
  tags?: string[]
}

export interface ConsoleSinkConfig extends SinkConfig {
  colorize?: boolean
  includeTimestamp?: boolean
}

export interface FileSinkConfig extends SinkConfig {
  filePath: string
  maxFileSize?: number
  maxFiles?: number
}

export interface ClientFileSinkConfig extends SinkConfig {
  endpoint: string
  batchSize?: number
  flushInterval?: number
  maxRetries?: number
  retryDelay?: number
}