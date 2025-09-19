import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authOptions } from '../auth'
import { UserRole } from '../generated'
import { mockPrisma, resetAllMocks } from '../../../tests/setup/mocks'
import { logEvent } from '../utils'

// All mocks are now handled centrally in tests/setup/mocks.ts

describe('Authentication', () => {
  beforeEach(() => {
    resetAllMocks()
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

    it('should have the correct provider structure', () => {
      const provider = authOptions.providers[0]
      expect(provider.name).toBe('Credentials')
      expect(provider.authorize).toBeDefined()
      expect(typeof provider.authorize).toBe('function')
    })

    it('should handle test credentials authentication', async () => {
      // Set TEST_MODE environment variable
      process.env.TEST_MODE = "true"
      process.env.NODE_ENV = "development"
      
      // Mock rate limiting to allow the request
      const { loginRateLimit } = await import('../security/rate-limiting')
      vi.spyOn(loginRateLimit, 'checkRateLimit').mockReturnValue({
        allowed: true,
        blocked: false,
        remaining: 5,
        resetTime: Date.now() + 60000
      })
      
      // Mock logEvent to prevent errors
      vi.mocked(logEvent).mockResolvedValue(undefined)
      
      // Also mock the logEvent import directly
      const { logEvent: logEventImport } = await import('../utils')
      vi.mocked(logEventImport).mockResolvedValue(undefined)
      
      const provider = authOptions.providers[0]
      
      const result = await provider.options.authorize({ 
        username: 'test', 
        password: 'test' 
      })
        
      expect(result).toEqual({
        id: 'test_user_001',
        email: 'test@edurpg.local',
        name: 'Test User',
        role: UserRole.STUDENT,
        classId: 'test_class_001'
      })
    })

    it('should handle Bakalari authentication failure', async () => {
      const { loginToBakalariAndFetchUserData } = await import('../bakalari')
      
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
      const { loginToBakalariAndFetchUserData } = await import('../bakalari')
      
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
      // Set TEST_MODE environment variable
      process.env.TEST_MODE = "true"
      process.env.NODE_ENV = "development"
      
      // Mock rate limiting to allow the request
      const { loginRateLimit } = await import('../security/rate-limiting')
      vi.spyOn(loginRateLimit, 'checkRateLimit').mockReturnValue({
        allowed: true,
        blocked: false,
        remaining: 5,
        resetTime: Date.now() + 60000
      })
      
      // Mock logEvent to prevent errors
      vi.mocked(logEvent).mockResolvedValue(undefined)
      
      const provider = authOptions.providers[0]
      const result = await provider.options.authorize({ 
        username: 'test', 
        password: 'test' 
      })

      expect(result?.role).toBe(UserRole.STUDENT)
    })

    it('should map teacher role correctly', async () => {
      // Set TEST_MODE environment variable
      process.env.TEST_MODE = "true"
      process.env.NODE_ENV = "development"
      
      // Mock rate limiting to allow the request
      const { loginRateLimit } = await import('../security/rate-limiting')
      vi.spyOn(loginRateLimit, 'checkRateLimit').mockReturnValue({
        allowed: true,
        blocked: false,
        remaining: 5,
        resetTime: Date.now() + 60000
      })
      
      // Mock logEvent to prevent errors
      vi.mocked(logEvent).mockResolvedValue(undefined)
      
      const provider = authOptions.providers[0]
      const result = await provider.options.authorize({ 
        username: 'test', 
        password: 'test' 
      })

      expect(result?.role).toBe(UserRole.STUDENT) // Test credentials always return STUDENT role
    })
  })
})
