import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { requireOperator } from "@/app/lib/rbac"
import { withValidation } from "@/app/lib/validation/validator"
import { createEventSchema, getEventsQuerySchema, CreateEventRequest, GetEventsQuery } from "./schema"

// Inline error response helpers
function createAuthErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: 'UNAUTHORIZED',
    message: "Authentication required",
    requestId
  }, { status: 401 })
}

function createForbiddenErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: 'FORBIDDEN',
    message: "Access denied",
    requestId
  }, { status: 403 })
}

function createSuccessNextResponse<T>(data: T, requestId?: string, status: number = 200): NextResponse {
  return NextResponse.json({
    ok: true,
    data,
    requestId
  }, { status })
}

// Inline error envelope wrapper
function withApiErrorEnvelope<T extends any[], R>(
  handler: (request: any, ...args: T) => Promise<R>
) {
  return async (request: any, ...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args)
      
      if (result instanceof NextResponse) {
        return result
      }
      
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      return createSuccessNextResponse(result, requestId)
    } catch (error) {
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      
      console.error("API Error:", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return NextResponse.json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: "Internal server error",
        requestId
      }, { status: 500 })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Validate query parameters
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAuthErrorResponse(requestId)
    }
    
    // Only operators can see inactive events
    if (includeInactive && session.user.role !== "OPERATOR") {
      return createForbiddenErrorResponse(requestId)
    }
    
    const events = await EventsService.getEvents(includeInactive)
    return createSuccessNextResponse({ events }, requestId)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: "Internal server error",
      requestId
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createEventSchema.parse(body)
    
    const user = await requireOperator()
    
    const event = await EventsService.createEvent({
      ...validatedData,
      startsAt: new Date(validatedData.startsAt),
      endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined
    }, user.id)
    
    return createSuccessNextResponse({ event }, requestId, 201)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: "Internal server error",
      requestId
    }, { status: 500 })
  }
}
