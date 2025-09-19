import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { generateRequestId, sanitizeForLog, logEvent } from "@/app/lib/utils"
import { withValidation } from "@/app/lib/validation/validator"
import { applyForJobParamsSchema, ApplyForJobParams } from "./schema"
import { ErrorResponses, createSuccessResponse, withApiErrorHandler } from "@/app/lib/api/error-responses"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: any = null
  let id: string = ''
  const requestId = request.headers.get('x-request-id') || generateRequestId()
  
  try {
    // Get route parameters
    const paramsData = await params
    id = paramsData.id
    
    // Validate session first to get userId for logging
    session = await getServerSession(authOptions)
    
    // Validate job ID
    if (!id || id.trim() === '') {
      await logEvent('WARN', 'validation_error', {
        requestId,
        userId: session?.user?.id,
        metadata: {
          path: '/api/jobs/[id]/apply',
          field: 'jobId',
          value: id
        }
      })
      return ErrorResponses.badRequest("Invalid job ID", undefined, requestId)
    }
    
    if (!session?.user) {
      await logEvent('WARN', 'auth_deny', {
        requestId,
        metadata: { path: '/api/jobs/[id]/apply', reason: 'No session' }
      })
      return ErrorResponses.unauthorized(requestId)
    }
    
    // Validate role
    if (session.user.role !== "STUDENT") {
      await logEvent('WARN', 'rbac_deny', {
        requestId,
        userId: session.user.id,
        metadata: { 
          path: '/api/jobs/[id]/apply', 
          userRole: session.user.role,
          requiredRole: 'STUDENT'
        }
      })
      return ErrorResponses.forbidden(requestId)
    }
    
    // Apply for job with request ID
    const assignment = await JobsService.applyForJob(id, session.user.id, requestId)
    
    // Log successful application
    await logEvent('INFO', 'job_application_success', {
      requestId,
      userId: session.user.id,
      metadata: {
        jobId: id,
        assignmentId: assignment.id
      }
    })
    
    return createSuccessResponse({ assignment }, 201, requestId)
  } catch (error) {
    // Log error with context
    await logEvent('ERROR', 'job_application_failed', {
      requestId,
      userId: session?.user?.id,
      metadata: {
        path: '/api/jobs/[id]/apply',
        error: error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error',
        jobId: id
      }
    })
    
    // Return appropriate error response
    if (error instanceof Error) {
      // Map domain errors to appropriate HTTP status codes
      if (error.message.includes('not found')) {
        return ErrorResponses.notFound("Job not found", requestId)
      }
      if (error.message.includes('already applied')) {
        return ErrorResponses.conflict("Already applied for this job", requestId)
      }
      if (error.message.includes('not open') || error.message.includes('full')) {
        return ErrorResponses.badRequest("Job is not available", undefined, requestId)
      }
      // For other domain errors, return 400
      return ErrorResponses.badRequest("Invalid request", undefined, requestId)
    }
    
    // For unexpected errors, return 500
    return ErrorResponses.internalError(requestId)
  }
}
