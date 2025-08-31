import { prisma } from "../prisma"
import { UserRole, ItemRarity } from "../generated"
import { generateRequestId, sanitizeForLog, logEvent } from "../utils"
import { XPService } from "./xp"

export class EventsService {
  static async createEvent(data: {
    title: string
    description?: string
    startsAt: Date
    endsAt?: Date
    xpBonus?: number
    rarityReward?: ItemRarity
  }, createdBy: string) {
    const requestId = generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      // Verify creator has OPERATOR role
      const creator = await tx.user.findFirst({
        where: {
          id: createdBy,
          role: UserRole.OPERATOR
        }
      })
      
      if (!creator) {
        throw new Error("Only operators can create events")
      }
      
      // Create event
      const event = await tx.event.create({
        data: {
          title: data.title,
          description: data.description,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          xpBonus: data.xpBonus || 0,
          rarityReward: data.rarityReward
        }
      })
      
      // Log event creation
      await logEvent("INFO", "event_created", {
        userId: createdBy,
        requestId,
        metadata: {
          eventId: event.id,
          title: event.title
        }
      })
      
      return event
    })
  }
  
  static async participateInEvent(eventId: string, userId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      // Verify event exists and is active
      const event = await tx.event.findFirst({
        where: {
          id: eventId,
          isActive: true
        }
      })
      
      if (!event) {
        throw new Error("Event not found or inactive")
      }
      
      // Check if event is currently running
      const now = new Date()
      if (now < event.startsAt || (event.endsAt && now > event.endsAt)) {
        throw new Error("Event is not currently active")
      }
      
      // Check if user already participated (idempotency)
      const existingParticipation = await tx.eventParticipation.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      })
      
      if (existingParticipation) {
        // If same requestId, return existing participation
        if (existingParticipation.requestId === reqId) {
          return existingParticipation
        }
        throw new Error("User has already participated in this event")
      }
      
      // Create participation record
      const participation = await tx.eventParticipation.create({
        data: {
          eventId,
          userId,
          requestId: reqId
        }
      })
      
      // Grant XP bonus if specified
      if (event.xpBonus > 0) {
        try {
          await XPService.grantXP({
            studentId: userId,
            teacherId: "system", // System-granted XP
            subjectId: "system", // System subject
            amount: event.xpBonus,
            reason: `Event participation: ${event.title}`
          }, reqId)
        } catch (error) {
          // Log XP grant failure but don't fail the participation
          await logEvent("WARN", "event_xp_grant_failed", {
            userId,
            requestId: reqId,
            metadata: {
              eventId,
              xpBonus: event.xpBonus,
              error: error instanceof Error ? error.message : "Unknown error"
            }
          })
        }
      }
      
      // Grant rarity reward if specified
      if (event.rarityReward) {
        try {
          // Create a system item grant (this would need to be implemented in a shop service)
          // For now, we'll log the rarity reward
          await logEvent("INFO", "event_rarity_reward_granted", {
            userId,
            requestId: reqId,
            metadata: {
              eventId,
              rarityReward: event.rarityReward
            }
          })
        } catch (error) {
          await logEvent("WARN", "event_rarity_reward_failed", {
            userId,
            requestId: reqId,
            metadata: {
              eventId,
              rarityReward: event.rarityReward,
              error: error instanceof Error ? error.message : "Unknown error"
            }
          })
        }
      }
      
      // Log successful participation
      await logEvent("INFO", "event_participation_success", {
        userId,
        requestId: reqId,
        metadata: {
          eventId,
          xpBonus: event.xpBonus,
          rarityReward: event.rarityReward
        }
      })
      
      return participation
    })
  }
  
  static async getEvents(includeInactive: boolean = false) {
    const whereClause = includeInactive ? {} : { isActive: true }
    
    return await prisma.event.findMany({
      where: whereClause,
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        startsAt: "desc"
      }
    })
  }
  
  static async getEvent(eventId: string) {
    return await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    })
  }
  
  static async getUserParticipations(userId: string) {
    return await prisma.eventParticipation.findMany({
      where: { userId },
      include: {
        event: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }
}
