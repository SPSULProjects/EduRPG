import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Test basic user count
    const userCount = await prisma.user.count()
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      userCount,
      version: "1.0.0"
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      version: "1.0.0"
    }, { status: 500 })
  }
}
