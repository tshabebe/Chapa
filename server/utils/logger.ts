// Simple logger utility
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: any
}

class Logger {
  private logLevel: LogLevel

  constructor(level: string = 'info') {
    this.logLevel = this.parseLogLevel(level)
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR
      case 'warn':
        return LogLevel.WARN
      case 'info':
        return LogLevel.INFO
      case 'debug':
        return LogLevel.DEBUG
      default:
        return LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ]
    return levels.indexOf(level) <= levels.indexOf(this.logLevel)
  }

  private formatLog(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level}]: ${message}${metaStr}`
  }

  private writeLog(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return

    const logEntry = this.formatLog(level, message, meta)

    // Console output with colors
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.INFO]: '\x1b[36m', // Cyan
      [LogLevel.DEBUG]: '\x1b[35m', // Magenta
    }
    const reset = '\x1b[0m'

    console.log(`${colors[level]}${logEntry}${reset}`)
  }

  error(message: string, meta?: any): void {
    this.writeLog(LogLevel.ERROR, message, meta)
  }

  warn(message: string, meta?: any): void {
    this.writeLog(LogLevel.WARN, message, meta)
  }

  info(message: string, meta?: any): void {
    this.writeLog(LogLevel.INFO, message, meta)
  }

  debug(message: string, meta?: any): void {
    this.writeLog(LogLevel.DEBUG, message, meta)
  }
}

// Create and export logger instance
export const logger = new Logger(process.env.LOG_LEVEL || 'info')
