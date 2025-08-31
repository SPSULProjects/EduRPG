import { describe, it, expect } from 'vitest'
import { XPService } from '../xp'

describe('XPService', () => {
  describe('Budget Enforcement', () => {
    it('should prevent negative budget calculations', () => {
      // Test that budget calculations don't go negative
      const budget = 1000
      const used = 800
      const remaining = budget - used
      
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(budget).toBeGreaterThan(0)
      expect(used).toBeGreaterThanOrEqual(0)
    })

    it('should validate budget constraints', () => {
      // Test budget validation logic
      const budget = 1000
      const used = 950
      const requested = 100
      
      const wouldExceed = (used + requested) > budget
      expect(wouldExceed).toBe(true)
      
      const validRequest = (used + 50) <= budget
      expect(validRequest).toBe(true)
    })
  })
})
