import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ItemsService } from "@/app/lib/services/items"
import { requireOperator } from "@/app/lib/rbac"
import { z } from "zod"
import { ItemRarity, ItemType } from "@/app/lib/generated"

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  price: z.number().min(0).max(100000),
  rarity: z.nativeEnum(ItemRarity),
  type: z.nativeEnum(ItemType),
  imageUrl: z.string().url().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only operators can manage items
    if (session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Operator access required' },
        { status: 403 }
      )
    }

    const items = await ItemsService.getAllItems()
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Items GET error:", error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only operators can create items
    if (session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Operator access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const itemData = createItemSchema.parse(body)

    const item = await ItemsService.createItem(itemData)

    return NextResponse.json({
      success: true,
      item
    }, { status: 201 })
  } catch (error) {
    console.error("Items POST error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
