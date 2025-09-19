import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { JobsService } from "@/app/lib/services/jobs"
import { z } from "zod"
import { ErrorResponses, createSuccessResponse, withApiErrorHandler } from "@/app/lib/api/error-responses"

const reviewSchema = z.object({
  assignmentId: z.string().cuid(),
  action: z.enum(["approve", "reject", "return"])
})

export const POST = withApiErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  // Check authentication first
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return ErrorResponses.unauthorized(requestId)
  }
  
  // Check authorization - only teachers and operators can review applications
  if (session.user.role !== "TEACHER" && session.user.role !== "OPERATOR") {
    return ErrorResponses.forbidden(requestId)
  }
  
  try {
    const { id } = await params
    const body = await request.json()
    
    const validatedData = reviewSchema.parse(body)
    
    let result
    switch (validatedData.action) {
      case "approve":
        result = await JobsService.approveJobAssignment(validatedData.assignmentId, session.user.id)
        break
      case "reject":
        result = await JobsService.rejectJobAssignment(validatedData.assignmentId, session.user.id)
        break
      case "return":
        result = await JobsService.returnJobAssignment(validatedData.assignmentId, session.user.id)
        break
      default:
        return ErrorResponses.badRequest("Invalid action", undefined, requestId)
    }
    
    return createSuccessResponse({ assignment: result }, 200, requestId)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError("Invalid request body", error, requestId)
    }
    throw error
  }
})
