import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { z } from "zod"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"

const createJobSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  subjectId: z.string().cuid(),
  xpReward: z.number().min(1).max(10000),
  moneyReward: z.number().min(0).max(10000),
  maxStudents: z.number().min(1).max(10).optional()
})

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request)
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent("WARN", "job_list_unauthorized", {
        requestId,
        metadata: { path: "/api/jobs" }
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const role = session.user.role
    
    if (role === "STUDENT") {
      const jobs = await JobsService.getJobsForStudent(session.user.id, session.user.classId)
      await logEvent("INFO", "job_list_student", {
        requestId,
        userId: session.user.id,
        metadata: { jobCount: jobs.length }
      })
      return NextResponse.json({ jobs: jobs || [] })
    } else if (role === "TEACHER" || role === "OPERATOR") {
      const jobs = await JobsService.getJobsForTeacher(session.user.id)
      await logEvent("INFO", "job_list_teacher", {
        requestId,
        userId: session.user.id,
        metadata: { jobCount: jobs.length }
      })
      return NextResponse.json({ jobs: jobs || [] })
    }
    
    await logEvent("WARN", "job_list_invalid_role", {
      requestId,
      userId: session.user.id,
      metadata: { role }
    })
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  } catch (error) {
    await logEvent("ERROR", "job_list_error", {
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    console.error("Jobs GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request)
  
  try {
    const user = await requireTeacher(requestId)
    const body = await request.json()
    
    const validatedData = createJobSchema.parse(body)
    
    const job = await JobsService.createJob({
      ...validatedData,
      teacherId: user.id
    })
    
    await logEvent("INFO", "job_created", {
      requestId,
      userId: user.id,
      metadata: {
        jobId: job.id,
        title: job.title,
        xpReward: job.xpReward,
        moneyReward: job.moneyReward
      }
    })
    
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      await logEvent("WARN", "job_create_validation_error", {
        requestId,
        metadata: { errors: error.errors }
      })
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    await logEvent("ERROR", "job_create_error", {
      requestId,
      metadata: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    console.error("Jobs POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
