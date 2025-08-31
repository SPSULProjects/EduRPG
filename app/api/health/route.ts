import { NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"

export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      ok: true,
      ts: timestamp,
      db: true
    })
  } catch (error) {
    console.error("Health check failed:", error)
    
    return NextResponse.json({
      ok: false,
      ts: timestamp,
      db: false,
      error: "Database connection failed"
    }, { status: 503 })
  }
}
