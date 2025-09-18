export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly metadata?: Record<string, unknown>

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
    metadata?: Record<string, unknown>
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.metadata = metadata
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, true, metadata)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", metadata?: Record<string, unknown>) {
    super(message, "UNAUTHORIZED", 401, true, metadata)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied", metadata?: Record<string, unknown>) {
    super(message, "FORBIDDEN", 403, true, metadata)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", metadata?: Record<string, unknown>) {
    super(`${resource} not found`, "NOT_FOUND", 404, true, metadata)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, true, metadata)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", metadata?: Record<string, unknown>) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, true, metadata)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", 500, false, metadata)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, metadata?: Record<string, unknown>) {
    super(`External service error (${service}): ${message}`, "EXTERNAL_SERVICE_ERROR", 502, false, metadata)
  }
}

// Error handler utility
export function handleError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    // Log the original error for debugging
    console.error(`Unhandled error${context ? ` in ${context}` : ""}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new AppError(
      error.message,
      "INTERNAL_ERROR",
      500,
      false,
      { originalError: error.name, context }
    )
  }
  
  // Handle non-Error objects
  const message = typeof error === "string" ? error : "Unknown error occurred"
  console.error(`Non-Error object thrown${context ? ` in ${context}` : ""}:`, error)
  
  return new AppError(
    message,
    "INTERNAL_ERROR",
    500,
    false,
    { originalError: typeof error, context }
  )
}

// Error response formatter
export function formatErrorResponse(error: AppError, requestId?: string) {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.metadata && { details: error.metadata })
    },
    requestId,
    timestamp: new Date().toISOString()
  }
}

// Async error wrapper
export function asyncHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      throw handleError(error, fn.name)
    }
  }
}
