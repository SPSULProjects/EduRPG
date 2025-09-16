import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { requireOperator } from "@/app/lib/rbac"
import { z } from "zod"
import { withApiErrorEnvelope, createAuthErrorResponse, createForbiddenErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"

const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  xpBonus: z.number().min(0).max(10000).optional(),
  rarityReward: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional()
})

export const GET = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createAuthErrorResponse(requestId)
  }
  
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get("includeInactive") === "true"
  
  // Only operators can see inactive events
  if (includeInactive && session.user.role !== "OPERATOR") {
    return createForbiddenErrorResponse(requestId)
  }
  
  const events = await EventsService.getEvents(includeInactive)
  return createSuccessNextResponse({ events }, requestId)
})

export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const user = await requireOperator()
  const body = await request.json()
  
  const validatedData = createEventSchema.parse(body)
  
  const event = await EventsService.createEvent({
    ...validatedData,
    startsAt: new Date(validatedData.startsAt),
    endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined
  }, user.id)
  
  return createSuccessNextResponse({ event }, requestId, 201)
})
