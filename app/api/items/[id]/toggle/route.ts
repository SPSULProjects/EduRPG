import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ItemsService } from "@/app/lib/services/items"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only operators can toggle items
    if (session.user.role !== 'OPERATOR') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Operator access required' },
        { status: 403 }
      )
    }

    const { id: itemId } = await params

    const item = await ItemsService.toggleItemStatus(itemId)

    return NextResponse.json({
      success: true,
      item
    })
  } catch (error) {
    console.error("Item toggle error:", error)
    
    if (error instanceof Error) {
      if (error.message === 'Item not found') {
        return NextResponse.json(
          { code: 'ITEM_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
