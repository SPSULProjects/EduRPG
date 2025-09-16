# HTTP Error Envelope System

This module provides a standardized error handling system for all API routes and server actions in the EduRPG application.

## Features

- **Standardized Error Format**: All errors follow a consistent envelope structure
- **Automatic Error Mapping**: Maps different error types to appropriate HTTP status codes
- **Request ID Tracking**: Includes request IDs for better debugging and tracing
- **Type Safety**: Full TypeScript support with proper error types
- **Wrapper Functions**: Easy-to-use higher-order functions for route handlers

## Error Envelope Format

### Success Response
```typescript
{
  ok: true,
  data: T,
  requestId?: string
}
```

### Error Response
```typescript
{
  ok: false,
  code: string,
  message: string,
  requestId?: string,
  details?: any
}
```

## Error Code Mapping

| Error Type | HTTP Status | Code | Description |
|------------|-------------|------|-------------|
| Zod Validation | 422 | `VALIDATION_ERROR` | Input validation failed |
| Authentication | 401 | `UNAUTHORIZED` | User not authenticated |
| Authorization | 403 | `FORBIDDEN` | User lacks permissions |
| Not Found | 404 | `NOT_FOUND` | Resource not found |
| Conflict | 409 | `CONFLICT` | Resource already exists |
| Rate Limit | 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| Bad Request | 400 | `BAD_REQUEST` | Invalid request data |
| Server Error | 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

## Usage Examples

### Basic API Route with Error Envelope

```typescript
import { withApiErrorEnvelope, createAuthErrorResponse, createSuccessNextResponse } from '@/app/lib/http/error'

export const GET = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createAuthErrorResponse(requestId)
  }
  
  const data = await SomeService.getData()
  return createSuccessNextResponse({ data }, requestId)
})
```

### Manual Error Handling

```typescript
import { asHttpError, createErrorResponse } from '@/app/lib/http/error'

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    const result = await processRequest()
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return createErrorResponse(error, requestId)
  }
}
```

### Custom Error Responses

```typescript
import { createNotFoundErrorResponse, createForbiddenErrorResponse } from '@/app/lib/http/error'

// For specific error cases
if (!resource) {
  return createNotFoundErrorResponse('User not found', requestId)
}

if (!hasPermission) {
  return createForbiddenErrorResponse(requestId)
}
```

### Server Actions with Error Envelope

```typescript
import { withErrorEnvelope } from '@/app/lib/http/error'

export const createItem = withErrorEnvelope(async (formData: FormData) => {
  const name = formData.get('name') as string
  
  if (!name) {
    throw new Error('Name is required')
  }
  
  const item = await ItemsService.create({ name })
  return { item }
})
```

## Migration Guide

### Before (Old Pattern)
```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const data = await processData()
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### After (New Pattern)
```typescript
export const POST = withApiErrorEnvelope(async (request: NextRequest) => {
  const requestId = request.headers.get('x-request-id') || undefined
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return createAuthErrorResponse(requestId)
  }
  
  const data = await processData()
  return createSuccessNextResponse({ data }, requestId)
})
```

## Benefits

1. **Consistency**: All API responses follow the same format
2. **Debugging**: Request IDs make it easier to trace issues
3. **Type Safety**: Full TypeScript support prevents runtime errors
4. **Maintainability**: Centralized error handling logic
5. **User Experience**: Consistent error messages across the application
6. **Monitoring**: Standardized error codes for better analytics

## Testing

The error envelope system includes comprehensive tests. Run them with:

```bash
npm test app/lib/http/__tests__/error.test.ts
```

## Best Practices

1. **Always use the wrapper functions** for new API routes
2. **Include request IDs** for better debugging
3. **Throw meaningful errors** that will be properly mapped
4. **Use specific error helpers** for common cases (auth, not found, etc.)
5. **Test error scenarios** to ensure proper mapping
6. **Log errors appropriately** using the existing logging system
