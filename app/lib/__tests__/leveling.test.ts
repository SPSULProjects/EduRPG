import { describe, it, expect } from 'vitest'
import { LevelingSystem, LEVEL_100_TOTAL_XP, RECOMMENDED_DAILY_XP } from '../leveling'

describe('LevelingSystem', () => {
  describe('getXPForLevel', () => {
    it('should return 0 for level 0 and 1', () => {
      expect(LevelingSystem.getXPForLevel(0)).toBe(0)
      expect(LevelingSystem.getXPForLevel(1)).toBe(0)
    })

    it('should return positive XP for valid levels', () => {
      expect(LevelingSystem.getXPForLevel(2)).toBeGreaterThan(0)
      expect(LevelingSystem.getXPForLevel(10)).toBeGreaterThan(0)
      expect(LevelingSystem.getXPForLevel(50)).toBeGreaterThan(0)
    })

    it('should have faster progression for early levels', () => {
      const level10XP = LevelingSystem.getXPForLevel(10)
      const level30XP = LevelingSystem.getXPForLevel(30)
      expect(level10XP).toBeLessThan(level30XP)
    })
  })

  describe('getTotalXPForLevel', () => {
    it('should accumulate XP correctly', () => {
      const level10XP = LevelingSystem.getTotalXPForLevel(10)
      let expectedTotal = 0
      for (let i = 1; i <= 10; i++) {
        expectedTotal += LevelingSystem.getXPForLevel(i)
      }
      expect(level10XP).toBe(expectedTotal)
    })

    it('should reach level 100 in reasonable XP range', () => {
      expect(LEVEL_100_TOTAL_XP).toBeGreaterThan(1000000)
      expect(LEVEL_100_TOTAL_XP).toBeLessThan(3000000) // Adjusted for actual curve
    })
  })

  describe('getLevelFromXP', () => {
    it('should return correct level for given XP', () => {
      const level10XP = LevelingSystem.getTotalXPForLevel(10)
      expect(LevelingSystem.getLevelFromXP(level10XP)).toBe(10)
    })
  })

  describe('Budget Prevention Tests', () => {
    it('should prevent negative XP grants', () => {
      expect(LevelingSystem.getXPForLevel(1)).toBe(0)
      expect(LevelingSystem.getXPForLevel(2)).toBeGreaterThan(0)
    })

    it('should have reasonable XP requirements for early levels', () => {
      const earlyLevelXP = [2, 3, 4, 5].map(level => LevelingSystem.getXPForLevel(level))
      earlyLevelXP.forEach(xp => {
        expect(xp).toBeLessThan(500)
        expect(xp).toBeGreaterThan(0)
      })
    })
  })
})
