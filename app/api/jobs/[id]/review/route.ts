import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { z } from "zod"

const reviewSchema = z.object({
  assignmentId: z.string().cuid(),
  action: z.enum(["approve", "reject", "return"])
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher()
    const { id } = await params
    const body = await request.json()
    
    const validatedData = reviewSchema.parse(body)
    
    let result
    switch (validatedData.action) {
      case "approve":
        result = await JobsService.approveJobAssignment(validatedData.assignmentId, user.id)
        break
      case "reject":
        result = await JobsService.rejectJobAssignment(validatedData.assignmentId, user.id)
        break
      case "return":
        result = await JobsService.returnJobAssignment(validatedData.assignmentId, user.id)
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    
    return NextResponse.json({ assignment: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("Job review error:", error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
