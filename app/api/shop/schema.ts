import { z } from "zod"

export const purchaseItemSchema = z.object({
  itemId: z.string().cuid("Invalid item ID format"),
  quantity: z.number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(10, "Quantity cannot exceed 10")
})

export const getShopQuerySchema = z.object({
  category: z.string().optional(),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional()
})

export type PurchaseItemRequest = z.infer<typeof purchaseItemSchema>
export type GetShopQuery = z.infer<typeof getShopQuerySchema>
