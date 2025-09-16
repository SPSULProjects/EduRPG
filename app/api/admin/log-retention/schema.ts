import { z } from "zod"

export const logRetentionSchema = z.object({
  daysToKeep: z.number()
    .int("Days to keep must be an integer")
    .min(1, "Must keep at least 1 day of logs")
    .max(365, "Cannot keep more than 365 days of logs"),
  dryRun: z.boolean().optional().default(false)
})

export type LogRetentionRequest = z.infer<typeof logRetentionSchema>
