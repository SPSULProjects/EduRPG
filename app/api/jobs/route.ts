import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { z } from "zod"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"
import { withApiErrorEnvelope, createAuthErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"

const createJobSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  subjectId: z.string().cuid(),
  xpReward: z.number().min(1).max(10000),
  moneyReward: z.number().min(0).max(10000),
  maxStudents: z.number().min(1).max(10).optional()
})

export const GET = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = getRequestIdFromRequest(request)
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    await logEvent("WARN", "job_list_unauthorized", {
      requestId,
      metadata: { path: "/api/jobs" }
    })
    return createAuthErrorResponse(requestId)
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
    return createSuccessNextResponse({ jobs: jobs || [] }, requestId)
  } else if (role === "TEACHER" || role === "OPERATOR") {
    const jobs = await JobsService.getJobsForTeacher(session.user.id)
    await logEvent("INFO", "job_list_teacher", {
      requestId,
      userId: session.user.id,
      metadata: { jobCount: jobs.length }
    })
    return createSuccessNextResponse({ jobs: jobs || [] }, requestId)
  }
  
  await logEvent("WARN", "job_list_invalid_role", {
    requestId,
    userId: session.user.id,
    metadata: { role }
  })
  throw new Error("Invalid role")
})

export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = getRequestIdFromRequest(request)
  
  const user = await requireTeacher(requestId)
  const body = await request.json()
  
  const validatedData = createJobSchema.parse(body)
  
  const job = await JobsService.createJob({
    ...validatedData,
    teacherId: user.id
  }, requestId)
  
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
  
  return createSuccessNextResponse({ job }, requestId, 201)
})
