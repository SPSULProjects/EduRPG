import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request)
  const timestamp = new Date().toISOString()
  const startTime = Date.now()
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime
    
    await logEvent("INFO", "health_check", {
      requestId,
      metadata: {
        db: true,
        responseTime
      }
    })
    
    return NextResponse.json({
      ok: true,
      ts: timestamp,
      db: true,
      responseTime
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    await logEvent("ERROR", "health_check_failed", {
      requestId,
      metadata: {
        db: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    })
    
    console.error("Health check failed:", error)
    
    return NextResponse.json({
      ok: false,
      ts: timestamp,
      db: false,
      error: "Database connection failed",
      responseTime
    }, { status: 503 })
  }
}
