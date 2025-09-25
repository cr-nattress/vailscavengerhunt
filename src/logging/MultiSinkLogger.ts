import { Logger, LogLevel, LogEntry, LogSink, LoggerConfig } from './types'

export class MultiSinkLogger implements Logger {
  private sinks: LogSink[] = []
  private config: LoggerConfig
  private globalContext: Record<string, any> = {}
  private tags: Set<string> = new Set()
  private userId?: string
  private sessionId?: string

  constructor(config: LoggerConfig = { minLevel: LogLevel.INFO }) {
    this.config = config

    if (config.context) {
      this.globalContext = { ...config.context }
    }

    if (config.tags) {
      config.tags.forEach(tag => this.tags.add(tag))
    }

    if (config.userId) {
      this.userId = config.userId
    }

    if (config.sessionId) {
      this.sessionId = config.sessionId
    }
  }

  addSink(sink: LogSink): void {
    this.sinks.push(sink)
  }

  removeSink(sink: LogSink): void {
    const index = this.sinks.indexOf(sink)
    if (index !== -1) {
      this.sinks.splice(index, 1)
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.config.minLevel) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.mergeContext(context),
      error,
      tags: Array.from(this.tags),
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.writeToSinks(entry)
  }

  private mergeContext(localContext?: Record<string, any>): Record<string, any> | undefined {
    if (!this.globalContext && !localContext) {
      return undefined
    }

    return {
      ...this.globalContext,
      ...localContext
    }
  }

  private async writeToSinks(entry: LogEntry): Promise<void> {
    const promises = this.sinks.map(async (sink) => {
      try {
        await sink.write(entry)
      } catch (error) {
        console.error('Error writing to sink:', error)
      }
    })

    await Promise.allSettled(promises)
  }

  setContext(context: Record<string, any>): void {
    this.globalContext = { ...this.globalContext, ...context }
  }

  clearContext(): void {
    this.globalContext = {}
  }

  addTag(tag: string): void {
    this.tags.add(tag)
  }

  removeTags(...tags: string[]): void {
    tags.forEach(tag => this.tags.delete(tag))
  }

  clearTags(): void {
    this.tags.clear()
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
  }

  async flush(): Promise<void> {
    const promises = this.sinks
      .filter(sink => sink.flush)
      .map(async (sink) => {
        try {
          await sink.flush!()
        } catch (error) {
          console.error('Error flushing sink:', error)
        }
      })

    await Promise.allSettled(promises)
  }

  async close(): Promise<void> {
    const promises = this.sinks
      .filter(sink => sink.close)
      .map(async (sink) => {
        try {
          await sink.close!()
        } catch (error) {
          console.error('Error closing sink:', error)
        }
      })

    await Promise.allSettled(promises)
  }
}