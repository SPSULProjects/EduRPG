import { z } from "zod"

export const grantXPSchema = z.object({
  studentId: z.string().cuid("Invalid student ID format"),
  subjectId: z.string().cuid("Invalid subject ID format"),
  amount: z.number()
    .int("Amount must be an integer")
    .min(1, "Amount must be at least 1 XP")
    .max(10000, "Amount cannot exceed 10,000 XP"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters")
    .trim()
})

export type GrantXPRequest = z.infer<typeof grantXPSchema>
