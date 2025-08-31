import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { z } from "zod"

const createJobSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  subjectId: z.string().cuid(),
  xpReward: z.number().min(1).max(10000),
  moneyReward: z.number().min(0).max(10000),
  maxStudents: z.number().min(1).max(10).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const role = session.user.role
    
    if (role === "STUDENT") {
      const jobs = await JobsService.getJobsForStudent(session.user.id, session.user.classId)
      return NextResponse.json({ jobs })
    } else if (role === "TEACHER" || role === "OPERATOR") {
      const jobs = await JobsService.getJobsForTeacher(session.user.id)
      return NextResponse.json({ jobs })
    }
    
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  } catch (error) {
    console.error("Jobs GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireTeacher()
    const body = await request.json()
    
    const validatedData = createJobSchema.parse(body)
    
    const job = await JobsService.createJob({
      ...validatedData,
      teacherId: user.id
    })
    
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("Jobs POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
