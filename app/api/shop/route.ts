import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ShopService } from "@/app/lib/services/shop"
import { z } from "zod"

const purchaseSchema = z.object({
  itemId: z.string().cuid()
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

    const items = await ShopService.getShopItems()
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Shop GET error:", error)
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

    const body = await request.json()
    const { itemId } = purchaseSchema.parse(body)

    // Generate request ID for idempotency
    const requestId = request.headers.get('x-request-id') || 
                     `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const result = await ShopService.purchaseItem(session.user.id, itemId, requestId)

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      item: result.item,
      userBalance: result.userBalance
    }, { status: 201 })
  } catch (error) {
    console.error("Shop POST error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Item not found or not available') {
        return NextResponse.json(
          { code: 'ITEM_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
      
      if (error.message === 'Insufficient funds') {
        return NextResponse.json(
          { code: 'INSUFFICIENT_FUNDS', message: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
