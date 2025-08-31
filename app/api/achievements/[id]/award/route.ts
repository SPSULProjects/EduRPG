import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { AchievementsService } from "@/app/lib/services/achievements"
import { z } from "zod"

const awardSchema = z.object({
  userId: z.string().cuid()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only operators can award achievements
    if (session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Operator access required' },
        { status: 403 }
      )
    }

    const { id: achievementId } = await params
    const body = await request.json()
    const { userId } = awardSchema.parse(body)

    // Generate request ID for idempotency
    const requestId = request.headers.get('x-request-id') || 
                     `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const award = await AchievementsService.awardAchievement(
      userId,
      achievementId,
      session.user.id,
      requestId
    )

    return NextResponse.json({
      success: true,
      award
    }, { status: 201 })
  } catch (error) {
    console.error("Achievement award error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Achievement not found or not active') {
        return NextResponse.json(
          { code: 'ACHIEVEMENT_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
      
      if (error.message === 'User not found') {
        return NextResponse.json(
          { code: 'USER_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
      
      if (error.message === 'Achievement already awarded to this user') {
        return NextResponse.json(
          { code: 'ALREADY_AWARDED', message: error.message },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
