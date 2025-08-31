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

describe('EventsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      const mockUser = { id: 'user-1', role: UserRole.OPERATOR }
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

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          user: { findFirst: vi.fn().mockResolvedValue(mockUser) },
          event: { create: vi.fn().mockResolvedValue(mockEvent) },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      const result = await EventsService.createEvent({
        title: 'Test Event',
        description: 'Test Description',
        startsAt: new Date('2024-01-01T10:00:00Z'),
        endsAt: new Date('2024-01-01T12:00:00Z'),
        xpBonus: 100,
        rarityReward: ItemRarity.RARE
      }, 'user-1')

      expect(result).toEqual(mockEvent)
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should throw error if user is not operator', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          user: { findFirst: vi.fn().mockResolvedValue(null) },
          event: { create: vi.fn() },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      await expect(EventsService.createEvent({
        title: 'Test Event',
        startsAt: new Date()
      }, 'user-1')).rejects.toThrow('Only operators can create events')
    })
  })

  describe('participateInEvent', () => {
    it('should allow participation in active event', async () => {
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() - 1000), // Started 1 second ago
        endsAt: new Date(now.getTime() + 3600000), // Ends in 1 hour
        xpBonus: 100,
        rarityReward: ItemRarity.RARE,
        isActive: true
      }

      const mockParticipation = {
        id: 'participation-1',
        eventId: 'event-1',
        userId: 'user-1',
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

      const result = await EventsService.participateInEvent('event-1', 'user-1')

      expect(result).toEqual(mockParticipation)
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should prevent double participation', async () => {
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
        userId: 'user-1',
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

      await expect(EventsService.participateInEvent('event-1', 'user-1'))
        .rejects.toThrow('User has already participated in this event')
    })

    it('should allow idempotent participation with same requestId', async () => {
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
        userId: 'user-1',
        requestId: 'test-request-id',
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

      const result = await EventsService.participateInEvent('event-1', 'user-1', 'test-request-id')

      expect(result).toEqual(existingParticipation)
    })

    it('should reject participation in inactive event', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(null) },
          eventParticipation: { findUnique: vi.fn() },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      await expect(EventsService.participateInEvent('event-1', 'user-1'))
        .rejects.toThrow('Event not found or inactive')
    })

    it('should reject participation in event outside time window', async () => {
      const now = new Date()
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startsAt: new Date(now.getTime() + 3600000), // Starts in 1 hour
        endsAt: new Date(now.getTime() + 7200000), // Ends in 2 hours
        xpBonus: 100,
        rarityReward: ItemRarity.RARE,
        isActive: true
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          event: { findFirst: vi.fn().mockResolvedValue(mockEvent) },
          eventParticipation: { findUnique: vi.fn() },
          systemLog: { create: vi.fn() }
        })
      })

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction)

      await expect(EventsService.participateInEvent('event-1', 'user-1'))
        .rejects.toThrow('Event is not currently active')
    })
  })

  describe('getEvents', () => {
    it('should return active events by default', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Active Event', isActive: true }
      ]

      vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents)

      const result = await EventsService.getEvents()

      expect(result).toEqual(mockEvents)
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: { startsAt: 'desc' }
      })
    })

    it('should return all events when includeInactive is true', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Active Event', isActive: true },
        { id: 'event-2', title: 'Inactive Event', isActive: false }
      ]

      vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents)

      const result = await EventsService.getEvents(true)

      expect(result).toEqual(mockEvents)
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { startsAt: 'desc' }
      })
    })
  })

  describe('getEvent', () => {
    it('should return event with participations', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        participations: [
          { id: 'part-1', userId: 'user-1' }
        ]
      }

      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent)

      const result = await EventsService.getEvent('event-1')

      expect(result).toEqual(mockEvent)
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include: expect.any(Object)
      })
    })
  })

  describe('getUserParticipations', () => {
    it('should return user participations', async () => {
      const mockParticipations = [
        { id: 'part-1', eventId: 'event-1', userId: 'user-1' }
      ]

      vi.mocked(prisma.eventParticipation.findMany).mockResolvedValue(mockParticipations)

      const result = await EventsService.getUserParticipations('user-1')

      expect(result).toEqual(mockParticipations)
      expect(prisma.eventParticipation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { event: true },
        orderBy: { createdAt: 'desc' }
      })
    })
  })
})
