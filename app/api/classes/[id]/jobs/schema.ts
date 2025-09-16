import { z } from "zod"

export const getClassJobsParamsSchema = z.object({
  id: z.string().cuid("Invalid class ID format")
})

export const getClassJobsQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  subjectId: z.string().cuid().optional()
})

export type GetClassJobsParams = z.infer<typeof getClassJobsParamsSchema>
export type GetClassJobsQuery = z.infer<typeof getClassJobsQuerySchema>
