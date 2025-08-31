import { NextRequest, NextResponse } from "next/server"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher()
    const { id } = await params
    
    const result = await JobsService.closeJob(id, user.id)
    
    return NextResponse.json({ 
      job: result.job,
      payouts: result.payouts,
      remainder: result.remainder
    })
  } catch (error) {
    console.error("Job close error:", error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
