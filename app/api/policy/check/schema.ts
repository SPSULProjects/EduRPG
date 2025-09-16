import { z } from "zod"

export const checkPolicyQuerySchema = z.object({
  version: z.string().optional(),
  userId: z.string().cuid().optional()
})

export type CheckPolicyQuery = z.infer<typeof checkPolicyQuerySchema>
