import { LogEntry, LogSink, FileSinkConfig } from '../types'
import * as fs from 'fs'
import * as path from 'path'

export class ServerFileSink implements LogSink {
  private config: FileSinkConfig
  private writeStream?: fs.WriteStream
  private currentFileSize: number = 0
  private currentFileIndex: number = 0

  constructor(config: FileSinkConfig) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    }

    this.ensureDirectoryExists()
    this.openLogFile()
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.shouldSkipEntry(entry)) {
      return
    }

    const logLine = this.formatLogEntry(entry)
    const logLineWithNewline = logLine + '\n'

    if (this.shouldRotateFile(logLineWithNewline)) {
      await this.rotateFile()
    }

    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        reject(new Error('Log file not open'))
        return
      }

      this.writeStream.write(logLineWithNewline, (error) => {
        if (error) {
          reject(error)
        } else {
          this.currentFileSize += Buffer.byteLength(logLineWithNewline, 'utf8')
          resolve()
        }
      })
    })
  }

  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        resolve()
        return
      }

      this.writeStream.flush((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.writeStream) {
        resolve()
        return
      }

      this.writeStream.end(() => {
        this.writeStream = undefined
        resolve()
      })
    })
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

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toString().padEnd(5)

    const parts = [
      timestamp,
      `[${level}]`,
      entry.message
    ]

    if (entry.tags && entry.tags.length > 0) {
      parts.push(`[tags: ${entry.tags.join(', ')}]`)
    }

    if (entry.userId) {
      parts.push(`[user: ${entry.userId}]`)
    }

    if (entry.sessionId) {
      parts.push(`[session: ${entry.sessionId}]`)
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`[context: ${JSON.stringify(entry.context)}]`)
    }

    if (entry.error) {
      parts.push(`[error: ${entry.error.name}: ${entry.error.message}]`)
      if (entry.error.stack) {
        parts.push(`[stack: ${entry.error.stack}]`)
      }
    }

    return parts.join(' ')
  }

  private ensureDirectoryExists(): void {
    const logDir = path.dirname(this.config.filePath)

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  private openLogFile(): void {
    const filePath = this.getLogFilePath()

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      this.currentFileSize = stats.size
    } else {
      this.currentFileSize = 0
    }

    this.writeStream = fs.createWriteStream(filePath, { flags: 'a' })

    this.writeStream.on('error', (error) => {
      console.error('[ServerFileSink] Write stream error:', error)
    })
  }

  private getLogFilePath(): string {
    if (this.currentFileIndex === 0) {
      return this.config.filePath
    }

    const ext = path.extname(this.config.filePath)
    const basename = path.basename(this.config.filePath, ext)
    const dirname = path.dirname(this.config.filePath)

    return path.join(dirname, `${basename}.${this.currentFileIndex}${ext}`)
  }

  private shouldRotateFile(newLogLine: string): boolean {
    const newLogSize = Buffer.byteLength(newLogLine, 'utf8')
    return this.currentFileSize + newLogSize > this.config.maxFileSize!
  }

  private async rotateFile(): Promise<void> {
    await this.close()

    this.cleanupOldFiles()

    this.currentFileIndex++
    this.currentFileSize = 0

    this.openLogFile()
  }

  private cleanupOldFiles(): void {
    if (!this.config.maxFiles || this.config.maxFiles <= 1) {
      return
    }

    const ext = path.extname(this.config.filePath)
    const basename = path.basename(this.config.filePath, ext)
    const dirname = path.dirname(this.config.filePath)

    for (let i = this.config.maxFiles; i <= this.currentFileIndex; i++) {
      const oldFilePath = path.join(dirname, `${basename}.${i}${ext}`)

      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath)
        } catch (error) {
          console.warn(`[ServerFileSink] Failed to delete old log file ${oldFilePath}:`, error)
        }
      }
    }
  }
}