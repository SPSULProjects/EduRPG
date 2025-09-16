import { z } from "zod"

export const applyForJobParamsSchema = z.object({
  id: z.string().cuid("Invalid job ID format")
})

export type ApplyForJobParams = z.infer<typeof applyForJobParamsSchema>
