import { z } from "zod"

export const createEventSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
  description: z.string()
    .max(1000, "Description cannot exceed 1000 characters")
    .trim()
    .optional(),
  startsAt: z.string()
    .datetime("Invalid datetime format for start time"),
  endsAt: z.string()
    .datetime("Invalid datetime format for end time")
    .optional(),
  xpBonus: z.number()
    .int("XP bonus must be an integer")
    .min(0, "XP bonus cannot be negative")
    .max(10000, "XP bonus cannot exceed 10,000")
    .optional(),
  rarityReward: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"])
    .optional()
})

export const getEventsQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false)
})

export type CreateEventRequest = z.infer<typeof createEventSchema>
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>
