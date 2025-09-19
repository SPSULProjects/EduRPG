import { NextResponse } from "next/server"

export interface ApiErrorResponse {
  ok: false
  code: string
  message: string
  details?: unknown
  requestId?: string
  timestamp: string
}

export interface ApiSuccessResponse<T = unknown> {
  ok: true
  data: T
  requestId?: string
  timestamp: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Common error response creators
 */
export const ErrorResponses = {
  unauthorized: (requestId?: string) =>
    createErrorResponse("UNAUTHORIZED", "Authentication required", 401, undefined, requestId),

  forbidden: (requestId?: string) =>
    createErrorResponse("FORBIDDEN", "Access denied", 403, undefined, requestId),

  notFound: (message: string = "Resource not found", requestId?: string) =>
    createErrorResponse("NOT_FOUND", message, 404, undefined, requestId),

  badRequest: (message: string = "Bad request", details?: unknown, requestId?: string) =>
    createErrorResponse("BAD_REQUEST", message, 400, details, requestId),

  conflict: (message: string = "Conflict", requestId?: string) =>
    createErrorResponse("CONFLICT", message, 409, undefined, requestId),

  validationError: (message: string = "Validation failed", details?: unknown, requestId?: string) =>
    createErrorResponse("VALIDATION_ERROR", message, 400, details, requestId),

  internalError: (requestId?: string) =>
    createErrorResponse("INTERNAL_SERVER_ERROR", "Internal server error", 500, undefined, requestId),
}

/**
 * Higher-order function to wrap API handlers with standardized error handling
 */
export function withApiErrorHandler<T extends unknown[], R>(
  handler: (request: any, ...args: T) => Promise<R>
) {
  return async (request: any, ...args: T): Promise<NextResponse<ApiResponse>> => {
    const requestId = request?.headers?.get?.('x-request-id') || crypto.randomUUID()

    try {
      const result = await handler(request, ...args)

      if (result instanceof NextResponse) {
        return result
      }

      return createSuccessResponse(result, 200, requestId)
    } catch (error) {
      console.error("API Error:", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Handle known error types
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ErrorResponses.notFound(error.message, requestId)
        }
        if (error.message.includes("already") || error.message.includes("duplicate")) {
          return ErrorResponses.conflict(error.message, requestId)
        }
        if (error.message.includes("invalid") || error.message.includes("required")) {
          return ErrorResponses.badRequest(error.message, undefined, requestId)
        }
        if (error.message.includes("unauthorized")) {
          return ErrorResponses.unauthorized(requestId)
        }
        if (error.message.includes("forbidden")) {
          return ErrorResponses.forbidden(requestId)
        }
      }

      return ErrorResponses.internalError(requestId)
    }
  }
}
