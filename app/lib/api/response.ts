import { NextResponse } from "next/server"

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  requestId?: string
  timestamp?: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export class ApiResponseHandler {
  static success<T>(data: T, requestId?: string, status = 200): NextResponse<ApiResponse<T>> {
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

  static error(
    error: ApiError,
    requestId?: string,
    status = 500
  ): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status }
    )
  }

  static unauthorized(requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      requestId,
      401
    )
  }

  static forbidden(requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "FORBIDDEN",
        message: "Access denied",
      },
      requestId,
      403
    )
  }

  static notFound(message = "Resource not found", requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "NOT_FOUND",
        message,
      },
      requestId,
      404
    )
  }

  static badRequest(message = "Bad request", requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "BAD_REQUEST",
        message,
      },
      requestId,
      400
    )
  }

  static conflict(message = "Conflict", requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "CONFLICT",
        message,
      },
      requestId,
      409
    )
  }

  static internalError(requestId?: string): NextResponse<ApiResponse> {
    return this.error(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
      requestId,
      500
    )
  }
}

export function withApiHandler<T extends unknown[], R>(
  handler: (request: Request, ...args: T) => Promise<R>
) {
  return async (request: Request, ...args: T): Promise<NextResponse<ApiResponse>> => {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

    try {
      const result = await handler(request, ...args)

      if (result instanceof NextResponse) {
        return result
      }

      return ApiResponseHandler.success(result, requestId)
    } catch (error) {
      console.error("API Error:", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Handle known error types
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return ApiResponseHandler.notFound(error.message, requestId)
        }
        if (error.message.includes("already") || error.message.includes("duplicate")) {
          return ApiResponseHandler.conflict(error.message, requestId)
        }
        if (error.message.includes("invalid") || error.message.includes("required")) {
          return ApiResponseHandler.badRequest(error.message, requestId)
        }
      }

      return ApiResponseHandler.internalError(requestId)
    }
  }
}
