import { LogEntry, LogLevel, LogSink, ConsoleSinkConfig } from '../types'

export class ConsoleSink implements LogSink {
  private config: ConsoleSinkConfig
  private isServer: boolean

  constructor(config: ConsoleSinkConfig = {}) {
    this.config = {
      colorize: true,
      includeTimestamp: true,
      ...config
    }

    this.isServer = typeof window === 'undefined'
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.shouldSkipEntry(entry)) {
      return
    }

    const formattedMessage = this.formatMessage(entry)
    this.writeToConsole(entry.level, formattedMessage)
  }

  private shouldSkipEntry(entry: LogEntry): boolean {
    if (this.config.minLevel !== undefined && entry.level < this.config.minLevel) {
      return true
    }

    if (this.config.tags && this.config.tags.length > 0) {
      const entryTags = entry.tags || []
      const hasMatchingTag = this.config.tags.some(tag => entryTags.includes(tag))
      if (!hasMatchingTag) {
        return true
      }
    }

    return false
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = []

    if (this.config.includeTimestamp) {
      const timestamp = entry.timestamp.toISOString()
      parts.push(this.colorize(`[${timestamp}]`, 'gray'))
    }

    const levelStr = LogLevel[entry.level].toUpperCase().padEnd(5)
    parts.push(this.colorize(`[${levelStr}]`, this.getLevelColor(entry.level)))

    if (entry.tags && entry.tags.length > 0) {
      const tagsStr = entry.tags.map(tag => `#${tag}`).join(' ')
      parts.push(this.colorize(`[${tagsStr}]`, 'cyan'))
    }

    if (entry.userId) {
      parts.push(this.colorize(`[user:${entry.userId}]`, 'blue'))
    }

    if (entry.sessionId) {
      parts.push(this.colorize(`[session:${entry.sessionId.substring(0, 8)}]`, 'blue'))
    }

    parts.push(entry.message)

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push('\n  Context:', JSON.stringify(entry.context, null, 2))
    }

    if (entry.error) {
      parts.push('\n  Error:', entry.error.stack || entry.error.message)
    }

    return parts.join(' ')
  }

  private colorize(text: string, color: string): string {
    if (!this.config.colorize) {
      return text
    }

    if (!this.isServer) {
      return text
    }

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    }

    const colorCode = colors[color] || ''
    const resetCode = colors.reset || ''

    return `${colorCode}${text}${resetCode}`
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'gray'
      case LogLevel.INFO:
        return 'blue'
      case LogLevel.WARN:
        return 'yellow'
      case LogLevel.ERROR:
        return 'red'
      default:
        return 'gray'
    }
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message)
        break
      case LogLevel.INFO:
        console.info(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      case LogLevel.ERROR:
        console.error(message)
        break
      default:
        console.log(message)
        break
    }
  }
}