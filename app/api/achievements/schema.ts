import { z } from "zod"

export const createAchievementSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  description: z.string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  iconUrl: z.string()
    .url("Invalid icon URL format")
    .optional(),
  xpReward: z.number()
    .int("XP reward must be an integer")
    .min(1, "XP reward must be at least 1")
    .max(10000, "XP reward cannot exceed 10,000"),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]),
  criteria: z.record(z.any()) // Flexible criteria object
})

export const getAchievementsQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional()
})

export type CreateAchievementRequest = z.infer<typeof createAchievementSchema>
export type GetAchievementsQuery = z.infer<typeof getAchievementsQuerySchema>
