import { z } from "zod"

export const participateEventParamsSchema = z.object({
  id: z.string().cuid("Invalid event ID format")
})

export type ParticipateEventParams = z.infer<typeof participateEventParamsSchema>
