import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { AchievementsService } from "@/app/lib/services/achievements"
import { z } from "zod"

const createAchievementSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  badgeUrl: z.string().url().optional(),
  criteria: z.string().max(500).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const achievements = await AchievementsService.getAchievements()
    
    return NextResponse.json({ achievements })
  } catch (error) {
    console.error("Achievements GET error:", error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only operators can create achievements
    if (session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Operator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const achievementData = createAchievementSchema.parse(body)

    const achievement = await AchievementsService.createAchievement(achievementData)

    return NextResponse.json({
      success: true,
      achievement
    }, { status: 201 })
  } catch (error) {
    console.error("Achievements POST error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
