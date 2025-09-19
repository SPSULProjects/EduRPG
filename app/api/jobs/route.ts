import { NextRequest } from "next/server"
import { JobsService } from "@/app/lib/services/jobs"
import { withRole } from "@/app/lib/api/guards"
import { UserRole } from "@/app/lib/generated"
import { withValidation } from "@/app/lib/validation/validator"
import { createJobSchema, getJobsQuerySchema, CreateJobRequest, GetJobsQuery } from "./schema"
import { ErrorResponses, createSuccessResponse, withApiErrorHandler } from "@/app/lib/api/error-responses"

export const GET = withApiErrorHandler(
  withRole([UserRole.TEACHER, UserRole.OPERATOR, UserRole.STUDENT], async (user, request) => {
    const requestId = request.headers.get('x-request-id') || undefined
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    try {
      const validatedQuery = getJobsQuerySchema.parse(queryParams)
      
      let jobs
      if (user.role === UserRole.STUDENT) {
        jobs = await JobsService.getJobsForStudent(user.id, user.classId)
      } else {
        jobs = await JobsService.getJobsForTeacher(user.id)
      }
      
      return createSuccessResponse({ jobs: jobs || [] }, 200, requestId)
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return ErrorResponses.validationError("Invalid query parameters", error, requestId)
      }
      throw error
    }
  })
)

export const POST = withApiErrorHandler(
  withRole([UserRole.TEACHER, UserRole.OPERATOR], async (user, request) => {
    const requestId = request.headers.get('x-request-id') || undefined
    
    try {
      const body = await request.json()
      const validatedData = createJobSchema.parse(body)
      
      const job = await JobsService.createJob({
        title: validatedData.title,
        description: validatedData.description,
        subjectId: validatedData.subjectId,
        teacherId: user.id,
        xpReward: validatedData.xpReward,
        moneyReward: validatedData.moneyReward,
        ...(validatedData.maxStudents !== undefined && { maxStudents: validatedData.maxStudents })
      })
      
      return createSuccessResponse({ job }, 201, requestId)
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return ErrorResponses.validationError("Invalid request body", error, requestId)
      }
      throw error
    }
  })
)