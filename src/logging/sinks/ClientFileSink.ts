import { LogEntry, LogSink, ClientFileSinkConfig } from '../types'

interface BatchedLogEntry {
  entry: LogEntry
  retries: number
  timestamp: number
}

export class ClientFileSink implements LogSink {
  private config: ClientFileSinkConfig
  private batch: BatchedLogEntry[] = []
  private flushTimer?: NodeJS.Timeout
  private isOnline: boolean = true

  constructor(config: ClientFileSinkConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }

    this.setupOnlineDetection()
    this.startFlushTimer()
  }

  async write(entry: LogEntry): Promise<void> {
    if (this.shouldSkipEntry(entry)) {
      return
    }

    const batchedEntry: BatchedLogEntry = {
      entry,
      retries: 0,
      timestamp: Date.now()
    }

    this.batch.push(batchedEntry)

    if (this.batch.length >= this.config.batchSize!) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) {
      return
    }

    const entriesToSend = [...this.batch]
    this.batch = []

    try {
      await this.sendBatch(entriesToSend)
    } catch (error) {
      this.handleSendError(entriesToSend, error as Error)
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    await this.flush()
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

  private async sendBatch(entries: BatchedLogEntry[]): Promise<void> {
    const payload = {
      logs: entries.map(({ entry }) => ({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        context: entry.context,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined,
        tags: entry.tags,
        userId: entry.userId,
        sessionId: entry.sessionId
      }))
    }

    const response = await this.sendWithBeacon(payload)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  private async sendWithBeacon(payload: any): Promise<Response> {
    const data = JSON.stringify(payload)

    if (navigator.sendBeacon && !this.isOnline) {
      const blob = new Blob([data], { type: 'application/json' })
      const success = navigator.sendBeacon(this.config.endpoint, blob)

      if (success) {
        return new Response(null, { status: 200, statusText: 'OK' })
      } else {
        throw new Error('sendBeacon failed')
      }
    }

    return fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
      keepalive: true
    })
  }

  private handleSendError(entries: BatchedLogEntry[], error: Error): void {
    console.warn('[ClientFileSink] Failed to send logs:', error)

    const retriableEntries = entries.filter(entry => {
      entry.retries++
      return entry.retries <= this.config.maxRetries!
    })

    if (retriableEntries.length > 0) {
      setTimeout(() => {
        this.batch.unshift(...retriableEntries)
        this.flush().catch(console.error)
      }, this.config.retryDelay!)
    }
  }

  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') {
      return
    }

    this.isOnline = navigator.onLine

    window.addEventListener('online', () => {
      this.isOnline = true
      if (this.batch.length > 0) {
        this.flush().catch(console.error)
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    window.addEventListener('beforeunload', () => {
      if (this.batch.length > 0) {
        this.flush().catch(() => {})
      }
    })
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush().catch(console.error)
      }
    }, this.config.flushInterval!)
  }
}