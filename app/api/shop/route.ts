import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { ShopService } from "@/app/lib/services/shop"
import { requireStudent } from "@/app/lib/rbac"
import { z } from "zod"
// Inline error handling to avoid Next.js client component issues

const buyItemSchema = z.object({
  itemId: z.string().cuid()
})

// Inline error response helpers
function createAuthErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: 'UNAUTHORIZED',
    message: "Authentication required",
    requestId
  }, { status: 401 })
}

function createSuccessNextResponse<T>(data: T, requestId?: string, status: number = 200): NextResponse {
  return NextResponse.json({
    ok: true,
    data,
    requestId
  }, { status })
}

// Inline error envelope wrapper
function withApiErrorEnvelope<T extends any[], R>(
  handler: (request: any, ...args: T) => Promise<R>
) {
  return async (request: any, ...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args)
      
      if (result instanceof NextResponse) {
        return result
      }
      
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      return createSuccessNextResponse(result, requestId)
    } catch (error) {
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      
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
}

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
