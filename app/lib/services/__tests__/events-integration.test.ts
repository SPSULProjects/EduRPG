import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventsService } from '../events'
import { prisma } from '../../prisma'
import { UserRole, ItemRarity } from '../../generated'

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    event: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    eventParticipation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn()
    },
    user: {
      findFirst: vi.fn()
    },
    systemLog: {
      create: vi.fn()
    }
  }
}))

vi.mock('../../utils', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
  logEvent: vi.fn()
}))

vi.mock('../xp', () => ({
  XPService: {
    grantXP: vi.fn()
  }
}))

describe('Events Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Creation and Participation Flow', () => {
    it('should create event and allow participation with XP bonus', async () => {
      const mockUser = { id: 'operator-1', role: UserRole.OPERATOR }
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Test Description',
        startsAt: new Date('2024-01-01T10:00:00Z'),
        endsAt: new Date('2024-01-01T12:00:00Z'),
        xpBonus: 100,
        rarityReward: ItemRarity.RARE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'student-1',
        requestId: 'test-request-id',
        createdAt: new Date()
      }

      // Mock transaction for event creation
      const createEventTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          user: { findFirst: vi.fn().mockResolvedValue(mockUser) },
          event: { create: vi.fn().mockResolvedValue(mockEvent) },
          systemLog: { create: vi.fn() }
        })
      })

      // Mock transaction for participation
      const participateTransaction = vi.fn().mockImplementation(async (callback) => {
        const now = new Date()
        const activeEvent = {
          ...mockEvent,
          startsAt: new Date(now.getTime() - 1000), // Started 1 second ago
          endsAt: new Date(now.getTime() + 3600000) // Ends in 1 hour
        }
        
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(activeEvent) },
          eventParticipation: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockParticipation)
          },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction)
        .mockImplementationOnce(createEventTransaction)
        .mockImplementationOnce(participateTransaction)

      // Create event
      const createdEvent = await EventsService.createEvent({
        title: 'Test Event',
        description: 'Test Description',
        startsAt: new Date('2024-01-01T10:00:00Z'),
        endsAt: new Date('2024-01-01T12:00:00Z'),
        xpBonus: 100,
        rarityReward: ItemRarity.RARE
      }, 'operator-1')

      expect(createdEvent).toEqual(mockEvent)

      // Participate in event
      const participation = await EventsService.participateInEvent('event-1', 'student-1')

      expect(participation).toEqual(mockParticipation)
      expect(createEventTransaction).toHaveBeenCalled()
      expect(participateTransaction).toHaveBeenCalled()
    })

    it('should prevent double participation with different request IDs', async () => {
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() - 1000),
        endsAt: new Date(now.getTime() + 3600000),
        xpBonus: 100,
        rarityReward: ItemRarity.RARE,
        isActive: true
      }

      const existingParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'student-1',
        requestId: 'different-request-id',
        createdAt: new Date()
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
          eventParticipation: {
            findUnique: vi.fn().mockResolvedValue(existingParticipation),
            create: vi.fn()
          },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      // Attempt to participate should fail because user already participated
      await expect(EventsService.participateInEvent('event-1', 'student-1', 'second-request-id'))
        .rejects.toThrow('User has already participated in this event')
    })

    it('should allow idempotent participation with same request ID', async () => {
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() - 1000),
        endsAt: new Date(now.getTime() + 3600000),
        xpBonus: 100,
        rarityReward: ItemRarity.RARE,
        isActive: true
      }

      const existingParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'student-1',
        requestId: 'same-request-id',
        createdAt: new Date()
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
          eventParticipation: {
            findUnique: vi.fn().mockResolvedValue(existingParticipation),
            create: vi.fn()
          },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      // Both participations with same request ID should return the same result
      const participation1 = await EventsService.participateInEvent('event-1', 'student-1', 'same-request-id')
      const participation2 = await EventsService.participateInEvent('event-1', 'student-1', 'same-request-id')

      expect(participation1).toEqual(existingParticipation)
      expect(participation2).toEqual(existingParticipation)
    })

    it('should grant XP bonus on participation', async () => {
      const { XPService } = await import('../xp')
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() - 1000),
        endsAt: new Date(now.getTime() + 3600000),
        xpBonus: 150,
        rarityReward: null,
        isActive: true
      }

      const mockParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'student-1',
        requestId: 'test-request-id',
        createdAt: new Date()
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
          eventParticipation: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockParticipation)
          },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)
      vi.mocked(XPService.grantXP).mockResolvedValue({ id: 'xp-audit-1' })

      const participation = await EventsService.participateInEvent('event-1', 'student-1')

      expect(participation).toEqual(mockParticipation)
      expect(XPService.grantXP).toHaveBeenCalledWith({
        studentId: 'student-1',
        teacherId: 'system',
        subjectId: 'system',
        amount: 150,
        reason: 'Event participation: Test Event'
      }, 'test-request-id')
    })

    it('should handle XP grant failures gracefully', async () => {
      const { XPService } = await import('../xp')
      const { logEvent } = await import('../../utils')
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() - 1000),
        endsAt: new Date(now.getTime() + 3600000),
        xpBonus: 100,
        rarityReward: null,
        isActive: true
      }

      const mockParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'student-1',
        requestId: 'test-request-id',
        createdAt: new Date()
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
          eventParticipation: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockParticipation)
          },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)
      vi.mocked(XPService.grantXP).mockRejectedValue(new Error('XP grant failed'))
      vi.mocked(logEvent).mockResolvedValue(undefined)

      // Participation should still succeed even if XP grant fails
      const participation = await EventsService.participateInEvent('event-1', 'student-1')

      expect(participation).toEqual(mockParticipation)
      expect(logEvent).toHaveBeenCalledWith('WARN', 'event_xp_grant_failed', expect.any(Object))
    })
  })
})
