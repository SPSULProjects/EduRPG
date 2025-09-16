import { NextResponse } from "next/server"
import { z } from "zod"
import { logEvent } from "../utils"

/**
 * Standardized HTTP error response envelope
 */
export interface HttpErrorResponse {
  ok: false
  code: string
  message: string
  requestId?: string
  details?: any
}

/**
 * Standardized HTTP success response envelope
 */
export interface HttpSuccessResponse<T = any> {
  ok: true
  data: T
  requestId?: string
}

/**
 * HTTP error codes mapping
 */
export const HTTP_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Client Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const

/**
 * Maps different error types to appropriate HTTP status codes and error codes
 */
export function asHttpError(error: unknown, requestId?: string): {
  status: number
  response: HttpErrorResponse
} {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return {
      status: 422,
      response: {
        ok: false,
        code: HTTP_ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        requestId,
        details: error.errors
      }
    }
  }

  // Standard Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return {
        status: 401,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.UNAUTHORIZED,
          message: "Authentication required",
          requestId
        }
      }
    }
    
    // Authorization errors
    if (message.includes('forbidden') || message.includes('access denied') || 
        message.includes('insufficient permissions') || message.includes('not allowed')) {
      return {
        status: 403,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.FORBIDDEN,
          message: "Access denied",
          requestId
        }
      }
    }
    
    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      return {
        status: 404,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.NOT_FOUND,
          message: error.message,
          requestId
        }
      }
    }
    
    // Conflict errors (already exists, duplicate, etc.)
    if (message.includes('already') || message.includes('duplicate') || 
        message.includes('conflict') || message.includes('exists')) {
      return {
        status: 409,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.CONFLICT,
          message: error.message,
          requestId
        }
      }
    }
    
    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many')) {
      return {
        status: 429,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: error.message,
          requestId
        }
      }
    }
    
    // Budget/constraint errors (treated as bad request)
    if (message.includes('budget') || message.includes('insufficient') || 
        message.includes('full') || message.includes('not available') ||
        message.includes('not open') || message.includes('invalid')) {
      return {
        status: 400,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.BAD_REQUEST,
          message: error.message,
          requestId
        }
      }
    }
    
    // Service unavailable errors
    if (message.includes('service unavailable') || message.includes('unavailable')) {
      return {
        status: 503,
        response: {
          ok: false,
          code: HTTP_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: error.message,
          requestId
        }
      }
    }
    
    // Default to 400 for other known errors
    return {
      status: 400,
      response: {
        ok: false,
        code: HTTP_ERROR_CODES.BAD_REQUEST,
        message: error.message,
        requestId
      }
    }
  }

  // Unknown error type - default to 500
  return {
    status: 500,
    response: {
      ok: false,
      code: HTTP_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      requestId
    }
  }
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, requestId?: string): HttpSuccessResponse<T> {
  return {
    ok: true,
    data,
    requestId
  }
}

/**
 * Creates a NextResponse with standardized error envelope
 */
export function createErrorResponse(error: unknown, requestId?: string): NextResponse {
  const { status, response } = asHttpError(error, requestId)
  return NextResponse.json(response, { status })
}

/**
 * Creates a NextResponse with standardized success envelope
 */
export function createSuccessNextResponse<T>(data: T, requestId?: string, status: number = 200): NextResponse {
  return NextResponse.json(createSuccessResponse(data, requestId), { status })
}

/**
 * Higher-order function to wrap API route handlers with standardized error handling
 */
export function withErrorEnvelope<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args)
      
      // If the handler already returns a NextResponse, return it as-is
      if (result instanceof NextResponse) {
        return result
      }
      
      // If the handler returns a Response, convert it to NextResponse
      if (result instanceof Response) {
        return new NextResponse(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers
        })
      }
      
      // Otherwise, wrap the result in a success response
      // Extract requestId from the first argument if it's a NextRequest
      const requestId = args[0]?.headers?.get?.('x-request-id') || undefined
      return createSuccessNextResponse(result, requestId)
    } catch (error) {
      // Extract requestId from the first argument if it's a NextRequest
      const requestId = args[0]?.headers?.get?.('x-request-id') || undefined
      
      // Log the error
      try {
        await logEvent("ERROR", "api_error", {
          requestId,
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
          }
        })
      } catch (logError) {
        console.error("Failed to log API error:", logError)
      }
      
      return createErrorResponse(error, requestId)
    }
  }
}

/**
 * Higher-order function specifically for API route handlers that expect NextRequest
 */
export function withApiErrorEnvelope<T extends any[], R>(
  handler: (request: any, ...args: T) => Promise<R>
) {
  return async (request: any, ...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args)
      
      // If the handler already returns a NextResponse, return it as-is
      if (result instanceof NextResponse) {
        return result
      }
      
      // Otherwise, wrap the result in a success response
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      return createSuccessNextResponse(result, requestId)
    } catch (error) {
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      
      // Log the error
      try {
        await logEvent("ERROR", "api_error", {
          requestId,
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
          }
        })
      } catch (logError) {
        console.error("Failed to log API error:", logError)
      }
      
      return createErrorResponse(error, requestId)
    }
  }
}

/**
 * Helper to create authentication error responses
 */
export function createAuthErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: HTTP_ERROR_CODES.UNAUTHORIZED,
    message: "Authentication required",
    requestId
  }, { status: 401 })
}

/**
 * Helper to create authorization error responses
 */
export function createForbiddenErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: HTTP_ERROR_CODES.FORBIDDEN,
    message: "Access denied",
    requestId
  }, { status: 403 })
}

/**
 * Helper to create not found error responses
 */
export function createNotFoundErrorResponse(message: string = "Resource not found", requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: HTTP_ERROR_CODES.NOT_FOUND,
    message,
    requestId
  }, { status: 404 })
}
