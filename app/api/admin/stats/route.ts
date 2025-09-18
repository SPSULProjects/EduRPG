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
    
    // Only operators can view system stats
    if (session.user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: "Forbidden - Only operators can view system stats" }, { status: 403 })
    }
    
    // Get system statistics
    const [totalUsers, totalJobs, activeJobs, totalXP] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.job.count({ where: { status: "OPEN" } }),
      prisma.xPAudit.aggregate({
        _sum: { amount: true }
      })
    ])
    
    // Test database connection
    let databaseStatus = false
    let lastBackup = "N/A"
    try {
      await prisma.$queryRaw`SELECT 1`
      databaseStatus = true
      // TODO: Implement actual backup tracking
      lastBackup = new Date().toISOString().split('T')[0] || "N/A"
    } catch (error) {
      databaseStatus = false
    }
    
    return NextResponse.json({
      totalUsers,
      totalJobs,
      activeJobs,
      totalXP: totalXP._sum.amount || 0,
      systemHealth: {
        database: databaseStatus,
        lastBackup
      }
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
