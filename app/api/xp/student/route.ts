import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { XPService } from "@/app/lib/services/xp"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const xpData = await XPService.getStudentXP(session.user.id)
    
    return NextResponse.json({
      totalXP: xpData.totalXP,
      recentGrants: xpData.recentGrants
    })
  } catch (error) {
    console.error("XP GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
