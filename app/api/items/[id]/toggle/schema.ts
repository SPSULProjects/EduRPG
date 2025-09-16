import { z } from "zod"

export const toggleItemParamsSchema = z.object({
  id: z.string().cuid("Invalid item ID format")
})

export type ToggleItemParams = z.infer<typeof toggleItemParamsSchema>
