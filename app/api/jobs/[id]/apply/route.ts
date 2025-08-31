import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { generateRequestId, sanitizeForLog, logEvent } from "@/app/lib/utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  
  try {
    // Validate session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent('WARN', 'auth_deny', {
        requestId,
        metadata: { path: '/api/jobs/[id]/apply', reason: 'No session' }
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Validate job ID
    const { id } = await params
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      await logEvent('WARN', 'validation_error', {
        requestId,
        userId: session.user.id,
        metadata: { 
          path: '/api/jobs/[id]/apply',
          field: 'jobId',
          value: id
        }
      })
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
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
    
    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    // Log error with context
    await logEvent('ERROR', 'job_application_failed', {
      requestId,
      userId: session?.user?.id,
      metadata: {
        path: '/api/jobs/[id]/apply',
        jobId: await params.then(p => p.id).catch(() => 'unknown'),
        error: error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error'
      }
    })
    
    // Return appropriate error response
    if (error instanceof Error) {
      // Map domain errors to appropriate HTTP status codes
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }
      if (error.message.includes('already applied')) {
        return NextResponse.json({ error: "Already applied for this job" }, { status: 409 })
      }
      if (error.message.includes('not open') || error.message.includes('full')) {
        return NextResponse.json({ error: "Job is not available" }, { status: 400 })
      }
      // For other domain errors, return 400
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    
    // For unexpected errors, return 500
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
