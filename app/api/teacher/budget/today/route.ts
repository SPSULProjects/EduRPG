import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"
import { UserRole } from "@/app/lib/generated"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only teachers can view their budget
    if (session.user.role !== UserRole.TEACHER) {
      return NextResponse.json({ error: "Forbidden - Only teachers can view budget" }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()
    
    if (subjectId) {
      // Get budget for specific subject
      const budget = await XPService.getTeacherDailyBudget(session.user.id, subjectId, date)
      
      return NextResponse.json({
        teacherId: session.user.id,
        subjectId,
        date: date.toISOString().split('T')[0],
        budget: budget.budget,
        used: budget.used,
        remaining: budget.remaining
      })
    } else {
      // Get budgets for all subjects
      const budgets = await XPService.getTeacherDailyBudgets(session.user.id, date)
      
      return NextResponse.json({
        teacherId: session.user.id,
        date: date.toISOString().split('T')[0],
        budgets,
        summary: {
          totalBudget: budgets.reduce((sum, b) => sum + b.budget, 0),
          totalUsed: budgets.reduce((sum, b) => sum + b.used, 0),
          totalRemaining: budgets.reduce((sum, b) => sum + b.remaining, 0)
        }
      })
    }
    
  } catch (error) {
    console.error("Teacher budget error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}
