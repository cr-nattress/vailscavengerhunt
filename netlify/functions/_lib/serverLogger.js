/**
 * Server Logger - Writes detailed logs to @logs\ folder from server functions
 */

const { promises: fs } = require('fs')
const { join } = require('path')

class ServerLogger {
  constructor() {
    this.sessionId = Date.now().toString()
    this.logs = []
  }

  log(level, component, action, data = null, error = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      error
    }

    this.logs.push(entry)
    console.log(`[ServerLogger] ${level} ${component}:${action}`, data || error || '')

    // Auto-flush on errors or every 5 entries
    if (level === 'ERROR' || this.logs.length >= 5) {
      this.flushLogs().catch(err => console.error('Failed to flush logs:', err))
    }
  }

  info(component, action, data = null) {
    this.log('INFO', component, action, data)
  }

  warn(component, action, data = null, error = null) {
    this.log('WARN', component, action, data, error)
  }

  error(component, action, data = null, error = null) {
    this.log('ERROR', component, action, data, error)
  }

  debug(component, action, data = null) {
    this.log('DEBUG', component, action, data)
  }

  async flushLogs() {
    if (this.logs.length === 0) return

    try {
      // Ensure logs directory exists
      const logsDir = join(process.cwd(), 'logs')
      try {
        await fs.mkdir(logsDir, { recursive: true })
      } catch (err) {
        // Directory might already exist, ignore
      }

      // Write log file
      const logData = {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        entries: [...this.logs]
      }

      const filename = `server-photo-flow-${this.sessionId}.json`
      const logPath = join(logsDir, filename)
      const logContent = JSON.stringify(logData, null, 2)

      await fs.writeFile(logPath, logContent, 'utf8')
      console.log(`[ServerLogger] Flushed ${this.logs.length} log entries to ${filename}`)

      this.logs = [] // Clear logs after successful write
    } catch (err) {
      console.error('[ServerLogger] Failed to write logs:', err)
    }
  }
}

// Export singleton instance
const serverLogger = new ServerLogger()

module.exports = { serverLogger }