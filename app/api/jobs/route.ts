import { NextRequest } from "next/server"
import { JobsService } from "@/app/lib/services/jobs"
import { withApiHandler } from "@/app/lib/api/response"
import { withRole } from "@/app/lib/api/guards"
import { UserRole } from "@/app/lib/generated"
import { withValidation } from "@/app/lib/validation/validator"
import { createJobSchema, getJobsQuerySchema, CreateJobRequest, GetJobsQuery } from "./schema"

export const GET = withApiHandler(
  withRole([UserRole.TEACHER, UserRole.OPERATOR, UserRole.STUDENT], async (user, request) => {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = getJobsQuerySchema.parse(queryParams)
    
    let jobs
    if (user.role === UserRole.STUDENT) {
      jobs = await JobsService.getJobsForStudent(user.id, user.classId)
    } else {
      jobs = await JobsService.getJobsForTeacher(user.id)
    }
    
    return { jobs: jobs || [] }
  })
)

export const POST = withApiHandler(
  withRole([UserRole.TEACHER, UserRole.OPERATOR], async (user, request) => {
    const body = await request.json()
    const validatedData = createJobSchema.parse(body)
    
    const job = await JobsService.createJob({
      ...validatedData,
      teacherId: user.id
    })
    
    return { job }
  })
)