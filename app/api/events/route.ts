import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { requireOperator } from "@/app/lib/rbac"
import { z } from "zod"

const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  xpBonus: z.number().min(0).max(10000).optional(),
  rarityReward: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    
    // Only operators can see inactive events
    if (includeInactive && session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const events = await EventsService.getEvents(includeInactive)
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Events GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireOperator()
    const body = await request.json()
    
    const validatedData = createEventSchema.parse(body)
    
    const event = await EventsService.createEvent({
      ...validatedData,
      startsAt: new Date(validatedData.startsAt),
      endsAt: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined
    }, user.id)
    
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("Events POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
