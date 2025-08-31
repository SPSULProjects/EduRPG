import { NextRequest, NextResponse } from "next/server"
import { ShopService } from "@/app/lib/services/shop"
import { requireOperator } from "@/app/lib/rbac"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireOperator()
    const itemId = params.id
    
    const updatedItem = await ShopService.toggleItem(itemId)
    
    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }
    
    console.error("Item toggle error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
