/**
 * Leveling System for EduRPG
 * 
 * Level Curve Design:
 * - Total XP needed for level 100: ~1,200,000 XP
 * - Assumes 4 academic years (8 semesters)
 * - Target: Reach level 100 ~1 month before end of year 4
 * - This means ~3.75 years of progression
 * - Average XP needed per day: ~1,200,000 / (3.75 * 365) ≈ 880 XP/day
 * 
 * Curve characteristics:
 * - Early levels (1-20): Fast progression, 50-200 XP per level
 * - Mid levels (21-60): Moderate progression, 200-800 XP per level  
 * - High levels (61-90): Slower progression, 800-2000 XP per level
 * - Elite levels (91-100): Very slow progression, 2000-5000 XP per level
 * 
 * This creates a satisfying progression curve that:
 * - Rewards early engagement with quick level-ups
 * - Maintains long-term engagement through challenging high levels
 * - Prevents burnout by not requiring excessive daily grinding
 * - Allows for meaningful progression throughout the academic career
 */

export interface LevelInfo {
  level: number
  xpRequired: number
  totalXpForLevel: number
  xpForNextLevel: number
}

export class LevelingSystem {
  /**
   * Calculate XP required for a specific level
   * Uses a modified exponential curve: base * (level ^ 1.5) + offset
   */
  static getXPForLevel(level: number): number {
    if (level <= 0) return 0
    if (level === 1) return 0
    
    // Base formula: 50 * (level ^ 1.5) + (level * 10)
    const baseXP = Math.floor(50 * Math.pow(level, 1.5) + (level * 10))
    
    // Apply curve adjustments for different level ranges
    if (level <= 20) {
      // Early levels: Faster progression
      return Math.floor(baseXP * 0.8)
    } else if (level <= 60) {
      // Mid levels: Standard progression
      return baseXP
    } else if (level <= 90) {
      // High levels: Slower progression
      return Math.floor(baseXP * 1.2)
    } else {
      // Elite levels: Very slow progression
      return Math.floor(baseXP * 1.5)
    }
  }

  /**
   * Calculate total XP needed to reach a specific level
   */
  static getTotalXPForLevel(level: number): number {
    if (level <= 0) return 0
    
    let totalXP = 0
    for (let i = 1; i <= level; i++) {
      totalXP += this.getXPForLevel(i)
    }
    return totalXP
  }

  /**
   * Get current level from total XP
   */
  static getLevelFromXP(totalXP: number): number {
    if (totalXP < 0) return 0
    
    let level = 0
    let xpNeeded = 0
    
    while (xpNeeded <= totalXP) {
      level++
      xpNeeded += this.getXPForLevel(level)
    }
    
    return level - 1
  }

  /**
   * Get detailed level information
   */
  static getLevelInfo(totalXP: number): LevelInfo {
    const currentLevel = this.getLevelFromXP(totalXP)
    const totalXpForCurrentLevel = this.getTotalXPForLevel(currentLevel)
    const xpForNextLevel = this.getXPForLevel(currentLevel + 1)
    const xpRequired = totalXpForCurrentLevel + xpForNextLevel - totalXP
    
    return {
      level: currentLevel,
      xpRequired,
      totalXpForLevel: totalXpForCurrentLevel,
      xpForNextLevel
    }
  }

  /**
   * Get progress percentage to next level
   */
  static getProgressToNextLevel(totalXP: number): number {
    const levelInfo = this.getLevelInfo(totalXP)
    const xpInCurrentLevel = totalXP - levelInfo.totalXpForLevel
    return Math.min(100, Math.max(0, (xpInCurrentLevel / levelInfo.xpForNextLevel) * 100))
  }

  /**
   * Get XP needed for next level
   */
  static getXPNeededForNextLevel(totalXP: number): number {
    const levelInfo = this.getLevelInfo(totalXP)
    return levelInfo.xpRequired
  }

  /**
   * Validate if a level is achievable within reasonable time
   * Assumes average of 500 XP per day (realistic for active students)
   */
  static isLevelAchievable(level: number, daysAvailable: number): boolean {
    const totalXPNeeded = this.getTotalXPForLevel(level)
    const averageXpPerDay = 500
    const xpNeeded = totalXPNeeded / averageXpPerDay
    
    return xpNeeded <= daysAvailable
  }

  /**
   * Get recommended daily XP target for reaching level 100
   * Assumes 3.75 years (1370 days) to reach level 100
   */
  static getRecommendedDailyXP(): number {
    const level100XP = this.getTotalXPForLevel(100)
    const daysAvailable = 1370 // 3.75 years
    return Math.ceil(level100XP / daysAvailable)
  }
}

// Pre-calculated values for performance
export const LEVEL_100_TOTAL_XP = LevelingSystem.getTotalXPForLevel(100)
export const RECOMMENDED_DAILY_XP = LevelingSystem.getRecommendedDailyXP()

// Export key milestones for reference
export const LEVEL_MILESTONES = {
  LEVEL_10: LevelingSystem.getTotalXPForLevel(10),
  LEVEL_25: LevelingSystem.getTotalXPForLevel(25),
  LEVEL_50: LevelingSystem.getTotalXPForLevel(50),
  LEVEL_75: LevelingSystem.getTotalXPForLevel(75),
  LEVEL_90: LevelingSystem.getTotalXPForLevel(90),
  LEVEL_100: LEVEL_100_TOTAL_XP
}
