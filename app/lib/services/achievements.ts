import { prisma } from "@/app/lib/prisma"

export interface CreateAchievementData {
  name: string
  description: string
  badgeUrl?: string
  criteria?: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  badgeUrl?: string
  criteria?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  awardsCount?: number
}

export interface AchievementAward {
  id: string
  userId: string
  achievementId: string
  awardedBy?: string
  createdAt: Date
  user?: {
    id: string
    name: string
    email: string
  }
  awardedByUser?: {
    id: string
    name: string
    email: string
  }
}

export class AchievementsService {
  /**
   * Create a new achievement (Operator only)
   */
  static async createAchievement(data: CreateAchievementData): Promise<Achievement> {
    const achievement = await prisma.achievement.create({
      data: {
        name: data.name,
        description: data.description,
        badgeUrl: data.badgeUrl,
        criteria: data.criteria,
        isActive: true
      }
    })

    // Log achievement creation
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'achievement_created',
        metadata: {
          achievementId: achievement.id,
          achievementName: achievement.name
        }
      }
    })

    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      badgeUrl: achievement.badgeUrl || undefined,
      criteria: achievement.criteria || undefined,
      isActive: achievement.isActive,
      createdAt: achievement.createdAt,
      updatedAt: achievement.updatedAt
    }
  }

  /**
   * Get all achievements with award counts
   */
  static async getAchievements(): Promise<Achievement[]> {
    const achievements = await prisma.achievement.findMany({
      include: {
        _count: {
          select: { awards: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    return achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      badgeUrl: achievement.badgeUrl || undefined,
      criteria: achievement.criteria || undefined,
      isActive: achievement.isActive,
      createdAt: achievement.createdAt,
      updatedAt: achievement.updatedAt,
      awardsCount: achievement._count.awards
    }))
  }

  /**
   * Get achievements for a specific user
   */
  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    const userAchievements = await prisma.achievementAward.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return userAchievements.map(award => ({
      id: award.achievement.id,
      name: award.achievement.name,
      description: award.achievement.description,
      badgeUrl: award.achievement.badgeUrl || undefined,
      criteria: award.achievement.criteria || undefined,
      isActive: award.achievement.isActive,
      createdAt: award.achievement.createdAt,
      updatedAt: award.achievement.updatedAt
    }))
  }

  /**
   * Award an achievement to a user (Operator only)
   */
  static async awardAchievement(
    userId: string, 
    achievementId: string, 
    awardedBy: string,
    requestId?: string
  ): Promise<AchievementAward> {
    return await prisma.$transaction(async (tx) => {
      // Check if achievement exists and is active
      const achievement = await tx.achievement.findUnique({
        where: { id: achievementId, isActive: true }
      })

      if (!achievement) {
        throw new Error('Achievement not found or not active')
      }

      // Check if user exists
      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Check if already awarded
      const existingAward = await tx.achievementAward.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId
          }
        }
      })

      if (existingAward) {
        throw new Error('Achievement already awarded to this user')
      }

      // Create the award
      const award = await tx.achievementAward.create({
        data: {
          userId,
          achievementId,
          awardedBy,
          requestId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          awardedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log the award
      await tx.systemLog.create({
        data: {
          level: 'INFO',
          message: 'achievement_awarded',
          metadata: {
            userId,
            achievementId,
            achievementName: achievement.name,
            awardedBy,
            requestId
          }
        }
      })

      return {
        id: award.id,
        userId: award.userId,
        achievementId: award.achievementId,
        awardedBy: award.awardedBy || undefined,
        createdAt: award.createdAt,
        user: award.user,
        awardedByUser: award.awardedByUser || undefined
      }
    })
  }

  /**
   * Get achievement awards with user details
   */
  static async getAchievementAwards(achievementId: string): Promise<AchievementAward[]> {
    const awards = await prisma.achievementAward.findMany({
      where: { achievementId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        awardedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return awards.map(award => ({
      id: award.id,
      userId: award.userId,
      achievementId: award.achievementId,
      awardedBy: award.awardedBy || undefined,
      createdAt: award.createdAt,
      user: award.user,
      awardedByUser: award.awardedByUser || undefined
    }))
  }

  /**
   * Toggle achievement active status (Operator only)
   */
  static async toggleAchievementStatus(achievementId: string): Promise<Achievement> {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId }
    })

    if (!achievement) {
      throw new Error('Achievement not found')
    }

    const updatedAchievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: { isActive: !achievement.isActive }
    })

    // Log status change
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'achievement_status_toggled',
        metadata: {
          achievementId: achievement.id,
          achievementName: achievement.name,
          oldStatus: achievement.isActive,
          newStatus: updatedAchievement.isActive
        }
      }
    })

    return {
      id: updatedAchievement.id,
      name: updatedAchievement.name,
      description: updatedAchievement.description,
      badgeUrl: updatedAchievement.badgeUrl || undefined,
      criteria: updatedAchievement.criteria || undefined,
      isActive: updatedAchievement.isActive,
      createdAt: updatedAchievement.createdAt,
      updatedAt: updatedAchievement.updatedAt
    }
  }

  /**
   * Get achievement statistics
   */
  static async getAchievementStats(): Promise<{
    totalAchievements: number
    activeAchievements: number
    totalAwards: number
    uniqueAwardedUsers: number
  }> {
    const [totalAchievements, activeAchievements, totalAwards, uniqueAwardedUsers] = await Promise.all([
      prisma.achievement.count(),
      prisma.achievement.count({ where: { isActive: true } }),
      prisma.achievementAward.count(),
      prisma.achievementAward.groupBy({
        by: ['userId'],
        _count: { userId: true }
      }).then(result => result.length)
    ])

    return {
      totalAchievements,
      activeAchievements,
      totalAwards,
      uniqueAwardedUsers
    }
  }
}
