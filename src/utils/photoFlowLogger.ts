/**
 * Photo Flow Logger - Comprehensive logging for photo URL to Supabase flow
 * Writes detailed logs to @logs\ folder for debugging
 */

interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  component: string
  action: string
  data?: any
  error?: string
}

class PhotoFlowLogger {
  private logs: LogEntry[] = []
  private sessionId: string = Date.now().toString()

  log(level: LogEntry['level'], component: string, action: string, data?: any, error?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone to avoid reference issues
      error
    }

    this.logs.push(entry)
    console.log(`[PhotoFlowLogger] ${level} ${component}:${action}`, data || error || '')

    // Auto-flush logs every 10 entries or on errors
    if (this.logs.length >= 10 || level === 'ERROR') {
      this.flushLogs()
    }
  }

  info(component: string, action: string, data?: any) {
    this.log('INFO', component, action, data)
  }

  warn(component: string, action: string, data?: any, error?: string) {
    this.log('WARN', component, action, data, error)
  }

  error(component: string, action: string, data?: any, error?: string) {
    this.log('ERROR', component, action, data, error)
  }

  debug(component: string, action: string, data?: any) {
    this.log('DEBUG', component, action, data)
  }

  async flushLogs() {
    if (this.logs.length === 0) return

    const logData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      entries: [...this.logs]
    }

    try {
      // Write to logs folder via API
      await fetch('/api/write-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `photo-flow-${this.sessionId}.json`,
          data: logData
        })
      })

      this.logs = [] // Clear logs after successful write
    } catch (err) {
      console.error('[PhotoFlowLogger] Failed to write logs:', err)
    }
  }

  // Force flush on page unload
  setupAutoFlush() {
    window.addEventListener('beforeunload', () => {
      if (this.logs.length > 0) {
        // Use sendBeacon for reliable log delivery during page unload
        const logData = {
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          entries: [...this.logs]
        }

        navigator.sendBeacon('/api/write-log', JSON.stringify({
          filename: `photo-flow-final-${this.sessionId}.json`,
          data: logData
        }))
      }
    })

    // Periodic flush every 30 seconds
    setInterval(() => {
      if (this.logs.length > 0) {
        this.flushLogs()
      }
    }, 30000)
  }
}

// Export singleton instance
export const photoFlowLogger = new PhotoFlowLogger()

// Auto-setup when imported
if (typeof window !== 'undefined') {
  photoFlowLogger.setupAutoFlush()
}