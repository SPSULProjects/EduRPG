import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { id: classId } = await params
    
    // Verify user has access to this class
    if (session.user.role === "STUDENT" && session.user.classId !== classId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const jobs = await JobsService.getJobsForClass(classId, session.user.id, session.user.role)
    
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Class jobs GET error:", error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
