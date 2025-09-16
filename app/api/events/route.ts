import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { requireOperator } from "@/app/lib/rbac"
import { withApiErrorEnvelope, createAuthErrorResponse, createForbiddenErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"
import { withValidation } from "@/app/lib/validation/validator"
import { createEventSchema, getEventsQuerySchema, CreateEventRequest, GetEventsQuery } from "./schema"

export const GET = withApiErrorEnvelope(
  withValidation(
    { query: getEventsQuerySchema },
    async (data: { query: GetEventsQuery }, request: NextRequest, requestId: string) => {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return createAuthErrorResponse(requestId)
      }
      
      const { includeInactive } = data.query
      
      // Only operators can see inactive events
      if (includeInactive && session.user.role !== "OPERATOR") {
        return createForbiddenErrorResponse(requestId)
      }
      
      const events = await EventsService.getEvents(includeInactive)
      return createSuccessNextResponse({ events }, requestId)
    }
  )
)

export const POST = withApiErrorEnvelope(
  withValidation(
    { body: createEventSchema },
    async (data: { body: CreateEventRequest }, request: NextRequest, requestId: string) => {
      const user = await requireOperator()
      
      const event = await EventsService.createEvent({
        ...data.body,
        startsAt: new Date(data.body.startsAt),
        endsAt: data.body.endsAt ? new Date(data.body.endsAt) : undefined
      }, user.id)
      
      return createSuccessNextResponse({ event }, requestId, 201)
    }
  )
)
