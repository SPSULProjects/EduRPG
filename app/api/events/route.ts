import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { withValidation } from "@/app/lib/validation/validator"
import { createEventSchema, getEventsQuerySchema, CreateEventRequest, GetEventsQuery } from "./schema"
import { ErrorResponses, createSuccessResponse, withApiErrorHandler } from "@/app/lib/api/error-responses"

export const GET = withApiErrorHandler(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  // Validate query parameters
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get("includeInactive") === "true"
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return ErrorResponses.unauthorized(requestId)
  }
  
  // Only operators can see inactive events
  if (includeInactive && session.user.role !== "OPERATOR") {
    return ErrorResponses.forbidden(requestId)
  }
  
  const events = await EventsService.getEvents(includeInactive)
  return createSuccessResponse({ events }, 200, requestId)
})

export const POST = withApiErrorHandler(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  // Check authentication first
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return ErrorResponses.unauthorized(requestId)
  }
  
  // Check authorization - only operators can create events
  if (session.user.role !== "OPERATOR") {
    return ErrorResponses.forbidden(requestId)
  }
  
  // Parse and validate request body
  const body = await request.json()
  const validatedData = createEventSchema.parse(body)
  
  const event = await EventsService.createEvent({
    title: validatedData.title,
    description: validatedData.description || null,
    startsAt: new Date(validatedData.startsAt),
    endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : null,
    ...(validatedData.xpBonus !== undefined && { xpBonus: validatedData.xpBonus }),
    rarityReward: validatedData.rarityReward || null
  }, session.user.id)
  
  return createSuccessResponse({ event }, 201, requestId)
})
