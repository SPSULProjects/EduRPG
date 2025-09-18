import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { UserRole } from "@/app/lib/generated"
import { syncBakalariData } from "@/app/lib/services/sync-bakalari"
import { prisma } from "@/app/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only operators can trigger sync
    if (session.user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: "Forbidden - Only operators can trigger sync" }, { status: 403 })
    }
    
    // Get operator's Bakalari token
    const operator = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!operator?.bakalariToken) {
      return NextResponse.json({ 
        error: "No valid Bakalari token available for sync" 
      }, { status: 400 })
    }

    // Trigger Bakalari sync
    const requestId = request.headers.get('x-request-id')
    const result = await syncBakalariData(operator.bakalariToken, {
      ...(requestId && { requestId }),
      operatorId: session.user.id
    })
    
    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      result
    })
  } catch (error) {
    console.error("Admin sync error:", error)
    return NextResponse.json({ 
      error: "Sync failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
