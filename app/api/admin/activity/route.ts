import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { UserRole } from "@/app/lib/generated"
import { prisma } from "@/app/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only operators can view system activity
    if (session.user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: "Forbidden - Only operators can view system activity" }, { status: 403 })
    }
    
    // Get recent activity logs
    const recentActivity = await prisma.systemLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        level: true,
        message: true,
        createdAt: true,
        metadata: true
      }
    })
    
    // Transform to match expected format
    const activity = recentActivity.map(log => ({
      id: log.id,
      type: (log.metadata as any)?.type || "SYSTEM",
      message: log.message,
      timestamp: log.createdAt.toISOString(),
      level: log.level
    }))
    
    return NextResponse.json({ activity })
  } catch (error) {
    console.error("Admin activity error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
