import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only teachers and operators can grant XP
    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
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
    
    // Generate request ID for idempotency
    const requestId = request.headers.get('x-request-id') || 
                     `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Grant XP with budget enforcement
    const xpAudit = await XPService.grantXP({
      studentId,
      teacherId: session.user.id,
      subjectId,
      amount,
      reason
    }, requestId)
    
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
      return NextResponse.json({ 
        error: error.message,
        code: "BUDGET_EXCEEDED"
      }, { status: 409 })
    }
    
    // Handle teacher not found errors
    if (error.message?.includes("Teacher not found")) {
      return NextResponse.json({ 
        error: error.message,
        code: "TEACHER_NOT_FOUND"
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}
