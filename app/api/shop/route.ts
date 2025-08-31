import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ShopService } from "@/app/lib/services/shop"
import { requireStudent } from "@/app/lib/rbac"
import { z } from "zod"

const buyItemSchema = z.object({
  itemId: z.string().cuid()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"
    
    const items = await ShopService.getItems(activeOnly)
    
    // For students, also get their balance and purchases
    if (session.user.role === "STUDENT") {
      const [balance, purchases] = await Promise.all([
        ShopService.getUserBalance(session.user.id),
        ShopService.getUserPurchases(session.user.id)
      ])
      
      return NextResponse.json({
        items,
        userBalance: balance,
        userPurchases: purchases
      })
    }
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Shop GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireStudent()
    const body = await request.json()
    
    const validatedData = buyItemSchema.parse(body)
    
    const purchase = await ShopService.buyItem(
      validatedData.itemId,
      user.id
    )
    
    return NextResponse.json({ purchase }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    if (error instanceof Error) {
      if (error.message.includes("Insufficient funds") || 
          error.message.includes("not found") ||
          error.message.includes("not available")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    console.error("Shop POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
