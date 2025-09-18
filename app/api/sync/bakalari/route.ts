import { NextRequest, NextResponse } from "next/server"
import { syncBakalariData } from "@/app/lib/services/sync-bakalari"
import { prisma } from "@/app/lib/prisma"
import { guardApiRoute } from "@/app/lib/auth/guards"

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Check authorization using the guard utility
    const guardResult = await guardApiRoute('/api/sync/bakalari', requestId)
    if (guardResult.error) {
      return NextResponse.json(guardResult.body, { status: guardResult.status || 500 })
    }
    
    const { user } = guardResult

    if (!user) {
      return NextResponse.json(
        { 
          code: 'UNAUTHORIZED',
          message: "User not found in session"
        },
        { status: 401 }
      )
    }

    // Get a valid Bakalari token for sync
    // In a real implementation, you might want to use a service account
    // or get the token from an operator's session
    const operator = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!operator?.bakalariToken) {
      return NextResponse.json(
        { 
          code: 'MISSING_TOKEN',
          message: "No valid Bakalari token available for sync",
          requestId 
        },
        { status: 400 }
      )
    }

    // Trigger sync
    const syncResult = await syncBakalariData(operator.bakalariToken, {
      requestId,
      operatorId: user?.id
    })

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        runId: syncResult.runId,
        startedAt: syncResult.startedAt,
        completedAt: syncResult.completedAt,
        durationMs: syncResult.durationMs,
        result: {
          classesCreated: syncResult.classesCreated,
          classesUpdated: syncResult.classesUpdated,
          usersCreated: syncResult.usersCreated,
          usersUpdated: syncResult.usersUpdated,
          subjectsCreated: syncResult.subjectsCreated,
          subjectsUpdated: syncResult.subjectsUpdated,
          enrollmentsCreated: syncResult.enrollmentsCreated,
          enrollmentsUpdated: syncResult.enrollmentsUpdated
        },
        requestId,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        runId: syncResult.runId,
        startedAt: syncResult.startedAt,
        completedAt: syncResult.completedAt,
        durationMs: syncResult.durationMs,
        errors: syncResult.errors,
        requestId,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Sync endpoint error:", error)
    
    return NextResponse.json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: "Internal server error",
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
