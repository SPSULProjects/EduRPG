# Input Validation System

This document describes the comprehensive input validation system implemented across all API endpoints using Zod schemas.

## Overview

The validation system provides:
- **Type-safe input validation** using Zod schemas
- **Co-located schemas** next to each route handler
- **Consistent error handling** with detailed validation messages
- **Request boundary validation** - parse and validate at the API boundary
- **Typed objects** passed inward to business logic

## Architecture

### Schema Co-location
Each API route has a corresponding `schema.ts` file in the same directory:
```
app/api/
├── xp/
│   └── grant/
│       ├── route.ts
│       └── schema.ts
├── jobs/
│   ├── route.ts
│   ├── schema.ts
│   └── [id]/
│       └── apply/
│           ├── route.ts
│           └── schema.ts
```

### Validation Middleware
The `withValidation` higher-order function wraps route handlers:
```typescript
export const POST = withValidation(
  { body: createJobSchema },
  async (data: { body: CreateJobRequest }, request: NextRequest, requestId: string) => {
    // Handler receives typed, validated data
    const job = await JobsService.createJob(data.body)
    return NextResponse.json({ job })
  }
)
```

## Schema Examples

### Request Body Validation
```typescript
// app/api/xp/grant/schema.ts
export const grantXPSchema = z.object({
  studentId: z.string().cuid("Invalid student ID format"),
  subjectId: z.string().cuid("Invalid subject ID format"),
  amount: z.number()
    .int("Amount must be an integer")
    .min(1, "Amount must be at least 1 XP")
    .max(10000, "Amount cannot exceed 10,000 XP"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters")
    .trim()
})

export type GrantXPRequest = z.infer<typeof grantXPSchema>
```

### Query Parameter Validation
```typescript
// app/api/jobs/schema.ts
export const getJobsQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  subjectId: z.string().cuid().optional(),
  classId: z.string().cuid().optional()
})

export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>
```

### Route Parameter Validation
```typescript
// app/api/jobs/[id]/apply/schema.ts
export const applyForJobParamsSchema = z.object({
  id: z.string().cuid("Invalid job ID format")
})

export type ApplyForJobParams = z.infer<typeof applyForJobParamsSchema>
```

## Validation Features

### 1. Type Safety
- All schemas generate TypeScript types
- Route handlers receive fully typed data
- Compile-time type checking prevents runtime errors

### 2. Comprehensive Validation Rules
- **String validation**: length limits, format validation (CUID, URL, email)
- **Number validation**: ranges, integer constraints, positive/negative checks
- **Enum validation**: predefined value sets
- **Custom validation**: business logic constraints

### 3. Error Handling
- Detailed validation error messages
- Structured error responses with field-specific errors
- Automatic logging of validation failures
- Consistent HTTP status codes (400 for validation errors)

### 4. Data Transformation
- Automatic type coercion (string to number, boolean)
- String trimming and sanitization
- Default value application

## Implementation Patterns

### Basic Route Handler
```typescript
export const POST = withValidation(
  { body: createItemSchema },
  async (data: { body: CreateItemRequest }, request: NextRequest, requestId: string) => {
    const user = await requireOperator()
    const item = await ItemsService.createItem(data.body)
    return NextResponse.json({ item }, { status: 201 })
  }
)
```

### Route with Query Parameters
```typescript
export const GET = withValidation(
  { query: getEventsQuerySchema },
  async (data: { query: GetEventsQuery }, request: NextRequest, requestId: string) => {
    const { includeInactive } = data.query
    const events = await EventsService.getEvents(includeInactive)
    return NextResponse.json({ events })
  }
)
```

### Route with Parameters and Body
```typescript
export const POST = withValidation(
  { 
    params: reviewJobParamsSchema,
    body: reviewJobSchema 
  },
  async (data: { params: ReviewJobParams, body: ReviewJobRequest }, request: NextRequest, requestId: string) => {
    const { id } = data.params
    const { assignmentId, grade, feedback } = data.body
    // Handle review logic
  }
)
```

## Error Response Format

Validation errors return structured responses:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["amount"],
      "message": "Amount must be at least 1 XP",
      "code": "too_small"
    }
  ],
  "requestId": "req_123456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Security Considerations

### 1. Input Sanitization
- All string inputs are trimmed
- CUID validation prevents injection attacks
- Length limits prevent DoS attacks

### 2. Business Logic Validation
- XP amounts limited to prevent abuse
- User ID validation ensures proper authorization
- Subject/class ID validation maintains data integrity

### 3. Rate Limiting Integration
- Validation errors are logged for monitoring
- Request IDs enable request tracing
- Consistent error responses prevent information leakage

## Testing

### Schema Tests
Each schema has comprehensive test coverage:
```typescript
describe('XP Grant Validation', () => {
  it('should validate valid XP grant data', () => {
    const validData = {
      studentId: 'clh1234567890abcdef',
      subjectId: 'clh0987654321fedcba',
      amount: 100,
      reason: 'Completed homework assignment'
    }
    const result = grantXPSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})
```

### Integration Tests
Validation middleware is tested with real request objects:
```typescript
describe('validateRequest', () => {
  it('should validate request body successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'John', age: 25 })
    })
    const result = await validateRequest(request, { body: schema })
    expect(result.success).toBe(true)
  })
})
```

## Migration Guide

### Before (Manual Validation)
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { studentId, subjectId, amount, reason } = body
  
  // Manual validation
  if (!studentId || !subjectId || !amount || !reason) {
    throw new Error("Missing required fields")
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error("Amount must be positive")
  }
  // ... more validation
}
```

### After (Zod Validation)
```typescript
export const POST = withValidation(
  { body: grantXPSchema },
  async (data: { body: GrantXPRequest }, request: NextRequest, requestId: string) => {
    // data.body is fully typed and validated
    const { studentId, subjectId, amount, reason } = data.body
    // No manual validation needed
  }
)
```

## Benefits

1. **Type Safety**: Compile-time type checking prevents runtime errors
2. **Consistency**: Uniform validation across all endpoints
3. **Maintainability**: Co-located schemas make validation rules easy to find and update
4. **Developer Experience**: Clear error messages and TypeScript autocomplete
5. **Security**: Comprehensive input validation prevents injection and abuse
6. **Testing**: Easy to test validation logic in isolation
7. **Documentation**: Schemas serve as living API documentation

## Future Enhancements

- **OpenAPI Integration**: Generate API documentation from schemas
- **Client SDK Generation**: Generate typed client libraries
- **Validation Caching**: Cache validation results for performance
- **Custom Validators**: Domain-specific validation rules
- **Internationalization**: Localized error messages
