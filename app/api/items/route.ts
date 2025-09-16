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

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createItemSchema.parse(body)
    
    const user = await requireOperator()
    
    const item = await ItemsService.createItem(validatedData)
    
    return NextResponse.json({ 
      ok: true,
      data: { item },
      requestId 
    }, { status: 201 })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: "Internal server error",
      requestId
    }, { status: 500 })
  }
}
