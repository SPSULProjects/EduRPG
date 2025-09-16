import { z } from "zod"
import { ItemRarity, ItemType } from "@/app/lib/generated"

export const createItemSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  description: z.string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  price: z.number()
    .int("Price must be an integer")
    .min(1, "Price must be at least 1")
    .max(10000, "Price cannot exceed 10,000"),
  rarity: z.nativeEnum(ItemRarity, {
    errorMap: () => ({ message: "Invalid rarity value" })
  }),
  type: z.nativeEnum(ItemType, {
    errorMap: () => ({ message: "Invalid item type" })
  }),
  imageUrl: z.string()
    .url("Invalid image URL format")
    .optional()
})

export type CreateItemRequest = z.infer<typeof createItemSchema>
