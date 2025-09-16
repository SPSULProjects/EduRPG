import { z } from "zod"

export const reviewJobParamsSchema = z.object({
  id: z.string().cuid("Invalid job ID format")
})

export const reviewJobSchema = z.object({
  assignmentId: z.string().cuid("Invalid assignment ID format"),
  grade: z.number()
    .int("Grade must be an integer")
    .min(1, "Grade must be at least 1")
    .max(5, "Grade must be at most 5"),
  feedback: z.string()
    .max(1000, "Feedback cannot exceed 1000 characters")
    .trim()
    .optional()
})

export type ReviewJobParams = z.infer<typeof reviewJobParamsSchema>
export type ReviewJobRequest = z.infer<typeof reviewJobSchema>
