import { describe, it, expect } from 'vitest'
import { createJobSchema, getJobsQuerySchema } from '../schema'

describe('Jobs Validation', () => {
  describe('createJobSchema', () => {
    it('should validate valid job creation data', () => {
      const validData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: 25,
        maxStudents: 5
      }

      const result = createJobSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate job creation data without optional maxStudents', () => {
      const validData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: 25
      }

      const result = createJobSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: 25
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['title'])
        expect(result.error.errors[0].message).toContain('Title is required')
      }
    })

    it('should reject title exceeding maximum length', () => {
      const invalidData = {
        title: 'a'.repeat(101), // 101 characters
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: 25
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['title'])
        expect(result.error.errors[0].message).toContain('Title cannot exceed 100 characters')
      }
    })

    it('should reject negative XP reward', () => {
      const invalidData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: -10,
        moneyReward: 25
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['xpReward'])
        expect(result.error.errors[0].message).toContain('XP reward must be at least 1')
      }
    })

    it('should reject XP reward exceeding maximum', () => {
      const invalidData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 15000,
        moneyReward: 25
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['xpReward'])
        expect(result.error.errors[0].message).toContain('XP reward cannot exceed 10,000')
      }
    })

    it('should reject negative money reward', () => {
      const invalidData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: -10
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['moneyReward'])
        expect(result.error.errors[0].message).toContain('Money reward cannot be negative')
      }
    })

    it('should reject maxStudents exceeding maximum', () => {
      const invalidData = {
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        subjectId: 'clh1234567890abcdef',
        xpReward: 50,
        moneyReward: 25,
        maxStudents: 15
      }

      const result = createJobSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['maxStudents'])
        expect(result.error.errors[0].message).toContain('Max students cannot exceed 10')
      }
    })
  })

  describe('getJobsQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        includeInactive: true,
        subjectId: 'clh1234567890abcdef',
        classId: 'clh0987654321fedcba'
      }

      const result = getJobsQuerySchema.safeParse(validQuery)
      expect(result.success).toBe(true)
    })

    it('should use default values for optional parameters', () => {
      const minimalQuery = {}

      const result = getJobsQuerySchema.safeParse(minimalQuery)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.includeInactive).toBe(false)
      }
    })

    it('should reject invalid subject ID', () => {
      const invalidQuery = {
        subjectId: 'invalid-id'
      }

      const result = getJobsQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['subjectId'])
        expect(result.error.errors[0].message).toContain('Invalid cuid')
      }
    })

    it('should reject invalid class ID', () => {
      const invalidQuery = {
        classId: 'invalid-id'
      }

      const result = getJobsQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['classId'])
        expect(result.error.errors[0].message).toContain('Invalid cuid')
      }
    })
  })
})
