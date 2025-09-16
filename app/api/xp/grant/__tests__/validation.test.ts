import { describe, it, expect } from 'vitest'
import { grantXPSchema } from '../schema'

describe('XP Grant Validation', () => {
  describe('grantXPSchema', () => {
    it('should validate valid XP grant data', () => {
      const validData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 100,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid student ID', () => {
      const invalidData = {
        studentId: 'invalid-id',
        subjectId: 'clh0987654321fedcba',
        amount: 100,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['studentId'])
        expect(result.error.errors[0].message).toContain('Invalid student ID format')
      }
    })

    it('should reject invalid subject ID', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'invalid-id',
        amount: 100,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['subjectId'])
        expect(result.error.errors[0].message).toContain('Invalid subject ID format')
      }
    })

    it('should reject negative amount', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: -10,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['amount'])
        expect(result.error.errors[0].message).toContain('Amount must be at least 1 XP')
      }
    })

    it('should reject amount exceeding maximum', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 15000,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['amount'])
        expect(result.error.errors[0].message).toContain('Amount cannot exceed 10,000 XP')
      }
    })

    it('should reject non-integer amount', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 100.5,
        reason: 'Completed homework assignment'
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['amount'])
        expect(result.error.errors[0].message).toContain('Amount must be an integer')
      }
    })

    it('should reject empty reason', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 100,
        reason: ''
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['reason'])
        expect(result.error.errors[0].message).toContain('Reason is required')
      }
    })

    it('should reject reason exceeding maximum length', () => {
      const invalidData = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 100,
        reason: 'a'.repeat(501) // 501 characters
      }

      const result = grantXPSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['reason'])
        expect(result.error.errors[0].message).toContain('Reason cannot exceed 500 characters')
      }
    })

    it('should trim whitespace from reason', () => {
      const dataWithWhitespace = {
        studentId: 'clh1234567890abcdef',
        subjectId: 'clh0987654321fedcba',
        amount: 100,
        reason: '  Completed homework assignment  '
      }

      const result = grantXPSchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reason).toBe('Completed homework assignment')
      }
    })
  })
})
