import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ShopService } from "@/app/lib/services/shop"
import { requireStudent } from "@/app/lib/rbac"
import { z } from "zod"
import { withApiErrorEnvelope, createAuthErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"

const buyItemSchema = z.object({
  itemId: z.string().cuid()
})

export const GET = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createAuthErrorResponse(requestId)
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
    
    return createSuccessNextResponse({
      items,
      userBalance: balance,
      userPurchases: purchases
    }, requestId)
  }
  
  return createSuccessNextResponse({ items }, requestId)
})

export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const user = await requireStudent()
  const body = await request.json()
  
  const validatedData = buyItemSchema.parse(body)
  
  const purchase = await ShopService.buyItem(
    validatedData.itemId,
    user.id
  )
  
  return createSuccessNextResponse({ purchase }, requestId, 201)
})
