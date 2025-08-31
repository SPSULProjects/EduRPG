import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { syncBakalariData } from "@/app/lib/services/sync-bakalari"
import { UserRole } from "@/app/lib/generated"
import { prisma } from "@/app/lib/prisma"

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check authorization - only operators can trigger sync
    if (session.user.role !== UserRole.OPERATOR) {
      return NextResponse.json(
        { error: "Forbidden - Only operators can trigger sync" },
        { status: 403 }
      )
    }

    // Get a valid Bakalari token for sync
    // In a real implementation, you might want to use a service account
    // or get the token from an operator's session
    const operator = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!operator?.bakalariToken) {
      return NextResponse.json(
        { error: "No valid Bakalari token available for sync" },
        { status: 400 }
      )
    }

    // Trigger sync
    const syncResult = await syncBakalariData(operator.bakalariToken, {
      requestId,
      operatorId: session.user.id
    })

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        requestId,
        result: syncResult,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        requestId,
        errors: syncResult.errors,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Sync endpoint error:", error)
    
    return NextResponse.json({
      success: false,
      requestId,
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
