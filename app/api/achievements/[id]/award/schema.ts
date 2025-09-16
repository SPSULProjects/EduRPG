import { z } from "zod"

export const awardAchievementParamsSchema = z.object({
  id: z.string().cuid("Invalid achievement ID format")
})

export const awardAchievementSchema = z.object({
  studentId: z.string().cuid("Invalid student ID format"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters")
    .trim()
})

export type AwardAchievementParams = z.infer<typeof awardAchievementParamsSchema>
export type AwardAchievementRequest = z.infer<typeof awardAchievementSchema>
