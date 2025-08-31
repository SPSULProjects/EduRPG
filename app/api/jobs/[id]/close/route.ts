import { NextRequest, NextResponse } from "next/server"
import { JobsService } from "@/app/lib/services/jobs"
import { requireTeacher } from "@/app/lib/rbac"
import { getRequestId } from "@/app/lib/utils"
import { z } from "zod"

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = `close_job:${userId}`
  const userLimit = rateLimitMap.get(key)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTeacher()
    const { id } = await params
    
    // Validate job ID format
    const jobIdSchema = z.string().cuid()
    jobIdSchema.parse(id)
    
    // Rate limiting: max 10 job closes per minute per teacher
    if (!checkRateLimit(user.id, 10, 60000)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 })
    }
    
    // Get request ID for audit trail
    const requestId = getRequestId(request.headers)
    
    const result = await JobsService.closeJob(id, user.id, requestId)
    
    return NextResponse.json({ 
      job: result.job,
      payouts: result.payouts,
      remainder: result.remainder
    })
  } catch (error) {
    console.error("Job close error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid job ID format", details: error.errors }, { status: 400 })
    }
    
    if (error instanceof Error) {
      // Map specific errors to appropriate HTTP status codes
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes("permissions") || error.message.includes("creator")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes("status")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
