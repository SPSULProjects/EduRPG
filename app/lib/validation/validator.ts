import { NextRequest, NextResponse } from "next/server"
import { z, ZodSchema, ZodError } from "zod"
import { getRequestIdFromRequest } from "@/app/lib/utils"
import { logEvent } from "@/app/lib/utils"

export interface ValidationOptions {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export interface ValidationResult<T = any> {
  success: true
  data: T
  requestId: string
}

export interface ValidationError {
  success: false
  error: string
  details?: any
  requestId: string
}

/**
 * Validates request data using Zod schemas
 * Returns typed data if validation passes, or error response if it fails
 */
export async function validateRequest<T = any>(
  request: NextRequest,
  options: ValidationOptions
): Promise<ValidationResult<T> | ValidationError> {
  const requestId = getRequestIdFromRequest(request)
  
  try {
    const validatedData: any = {}

    // Validate request body if schema provided
    if (options.body) {
      const body = await request.json()
      validatedData.body = options.body.parse(body)
    }

    // Validate query parameters if schema provided
    if (options.query) {
      const { searchParams } = new URL(request.url)
      const queryObject: Record<string, any> = {}
      
      for (const [key, value] of searchParams.entries()) {
        // Convert string values to appropriate types
        if (value === 'true') queryObject[key] = true
        else if (value === 'false') queryObject[key] = false
        else if (!isNaN(Number(value))) queryObject[key] = Number(value)
        else queryObject[key] = value
      }
      
      validatedData.query = options.query.parse(queryObject)
    }

    // Validate route parameters if schema provided
    if (options.params) {
      // This will be handled by the route handler since params are passed separately
      // We'll return the schema for the route handler to use
      validatedData.paramsSchema = options.params
    }

    return {
      success: true,
      data: validatedData,
      requestId
    }
  } catch (error) {
    if (error instanceof ZodError) {
      await logEvent("WARN", "validation_error", {
        requestId,
        metadata: {
          path: request.nextUrl.pathname,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        }
      })

      return {
        success: false,
        error: "Validation failed",
        details: error.errors,
        requestId
      }
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      await logEvent("WARN", "json_parse_error", {
        requestId,
        metadata: {
          path: request.nextUrl.pathname,
          error: error.message
        }
      })

      return {
        success: false,
        error: "Invalid JSON in request body",
        requestId
      }
    }

    // Handle other errors
    await logEvent("ERROR", "validation_unexpected_error", {
      requestId,
      metadata: {
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    })

    return {
      success: false,
      error: "Internal validation error",
      requestId
    }
  }
}

/**
 * Validates route parameters using Zod schema
 */
export function validateParams<T>(
  params: any,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; details?: any } {
  try {
    const validatedParams = schema.parse(params)
    return {
      success: true,
      data: validatedParams
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: "Invalid route parameters",
        details: error.errors
      }
    }
    return {
      success: false,
      error: "Parameter validation failed"
    }
  }
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  error: string,
  details?: any,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      error,
      details,
      requestId,
      timestamp: new Date().toISOString()
    },
    { status: 400 }
  )
}

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<T = any>(
  options: ValidationOptions,
  handler: (data: T, request: NextRequest, requestId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeParams?: { params: Promise<any> }) => {
    const validation = await validateRequest(request, options)
    
    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error,
        validation.details,
        validation.requestId
      )
    }

    // Validate route parameters if provided
    if (options.params && routeParams) {
      const params = await routeParams.params
      const paramsValidation = validateParams(params, options.params)
      
      if (!paramsValidation.success) {
        return createValidationErrorResponse(
          paramsValidation.error,
          paramsValidation.details,
          validation.requestId
        )
      }
      
      validation.data.params = paramsValidation.data
    }

    return handler(validation.data, request, validation.requestId)
  }
}
