import { z } from "zod"

export const getStudentXPSchema = z.object({
  subjectId: z.string().cuid("Invalid subject ID format").optional(),
  includeHistory: z.boolean().optional().default(false)
})

export type GetStudentXPRequest = z.infer<typeof getStudentXPSchema>
