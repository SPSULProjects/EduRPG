import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { EventsService } from "@/app/lib/services/events"
import { generateRequestId } from "@/app/lib/utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { id: eventId } = await params
    const requestId = generateRequestId()
    
    const participation = await EventsService.participateInEvent(
      eventId,
      session.user.id,
      requestId
    )
    
    return NextResponse.json({ participation }, { status: 201 })
  } catch (error) {
    console.error("Event participation error:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("inactive")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes("already participated")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes("not currently active")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
