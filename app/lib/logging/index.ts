import { prisma } from "../prisma"

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL"

export interface LogContext {
  userId?: string
  requestId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
}

export interface LogEntry {
  level: LogLevel
  message: string
  context: LogContext
  timestamp: Date
  service: string
  environment: string
}

export class Logger {
  private service: string
  private environment: string

  constructor(service: string = "edurpg") {
    this.service = service
    this.environment = process.env.NODE_ENV || "development"
  }

  private formatLogEntry(level: LogLevel, message: string, context: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date(),
      service: this.service,
      environment: this.environment,
    }
  }

  private async writeToDatabase(entry: LogEntry): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          level: entry.level,
          message: entry.message,
          userId: entry.context.userId,
          requestId: entry.context.requestId,
          metadata: entry.context.metadata,
        },
      })
    } catch (error) {
      // Fallback to console if database logging fails
      console.error("Failed to write log to database:", error)
      console.log(JSON.stringify(entry, null, 2))
    }
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    const logMethod = this.getConsoleMethod(entry.level)
    const formattedMessage = this.formatConsoleMessage(entry)
    
    logMethod(formattedMessage)
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case "DEBUG":
        return console.debug
      case "INFO":
        return console.info
      case "WARN":
        return console.warn
      case "ERROR":
      case "FATAL":
        return console.error
      default:
        return console.log
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const context = entry.context.requestId ? `[${entry.context.requestId}]` : ""
    const user = entry.context.userId ? `[user:${entry.context.userId}]` : ""
    const tags = entry.context.tags?.length ? `[${entry.context.tags.join(",")}]` : ""
    
    return `${timestamp} ${entry.level} ${context}${user}${tags} ${entry.message}`
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined

    const sanitized: Record<string, unknown> = {}
    const sensitiveKeys = ["password", "token", "secret", "key", "auth", "credential"]

    for (const [key, value] of Object.entries(metadata)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase())
      )

      if (isSensitive) {
        sanitized[key] = "[REDACTED]"
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  async debug(message: string, context: LogContext = {}): Promise<void> {
    if (this.environment === "production") return // Skip debug logs in production

    const entry = this.formatLogEntry("DEBUG", message, {
      ...context,
      metadata: this.sanitizeMetadata(context.metadata),
    })

    await this.writeToConsole(entry)
  }

  async info(message: string, context: LogContext = {}): Promise<void> {
    const entry = this.formatLogEntry("INFO", message, {
      ...context,
      metadata: this.sanitizeMetadata(context.metadata),
    })

    await Promise.all([
      this.writeToConsole(entry),
      this.writeToDatabase(entry),
    ])
  }

  async warn(message: string, context: LogContext = {}): Promise<void> {
    const entry = this.formatLogEntry("WARN", message, {
      ...context,
      metadata: this.sanitizeMetadata(context.metadata),
    })

    await Promise.all([
      this.writeToConsole(entry),
      this.writeToDatabase(entry),
    ])
  }

  async error(message: string, context: LogContext = {}): Promise<void> {
    const entry = this.formatLogEntry("ERROR", message, {
      ...context,
      metadata: this.sanitizeMetadata(context.metadata),
    })

    await Promise.all([
      this.writeToConsole(entry),
      this.writeToDatabase(entry),
    ])
  }

  async fatal(message: string, context: LogContext = {}): Promise<void> {
    const entry = this.formatLogEntry("FATAL", message, {
      ...context,
      metadata: this.sanitizeMetadata(context.metadata),
    })

    await Promise.all([
      this.writeToConsole(entry),
      this.writeToDatabase(entry),
    ])
  }

  // Convenience methods for common scenarios
  async logApiRequest(method: string, path: string, context: LogContext = {}): Promise<void> {
    await this.info(`API Request: ${method} ${path}`, {
      ...context,
      tags: ["api", "request"],
      metadata: {
        ...context.metadata,
        method,
        path,
      },
    })
  }

  async logApiResponse(method: string, path: string, statusCode: number, context: LogContext = {}): Promise<void> {
    const level = statusCode >= 400 ? "WARN" : "INFO"
    await this[level](`API Response: ${method} ${path} - ${statusCode}`, {
      ...context,
      tags: ["api", "response"],
      metadata: {
        ...context.metadata,
        method,
        path,
        statusCode,
      },
    })
  }

  async logDatabaseOperation(operation: string, table: string, context: LogContext = {}): Promise<void> {
    await this.debug(`Database ${operation} on ${table}`, {
      ...context,
      tags: ["database", operation],
      metadata: {
        ...context.metadata,
        operation,
        table,
      },
    })
  }

  async logSecurityEvent(event: string, context: LogContext = {}): Promise<void> {
    await this.warn(`Security Event: ${event}`, {
      ...context,
      tags: ["security", "event"],
      metadata: {
        ...context.metadata,
        event,
      },
    })
  }

  async logBusinessEvent(event: string, context: LogContext = {}): Promise<void> {
    await this.info(`Business Event: ${event}`, {
      ...context,
      tags: ["business", "event"],
      metadata: {
        ...context.metadata,
        event,
      },
    })
  }
}

// Global logger instance
export const logger = new Logger()

// Convenience functions for backward compatibility
export async function logEvent(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): Promise<void> {
  await logger[level.toLowerCase() as keyof Logger](message, context)
}

// Structured logging for specific domains
export const apiLogger = new Logger("edurpg-api")
export const authLogger = new Logger("edurpg-auth")
export const dbLogger = new Logger("edurpg-database")
export const businessLogger = new Logger("edurpg-business")
