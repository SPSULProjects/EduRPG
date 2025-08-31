import { NextRequest, NextResponse } from "next/server"
import { ItemsService } from "@/app/lib/services/items"
import { requireOperator } from "@/app/lib/rbac"
import { ItemRarity, ItemType } from "@/app/lib/generated"
import { z } from "zod"

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  price: z.number().min(1).max(10000),
  rarity: z.nativeEnum(ItemRarity),
  type: z.nativeEnum(ItemType),
  imageUrl: z.string().url().optional()
})

export async function GET(request: NextRequest) {
  try {
    const items = await ItemsService.getAllItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Items GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireOperator()
    const body = await request.json()
    
    const validatedData = createItemSchema.parse(body)
    
    const item = await ItemsService.createItem(validatedData)
    
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("Items POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
