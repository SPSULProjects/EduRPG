# RBAC (Role-Based Access Control) Implementation

This directory contains the complete RBAC implementation for the EduRPG application, implementing T03 requirements.

## Overview

The RBAC system provides:
- **Route policies** with regex patterns and required roles
- **Middleware enforcement** for all API routes
- **Server guards** for protecting server actions
- **Comprehensive logging** of access denials (without PII)
- **Unit tests** for all functionality

## Files

- `policies.ts` - Route policies and access control logic
- `guards.ts` - Server guard utilities for protecting actions
- `examples.ts` - Usage examples and patterns
- `__tests__/policies.test.ts` - Unit tests for policies
- `__tests__/guards.test.ts` - Unit tests for guards

## Route Policies

### Policy Structure

```typescript
interface RoutePolicy {
  pattern: RegExp        // Route pattern to match
  roles: UserRole[]      // Required roles for access
  description: string    // Human-readable description
}
```

### Defined Policies

| Route Pattern | Required Roles | Description |
|---------------|----------------|-------------|
| `/admin(\/.*)?` | `OPERATOR` | Admin panel access |
| `/api/sync/bakalari(\/.*)?` | `OPERATOR` | Bakalari sync operations |
| `/api/items(\/.*)?` | `OPERATOR` | Item management operations |
| `/api/achievements(\/.*)?` | `OPERATOR` | Achievement management |
| `/api/events(\/.*)?` | `OPERATOR` | Event management |
| `/api/xp/grant` | `TEACHER`, `OPERATOR` | XP granting operations |
| `/api/teacher/budget(\/.*)?` | `TEACHER`, `OPERATOR` | Teacher budget operations |
| `/api/jobs/\d+/review` | `TEACHER`, `OPERATOR` | Job review operations |
| `/api/jobs/\d+/close` | `TEACHER`, `OPERATOR` | Job close operations |
| `/api/health` | `STUDENT`, `TEACHER`, `OPERATOR` | Health check endpoint |
| `/api/shop(\/.*)?` | `STUDENT`, `TEACHER`, `OPERATOR` | Shop operations |
| `/api/jobs/\d+/apply` | `STUDENT`, `TEACHER`, `OPERATOR` | Job application operations |
| `/api/jobs(\/.*)?` | `STUDENT`, `TEACHER`, `OPERATOR` | Job listing operations |
| `/api/classes/\d+/jobs` | `STUDENT`, `TEACHER`, `OPERATOR` | Class jobs operations |
| `/api/events/\d+/participate` | `STUDENT`, `TEACHER`, `OPERATOR` | Event participation |

## Middleware Integration

The middleware (`middleware.ts`) automatically enforces route policies:

1. **Extracts JWT token** from request
2. **Checks route access** using policies
3. **Logs denials** with `rbac_deny` event (no PII)
4. **Returns 403** for unauthorized access

### Public Routes

The following routes bypass RBAC checks:
- `/api/auth/*` - Authentication endpoints
- `/auth/*` - Auth pages
- `/favicon.ico` - Static assets

## Server Guards

### Basic Guards

```typescript
import { requireAuth, requireRole, requireOperator, requireTeacher } from './guards'

// Require any authenticated user
const user = await requireAuth()

// Require specific roles
const user = await requireRole([UserRole.TEACHER, UserRole.OPERATOR])

// Convenience functions
const operator = await requireOperator()
const teacher = await requireTeacher()
```

### Higher-Order Guards

```typescript
import { withRoleGuard, withResourceGuard } from './guards'

// Wrap function with role requirement
export const createAchievement = withRoleGuard(
  [UserRole.OPERATOR],
  async (user, achievementData) => {
    // Only operators can execute this
    return createAchievement(achievementData)
  }
)

// Wrap function with resource access check
export const grantXP = withResourceGuard(
  'xp',
  async (user, studentId, amount) => {
    // Only users with XP access can execute this
    return grantXPToStudent(studentId, amount)
  }
)
```

### API Route Guards

```typescript
import { guardApiRoute } from './guards'

export async function POST(request: NextRequest) {
  const guardResult = await guardApiRoute('/api/sync/bakalari')
  if (guardResult.error) {
    return NextResponse.json(guardResult.body, { status: guardResult.status })
  }
  
  const { user } = guardResult
  // Proceed with authorized user
}
```

## Resource Access

Check access to specific resource types:

```typescript
import { hasResourceAccess } from './policies'

const canAccessXP = hasResourceAccess(userRole, 'xp')
const canAccessAdmin = hasResourceAccess(userRole, 'admin')
```

### Available Resources

| Resource | Student | Teacher | Operator |
|----------|---------|---------|----------|
| `admin` | ❌ | ❌ | ✅ |
| `sync` | ❌ | ❌ | ✅ |
| `items` | ❌ | ❌ | ✅ |
| `achievements` | ❌ | ❌ | ✅ |
| `events` | ❌ | ❌ | ✅ |
| `xp` | ❌ | ✅ | ✅ |
| `budget` | ❌ | ✅ | ✅ |
| `jobs` | ✅ | ✅ | ✅ |
| `shop` | ✅ | ✅ | ✅ |
| `health` | ✅ | ✅ | ✅ |

## Logging

All access denials are logged with the `rbac_deny` event:

```typescript
{
  level: 'WARN',
  message: 'rbac_deny',
  metadata: {
    path: '/api/sync/bakalari',
    method: 'POST',
    userRole: 'TEACHER',
    requiredRoles: ['OPERATOR'],
    reason: 'Insufficient permissions'
  }
}
```

**No PII is logged** - only role information and request details.

## Testing

Run the unit tests:

```bash
npm test app/lib/auth/__tests__/policies.test.ts
npm test app/lib/auth/__tests__/guards.test.ts
```

### Test Coverage

- ✅ Route access control
- ✅ Role hierarchy validation
- ✅ Resource access checks
- ✅ Policy structure validation
- ✅ Guard utility functions
- ✅ User management permissions
- ✅ Class viewing permissions

## Usage Examples

See `examples.ts` for comprehensive usage examples including:

1. Basic role requirements
2. Higher-order function guards
3. API route protection
4. Server action protection
5. Conditional access based on roles
6. Page component protection

## Migration Guide

### Updating Existing API Routes

**Before:**
```typescript
const session = await getServerSession(authOptions)
if (!session || session.user.role !== UserRole.OPERATOR) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**After:**
```typescript
const guardResult = await guardApiRoute('/api/sync/bakalari')
if (guardResult.error) {
  return NextResponse.json(guardResult.body, { status: guardResult.status })
}
const { user } = guardResult
```

### Updating Server Actions

**Before:**
```typescript
const user = await requireRole([UserRole.OPERATOR])
```

**After:**
```typescript
const user = await requireOperator() // Convenience function
```

## Security Considerations

1. **Default Deny**: Routes without policies are denied by default
2. **No PII Logging**: Access denials don't log personal information
3. **Role Hierarchy**: Higher roles inherit permissions from lower roles
4. **JWT Validation**: All requests validate JWT tokens
5. **Request ID Tracking**: All requests include unique request IDs

## Future Enhancements

- [ ] Teacher-class relationship mapping
- [ ] Dynamic policy loading from database
- [ ] Policy inheritance and composition
- [ ] Audit trail for policy changes
- [ ] Policy testing framework
