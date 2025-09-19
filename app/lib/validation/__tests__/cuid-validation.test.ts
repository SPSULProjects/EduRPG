import { describe, it, expect } from 'vitest'
import { z } from 'zod'

describe('CUID Validation', () => {
  const cuidSchema = z.string().cuid()

  describe('Valid CUIDs', () => {
    const validCuids = [
      'clh1234567890abcdef',
      'cuid_1234567890abcdef',
      'c1234567890abcdef',
      'clh1234567890abcdef1234567890',
      'cuid_1234567890abcdef1234567890'
    ]

    validCuids.forEach(cuid => {
      it(`should accept valid CUID: ${cuid}`, () => {
        const result = cuidSchema.safeParse(cuid)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(cuid)
        }
      })
    })
  })

  describe('Invalid CUIDs', () => {
    const invalidCuids = [
      '', // empty string
      'invalid', // too short
      '1234567890', // numeric only
      'clh-1234567890abcdef', // contains hyphen
      'clh 1234567890abcdef', // contains space
    ]

    invalidCuids.forEach(cuid => {
      it(`should reject invalid CUID: ${cuid}`, () => {
        const result = cuidSchema.safeParse(cuid)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].code).toBe('invalid_string')
          expect(result.error.errors[0].validation).toBe('cuid')
        }
      })
    })
  })

  describe('CUID with custom error message', () => {
    const cuidWithMessage = z.string().cuid('Invalid CUID format')

    it('should provide custom error message for invalid CUID', () => {
      const result = cuidWithMessage.safeParse('invalid')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid CUID format')
      }
    })
  })

  describe('Optional CUID', () => {
    const optionalCuidSchema = z.string().cuid().optional()

    it('should accept valid CUID', () => {
      const result = optionalCuidSchema.safeParse('clh1234567890abcdef')
      expect(result.success).toBe(true)
    })

    it('should accept undefined', () => {
      const result = optionalCuidSchema.safeParse(undefined)
      expect(result.success).toBe(true)
    })

    it('should reject invalid CUID', () => {
      const result = optionalCuidSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('CUID in object schema', () => {
    const objectSchema = z.object({
      id: z.string().cuid('Invalid ID format'),
      name: z.string().min(1),
      optionalId: z.string().cuid().optional()
    })

    it('should validate object with valid CUIDs', () => {
      const validData = {
        id: 'clh1234567890abcdef',
        name: 'Test',
        optionalId: 'cuid_1234567890abcdef'
      }
      const result = objectSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject object with invalid CUID', () => {
      const invalidData = {
        id: 'invalid',
        name: 'Test'
      }
      const result = objectSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['id'])
        expect(result.error.errors[0].message).toBe('Invalid ID format')
      }
    })

    it('should accept object without optional CUID', () => {
      const data = {
        id: 'clh1234567890abcdef',
        name: 'Test'
      }
      const result = objectSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Array of CUIDs', () => {
    const arraySchema = z.array(z.string().cuid())

    it('should validate array of valid CUIDs', () => {
      const validArray = [
        'clh1234567890abcdef',
        'cuid_1234567890abcdef',
        'c1234567890abcdef'
      ]
      const result = arraySchema.safeParse(validArray)
      expect(result.success).toBe(true)
    })

    it('should reject array with invalid CUID', () => {
      const invalidArray = [
        'clh1234567890abcdef',
        'invalid',
        'cuid_1234567890abcdef'
      ]
      const result = arraySchema.safeParse(invalidArray)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual([1])
      }
    })
  })
})
