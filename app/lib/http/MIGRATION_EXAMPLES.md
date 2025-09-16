# Error Envelope Migration Examples

This document shows how to migrate existing API endpoints to use the standardized error envelope system.

## Example 1: XP Grant Endpoint

### Before (Old Pattern)
```typescript
export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request)
  let session: any = null
  
  try {
    session = await getServerSession(authOptions)
    if (!session?.user) {
      await logEvent("WARN", "xp_grant_unauthorized", {
        requestId,
        metadata: { path: "/api/xp/grant" }
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only teachers and operators can grant XP
    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
      await logEvent("WARN", "xp_grant_forbidden", {
        requestId,
        userId: session.user.id,
        metadata: { role: session.user.role }
      })
      return NextResponse.json({ error: "Forbidden - Only teachers can grant XP" }, { status: 403 })
    }
    
    const body = await request.json()
    const { studentId, subjectId, amount, reason } = body
    
    // Validate required fields
    if (!studentId || !subjectId || !amount || !reason) {
      return NextResponse.json({ 
        error: "Missing required fields: studentId, subjectId, amount, reason" 
      }, { status: 400 })
    }
    
    // ... more validation and processing ...
    
    const xpAudit = await XPService.grantXP({
      studentId,
      teacherId: session.user.id,
      subjectId,
      amount,
      reason
    }, requestId)
    
    return NextResponse.json({
      success: true,
      xpAudit: {
        id: xpAudit.id,
        amount: xpAudit.amount,
        reason: xpAudit.reason,
        createdAt: xpAudit.createdAt
      },
      requestId
    })
    
  } catch (error: any) {
    console.error("XP grant error:", error)
    
    // Handle specific budget errors
    if (error.message?.includes("Daily XP budget exceeded")) {
      await logEvent("WARN", "xp_grant_budget_exceeded", {
        requestId,
        userId: session?.user?.id,
        metadata: { error: error.message }
      })
      return NextResponse.json({ 
        error: error.message,
        code: "BUDGET_EXCEEDED"
      }, { status: 409 })
    }
    
    // ... more error handling ...
    
    return NextResponse.json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    }, { status: 500 })
  }
}
```

### After (New Pattern)
```typescript
export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = getRequestIdFromRequest(request)
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    await logEvent("WARN", "xp_grant_unauthorized", {
      requestId,
      metadata: { path: "/api/xp/grant" }
    })
    return createAuthErrorResponse(requestId)
  }
  
  // Only teachers and operators can grant XP
  if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.OPERATOR) {
    await logEvent("WARN", "xp_grant_forbidden", {
      requestId,
      userId: session.user.id,
      metadata: { role: session.user.role }
    })
    return createForbiddenErrorResponse(requestId)
  }
  
  const body = await request.json()
  const { studentId, subjectId, amount, reason } = body
  
  // Validate required fields
  if (!studentId || !subjectId || !amount || !reason) {
    throw new Error("Missing required fields: studentId, subjectId, amount, reason")
  }
  
  // ... more validation and processing ...
  
  const xpAudit = await XPService.grantXP({
    studentId,
    teacherId: session.user.id,
    subjectId,
    amount,
    reason
  }, requestId)
  
  return createSuccessNextResponse({
    xpAudit: {
      id: xpAudit.id,
      amount: xpAudit.amount,
      reason: xpAudit.reason,
      createdAt: xpAudit.createdAt
    }
  }, requestId)
})
```

## Example 2: Jobs List Endpoint

### Before (Old Pattern)
```typescript
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
```

### After (New Pattern)
```typescript
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
```

## Key Changes

1. **Wrapper Function**: Use `withApiErrorEnvelope` to wrap the handler
2. **Error Helpers**: Use `createAuthErrorResponse`, `createForbiddenErrorResponse`, etc.
3. **Success Responses**: Use `createSuccessNextResponse` for consistent success format
4. **Throw Errors**: Instead of manually creating error responses, throw errors and let the wrapper handle them
5. **Simplified Code**: Remove try-catch blocks and manual error response creation
6. **Consistent Format**: All responses follow the same envelope structure

## Benefits of Migration

- **Reduced Code**: ~50% less boilerplate code
- **Consistency**: All endpoints return the same response format
- **Better Debugging**: Request IDs included in all responses
- **Type Safety**: Full TypeScript support
- **Automatic Logging**: Errors are automatically logged with context
- **Maintainability**: Centralized error handling logic
