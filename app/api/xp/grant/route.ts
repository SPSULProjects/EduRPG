import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"
import { logEvent } from "@/app/lib/utils"
import { withValidation } from "@/app/lib/validation/validator"
import { grantXPSchema, GrantXPRequest } from "./schema"
import { ErrorResponses, createSuccessResponse, withApiErrorHandler } from "@/app/lib/api/error-responses"

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
      return ErrorResponses.unauthorized(requestId)
    }
    
    // Only teachers and operators can grant XP
    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
      await logEvent("WARN", "xp_grant_forbidden", {
        ...(requestId && { requestId }),
        userId: session.user.id,
        metadata: { role: session.user.role }
      })
      return ErrorResponses.forbidden(requestId)
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
    
    return createSuccessResponse({
      xpAudit: {
        id: xpAudit.id,
        amount: xpAudit.amount,
        reason: xpAudit.reason,
        createdAt: xpAudit.createdAt
      }
    }, 201, requestId)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return ErrorResponses.internalError(requestId)
  }
}
