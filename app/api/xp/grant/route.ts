import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"
import { withApiErrorEnvelope, createAuthErrorResponse, createForbiddenErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"

export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = getRequestIdFromRequest(request)
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    await logEvent("WARN", "xp_grant_unauthorized", {
      requestId,
      metadata: { path: "/api/xp/grant" }
    })
    return createAuthErrorResponse(requestId)
  }
  
  // Only teachers and operators can grant XP
  if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
    await logEvent("WARN", "xp_grant_forbidden", {
      requestId,
      userId: session.user.id,
      metadata: { role: session.user.role }
    })
    return createForbiddenErrorResponse(requestId)
  }
  
  const body = await request.json()
  const { studentId, subjectId, amount, reason } = body
  
  // Validate required fields
  if (!studentId || !subjectId || !amount || !reason) {
    throw new Error("Missing required fields: studentId, subjectId, amount, reason")
  }
  
  // Validate amount is positive
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error("Amount must be a positive number")
  }
  
  // Validate amount is reasonable (prevent abuse)
  if (amount > 10000) {
    throw new Error("Amount exceeds maximum allowed (10,000 XP)")
  }
  
  // Grant XP with budget enforcement
  const xpAudit = await XPService.grantXP({
    studentId,
    teacherId: session.user.id,
    subjectId,
    amount,
    reason
  }, requestId)
  
  await logEvent("INFO", "xp_grant_success", {
    requestId,
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
})
