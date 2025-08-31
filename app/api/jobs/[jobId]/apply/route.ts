import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const { jobId } = await params
    
    const assignment = await JobsService.applyForJob(jobId, session.user.id)
    
    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error("Job apply error:", error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
