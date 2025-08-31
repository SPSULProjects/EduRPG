import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request)
  let session: any = null
  
  try {
    session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent("WARN", "xp_grant_unauthorized", {
        requestId,
        metadata: { path: "/api/xp/grant" }
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only teachers and operators can grant XP
    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
      await logEvent("WARN", "xp_grant_forbidden", {
        requestId,
        userId: session.user.id,
        metadata: { role: session.user.role }
      })
      return NextResponse.json({ error: "Forbidden - Only teachers can grant XP" }, { status: 403 })
    }
    
    const body = await request.json()
    const { studentId, subjectId, amount, reason } = body
    
    // Validate required fields
    if (!studentId || !subjectId || !amount || !reason) {
      return NextResponse.json({ 
        error: "Missing required fields: studentId, subjectId, amount, reason" 
      }, { status: 400 })
    }
    
    // Validate amount is positive
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: "Amount must be a positive number" 
      }, { status: 400 })
    }
    
    // Validate amount is reasonable (prevent abuse)
    if (amount > 10000) {
      return NextResponse.json({ 
        error: "Amount exceeds maximum allowed (10,000 XP)" 
      }, { status: 400 })
    }
    
    // Use existing request ID for idempotency
    
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
    
    return NextResponse.json({
      success: true,
      xpAudit: {
        id: xpAudit.id,
        amount: xpAudit.amount,
        reason: xpAudit.reason,
        createdAt: xpAudit.createdAt
      },
      requestId
    })
    
  } catch (error: any) {
    console.error("XP grant error:", error)
    
    // Handle specific budget errors
    if (error.message?.includes("Daily XP budget exceeded")) {
      await logEvent("WARN", "xp_grant_budget_exceeded", {
        requestId,
        userId: session?.user?.id,
        metadata: { error: error.message }
      })
      return NextResponse.json({ 
        error: error.message,
        code: "BUDGET_EXCEEDED"
      }, { status: 409 })
    }
    
    // Handle teacher not found errors
    if (error.message?.includes("Teacher not found")) {
      await logEvent("WARN", "xp_grant_teacher_not_found", {
        requestId,
        userId: session?.user?.id,
        metadata: { error: error.message }
      })
      return NextResponse.json({ 
        error: error.message,
        code: "TEACHER_NOT_FOUND"
      }, { status: 404 })
    }
    
    await logEvent("ERROR", "xp_grant_error", {
      requestId,
      userId: session?.user?.id,
      metadata: { error: error.message || "Unknown error" }
    })
    
    return NextResponse.json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}
