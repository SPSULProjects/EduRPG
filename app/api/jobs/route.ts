import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { logEvent, getRequestIdFromRequest } from "@/app/lib/utils"
// Inline error handling to avoid Next.js client component issues
import { withValidation } from "@/app/lib/validation/validator"
import { createJobSchema, getJobsQuerySchema, CreateJobRequest, GetJobsQuery } from "./schema"

// Inline error response helpers
function createAuthErrorResponse(requestId?: string): NextResponse {
  return NextResponse.json({
    ok: false,
    code: 'UNAUTHORIZED',
    message: "Authentication required",
    requestId
  }, { status: 401 })
}

function createSuccessNextResponse<T>(data: T, requestId?: string, status: number = 200): NextResponse {
  return NextResponse.json({
    ok: true,
    data,
    requestId
  }, { status })
}

// Inline error envelope wrapper
function withApiErrorEnvelope<T extends any[], R>(
  handler: (request: any, ...args: T) => Promise<R>
) {
  return async (request: any, ...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args)
      
      if (result instanceof NextResponse) {
        return result
      }
      
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      return createSuccessNextResponse(result, requestId)
    } catch (error) {
      const requestId = request?.headers?.get?.('x-request-id') || undefined
      
      console.error("API Error:", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return NextResponse.json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: "Internal server error",
        requestId
      }, { status: 500 })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const subjectId = searchParams.get("subjectId") || undefined
    const classId = searchParams.get("classId") || undefined
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent("WARN", "job_list_unauthorized", {
        requestId,
        metadata: { path: "/api/jobs" }
      })
      return createAuthErrorResponse(requestId)
    }
    
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
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: "Internal server error",
      requestId
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || undefined
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createJobSchema.parse(body)
    
    const user = await requireTeacher(requestId)
    
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
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || undefined
    console.error("API Error:", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: "Internal server error",
      requestId
    }, { status: 500 })
  }
}
