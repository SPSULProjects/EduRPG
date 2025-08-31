import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authOptions } from '../auth'
import { UserRole } from '../generated'

// Mock dependencies
vi.mock('../prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    class: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    user: {
      upsert: vi.fn()
    }
  }
}))

vi.mock('../utils', () => ({
  logEvent: vi.fn()
}))

vi.mock('../bakalari/bakalari', () => ({
  loginToBakalariAndFetchUserData: vi.fn()
}))

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Credentials Provider', () => {
    it('should validate required credentials', async () => {
      const provider = authOptions.providers[0]
      
      // Test missing username
      const result1 = await provider.authorize?.({ username: '', password: 'test' })
      expect(result1).toBeNull()
      
      // Test missing password
      const result2 = await provider.authorize?.({ username: 'test', password: '' })
      expect(result2).toBeNull()
    })

    it('should handle Bakalari authentication success', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari/bakalari')
      const { prisma } = await import('../prisma')
      
      // Mock successful Bakalari response
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        status: { success: true, loginFailed: false, userDataFailed: false },
        data: {
          userType: 'student',
          fullUserName: 'Test Student',
          classAbbrev: '1.A',
          classId: 'class123',
          userID: 'student123'
        },
        accessToken: 'test-token'
      })

      // Mock database operations
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          class: {
            findFirst: vi.fn().mockResolvedValue({ id: 'class123' }),
            create: vi.fn()
          },
          user: {
            upsert: vi.fn().mockResolvedValue({
              id: 'user123',
              email: 'student123@bakalari.local',
              name: 'Test Student',
              role: UserRole.STUDENT,
              classId: 'class123'
            })
          }
        }
        return callback(mockTx as any)
      })

      const provider = authOptions.providers[0]
      const result = await provider.authorize?.({ 
        username: 'testuser', 
        password: 'testpass' 
      })

      expect(result).toEqual({
        id: 'user123',
        email: 'student123@bakalari.local',
        name: 'Test Student',
        role: UserRole.STUDENT,
        classId: 'class123'
      })
    })

    it('should handle Bakalari authentication failure', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari/bakalari')
      
      // Mock failed Bakalari response
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        status: { success: false, loginFailed: true, userDataFailed: false },
        data: null,
        accessToken: null
      })

      const provider = authOptions.providers[0]
      
      const result = await provider.authorize?.({ 
        username: 'testuser', 
        password: 'wrongpass' 
      })
      
      expect(result).toBeNull()
    })

    it('should handle missing user data', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari/bakalari')
      
      // Mock successful login but no user data
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        status: { success: true, loginFailed: false, userDataFailed: false },
        data: null,
        accessToken: 'test-token'
      })

      const provider = authOptions.providers[0]
      
      const result = await provider.authorize?.({ 
        username: 'testuser', 
        password: 'testpass' 
      })
      
      expect(result).toBeNull()
    })
  })

  describe('Role Mapping', () => {
    it('should map student role correctly', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari/bakalari')
      const { prisma } = await import('../prisma')
      
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        status: { success: true, loginFailed: false, userDataFailed: false },
        data: {
          userType: 'student',
          fullUserName: 'Test Student',
          classAbbrev: '1.A',
          classId: 'class123',
          userID: 'student123'
        },
        accessToken: 'test-token'
      })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          class: {
            findFirst: vi.fn().mockResolvedValue({ id: 'class123' }),
            create: vi.fn()
          },
          user: {
            upsert: vi.fn().mockResolvedValue({
              id: 'user123',
              email: 'student123@bakalari.local',
              name: 'Test Student',
              role: UserRole.STUDENT,
              classId: 'class123'
            })
          }
        }
        return callback(mockTx as any)
      })

      const provider = authOptions.providers[0]
      const result = await provider.authorize?.({ 
        username: 'testuser', 
        password: 'testpass' 
      })

      expect(result?.role).toBe(UserRole.STUDENT)
    })

    it('should map teacher role correctly', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari/bakalari')
      const { prisma } = await import('../prisma')
      
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        status: { success: true, loginFailed: false, userDataFailed: false },
        data: {
          userType: 'teacher',
          fullUserName: 'Test Teacher',
          classAbbrev: null,
          classId: null,
          userID: 'teacher123'
        },
        accessToken: 'test-token'
      })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          class: {
            findFirst: vi.fn(),
            create: vi.fn()
          },
          user: {
            upsert: vi.fn().mockResolvedValue({
              id: 'user123',
              email: 'teacher123@bakalari.local',
              name: 'Test Teacher',
              role: UserRole.TEACHER,
              classId: null
            })
          }
        }
        return callback(mockTx as any)
      })

      const provider = authOptions.providers[0]
      const result = await provider.authorize?.({ 
        username: 'testuser', 
        password: 'testpass' 
      })

      expect(result?.role).toBe(UserRole.TEACHER)
    })
  })
})
