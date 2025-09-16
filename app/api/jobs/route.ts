import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"
import { withApiErrorEnvelope, createAuthErrorResponse, createSuccessNextResponse } from "@/app/lib/http/error"
import { withValidation } from "@/app/lib/validation/validator"
import { createJobSchema, getJobsQuerySchema, CreateJobRequest, GetJobsQuery } from "./schema"

export const GET = withApiErrorEnvelope(
  withValidation(
    { query: getJobsQuerySchema },
    async (data: { query: GetJobsQuery }, request: NextRequest, requestId: string) => {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        await logEvent("WARN", "job_list_unauthorized", {
          requestId,
          metadata: { path: "/api/jobs" }
        })
        return createAuthErrorResponse(requestId)
      }
      
      const { includeInactive, subjectId, classId } = data.query
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
        const jobs = await JobsService.getJobsForTeacher(session.user.id, { includeInactive, subjectId })
        await logEvent("INFO", "job_list_teacher", {
          requestId,
          userId: session.user.id,
          metadata: { jobCount: jobs.length, includeInactive, subjectId }
        })
        return createSuccessNextResponse({ jobs: jobs || [] }, requestId)
      }
      
      await logEvent("WARN", "job_list_invalid_role", {
        requestId,
        userId: session.user.id,
        metadata: { role }
      })
      throw new Error("Invalid role")
    }
  )
)

export const POST = withApiErrorEnvelope(
  withValidation(
    { body: createJobSchema },
    async (data: { body: CreateJobRequest }, request: NextRequest, requestId: string) => {
      const user = await requireTeacher(requestId)
      
      const job = await JobsService.createJob({
        ...data.body,
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
    }
  )
)
