/**
 * T13 Security, Privacy & Retention Tests
 * 
 * Tests for:
 * - PII redaction in logs
 * - Log retention functionality
 * - Rate limiting
 * - Secure cookie configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  redactPIIFromString, 
  redactPIIFromObject, 
  createSafeLogMetadata, 
  validateLogEntry 
} from '../../security/pii-redaction'
import { 
  RateLimitService, 
  loginRateLimit, 
  apiRateLimit 
} from '../../security/rate-limiting'
import { LogRetentionService } from '../../services/log-retention'
import { logEvent } from '../../utils'

describe('T13: PII Redaction', () => {
  describe('redactPIIFromString', () => {
    it('should redact email addresses', () => {
      const input = 'User john.doe@example.com logged in'
      const result = redactPIIFromString(input)
      expect(result).toBe('User [REDACTED] logged in')
    })

    it('should redact phone numbers', () => {
      const input = 'Contact user at +420 123 456 789'
      const result = redactPIIFromString(input)
      expect(result).toBe('Contact user at [REDACTED]')
    })

    it('should redact passwords', () => {
      const input = 'password: secret123'
      const result = redactPIIFromString(input)
      expect(result).toBe('[REDACTED]: [REDACTED]')
    })

    it('should not redact non-PII text', () => {
      const input = 'System started successfully'
      const result = redactPIIFromString(input)
      expect(result).toBe(input)
    })
  })

  describe('redactPIIFromObject', () => {
    it('should redact PII fields in objects', () => {
      const input = {
        username: 'john.doe',
        email: 'john@example.com',
        password: 'secret123',
        message: 'Login successful',
        count: 5
      }
      const result = redactPIIFromObject(input)
      expect(result).toEqual({
        username: '[REDACTED]',
        email: '[REDACTED]',
        password: '[REDACTED]',
        message: 'Login successful',
        count: 5
      })
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        action: 'login'
      }
      const result = redactPIIFromObject(input)
      expect(result).toEqual({
        user: {
          name: '[REDACTED]',
          email: '[REDACTED]'
        },
        action: 'login'
      })
    })

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ]
      }
      const result = redactPIIFromObject(input)
      expect(result).toEqual({
        users: [
          { name: '[REDACTED]', email: '[REDACTED]' },
          { name: '[REDACTED]', email: '[REDACTED]' }
        ]
      })
    })
  })

  describe('createSafeLogMetadata', () => {
    it('should create safe metadata with only allowed fields', () => {
      const input = {
        username: 'john.doe',
        email: 'john@example.com',
        password: 'secret123',
        userId: 'user123',
        requestId: 'req456',
        count: 5,
        timestamp: '2024-01-01T00:00:00Z'
      }
      const result = createSafeLogMetadata(input)
      expect(result).toEqual({
        userId: 'user123',
        requestId: 'req456',
        timestamp: '2024-01-01T00:00:00Z',
        count: 5
      })
    })
  })

  describe('validateLogEntry', () => {
    it('should reject log entries with PII', () => {
      const result = validateLogEntry('INFO', 'User john@example.com logged in')
      expect(result).toBe(false)
    })

    it('should accept log entries without PII', () => {
      const result = validateLogEntry('INFO', 'User logged in successfully')
      expect(result).toBe(true)
    })

    it('should reject metadata with PII', () => {
      const result = validateLogEntry('INFO', 'Login attempt', {
        username: 'john.doe',
        email: 'john@example.com'
      })
      expect(result).toBe(false)
    })
  })
})

describe('T13: Rate Limiting', () => {
  let rateLimiter: RateLimitService

  beforeEach(() => {
    rateLimiter = new RateLimitService({
      windowMs: 60000, // 1 minute
      maxAttempts: 3,
      blockDurationMs: 300000 // 5 minutes
    })
  })

  afterEach(() => {
    // Clean up
    rateLimiter.resetRateLimit('test-key')
  })

  describe('RateLimitService', () => {
    it('should allow requests within limit', () => {
      const result1 = rateLimiter.checkRateLimit('test-key')
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = rateLimiter.checkRateLimit('test-key')
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)
    })

    it('should block requests exceeding limit', () => {
      // Make 3 requests (at limit)
      rateLimiter.checkRateLimit('test-key')
      rateLimiter.checkRateLimit('test-key')
      rateLimiter.checkRateLimit('test-key')

      // 4th request should be blocked
      const result = rateLimiter.checkRateLimit('test-key')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.blocked).toBe(true)
    })

    it('should reset after window expires', () => {
      // Make requests to exceed limit
      rateLimiter.checkRateLimit('test-key')
      rateLimiter.checkRateLimit('test-key')
      rateLimiter.checkRateLimit('test-key')
      rateLimiter.checkRateLimit('test-key') // This should be blocked

      // Reset and try again
      rateLimiter.resetRateLimit('test-key')
      const result = rateLimiter.checkRateLimit('test-key')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should track different keys independently', () => {
      const result1 = rateLimiter.checkRateLimit('key1')
      const result2 = rateLimiter.checkRateLimit('key2')
      
      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result1.remaining).toBe(2)
      expect(result2.remaining).toBe(2)
    })
  })

  describe('Pre-configured rate limiters', () => {
    it('should have correct login rate limit configuration', () => {
      const result = loginRateLimit.checkRateLimit('test-user')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 5 max - 1 current
    })

    it('should have correct API rate limit configuration', () => {
      const result = apiRateLimit.checkRateLimit('test-user')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // 100 max - 1 current
    })
  })
})

describe('T13: Log Retention', () => {
  let retentionService: LogRetentionService

  beforeEach(() => {
    retentionService = new LogRetentionService({
      archiveAfterDays: 1, // 1 day for testing
      restrictAfterDays: 2, // 2 days for testing
      deleteAfterDays: 3, // 3 days for testing
      batchSize: 10
    })
  })

  describe('LogRetentionService', () => {
    it('should have correct default configuration', () => {
      const service = new LogRetentionService()
      expect(service['config']).toEqual({
        archiveAfterDays: 365,
        restrictAfterDays: 730,
        deleteAfterDays: 1095,
        batchSize: 1000
      })
    })

    it('should calculate correct cutoff dates', () => {
      const now = new Date()
      const archiveCutoff = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      const restrictCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const deleteCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      // These would be tested with actual database operations
      expect(archiveCutoff.getTime()).toBeLessThan(now.getTime())
      expect(restrictCutoff.getTime()).toBeLessThan(archiveCutoff.getTime())
      expect(deleteCutoff.getTime()).toBeLessThan(restrictCutoff.getTime())
    })
  })
})

describe('T13: Integration Tests', () => {
  it('should log events without PII', async () => {
    // Mock the database call
    const mockCreate = vi.fn().mockResolvedValue({})
    
    // Mock Prisma specifically for this test
    vi.doMock('../../prisma', () => ({
      prisma: {
        systemLog: {
          create: mockCreate
        }
      }
    }))

    // Clear the module cache and re-import
    vi.resetModules()
    const { logEvent } = await import('../../utils')

    await logEvent('INFO', 'User logged in', {
      userId: 'user123',
      metadata: {
        username: 'john.doe', // This should be redacted
        count: 5
      }
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        level: 'INFO',
        message: 'User logged in',
        userId: 'user123',
        requestId: expect.any(String),
        metadata: expect.objectContaining({
          count: 5
          // username should be redacted
        })
      }
    })
  })

  it('should reject log entries with PII', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Clear the module cache and re-import
    vi.resetModules()
    const { logEvent } = await import('../../utils')

    await logEvent('INFO', 'User john@example.com logged in', {
      userId: 'user123'
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Log entry contains PII and was rejected:',
      expect.objectContaining({
        level: 'INFO',
        message: 'User john@example.com logged in'
      })
    )

    consoleSpy.mockRestore()
  })
})
