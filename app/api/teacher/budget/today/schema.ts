import { z } from "zod"

export const getTeacherBudgetQuerySchema = z.object({
  subjectId: z.string().cuid().optional(),
  includeHistory: z.boolean().optional().default(false)
})

export type GetTeacherBudgetQuery = z.infer<typeof getTeacherBudgetQuerySchema>
