import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"
import { logEvent } from "@/app/lib/utils"
// Inline error handling to avoid Next.js client component issues
import { withValidation } from "@/app/lib/validation/validator"
import { grantXPSchema, GrantXPRequest } from "./schema"

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

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = grantXPSchema.parse(body)
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent("WARN", "xp_grant_unauthorized", {
        ...(requestId && { requestId }),
        metadata: { path: "/api/xp/grant" }
      })
      return createAuthErrorResponse(requestId)
    }
    
    // Only teachers and operators can grant XP
    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
      await logEvent("WARN", "xp_grant_forbidden", {
        ...(requestId && { requestId }),
        userId: session.user.id,
        metadata: { role: session.user.role }
      })
      return createForbiddenErrorResponse(requestId)
    }
    
    const { studentId, subjectId, amount, reason } = validatedData
    
    // Grant XP with budget enforcement
    const xpAudit = await XPService.grantXP({
      studentId,
      teacherId: session.user.id,
      subjectId,
      amount,
      reason
    }, requestId)
    
    await logEvent("INFO", "xp_grant_success", {
      ...(requestId && { requestId }),
      userId: session.user.id,
      metadata: {
        studentId,
        subjectId,
        amount,
        reason,
        auditId: xpAudit.id
      }
    })
    
    return createSuccessNextResponse({
      xpAudit: {
        id: xpAudit.id,
        amount: xpAudit.amount,
        reason: xpAudit.reason,
        createdAt: xpAudit.createdAt
      }
    }, requestId)
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
