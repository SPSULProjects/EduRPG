import { NextRequest, NextResponse } from "next/server"
import { ItemsService } from "@/app/lib/services/items"
import { requireOperator } from "@/app/lib/rbac"
import { withValidation } from "@/app/lib/validation/validator"
import { createItemSchema, CreateItemRequest } from "./schema"

export async function GET(request: NextRequest) {
  try {
    const items = await ItemsService.getAllItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Items GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const POST = withValidation(
  { body: createItemSchema },
  async (data: { body: CreateItemRequest }, request: NextRequest, requestId: string) => {
    const user = await requireOperator()
    
    const item = await ItemsService.createItem(data.body)
    
    return NextResponse.json({ item }, { status: 201 })
  }
)
