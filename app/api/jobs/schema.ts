import { z } from "zod"

export const createJobSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
  description: z.string()
    .min(1, "Description is required")
    .max(1000, "Description cannot exceed 1000 characters")
    .trim(),
  subjectId: z.string().cuid("Invalid subject ID format"),
  xpReward: z.number()
    .int("XP reward must be an integer")
    .min(1, "XP reward must be at least 1")
    .max(10000, "XP reward cannot exceed 10,000"),
  moneyReward: z.number()
    .int("Money reward must be an integer")
    .min(0, "Money reward cannot be negative")
    .max(10000, "Money reward cannot exceed 10,000"),
  maxStudents: z.number()
    .int("Max students must be an integer")
    .min(1, "Max students must be at least 1")
    .max(10, "Max students cannot exceed 10")
    .optional()
})

export const getJobsQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  subjectId: z.string().cuid().optional(),
  classId: z.string().cuid().optional()
})

export type CreateJobRequest = z.infer<typeof createJobSchema>
export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>
