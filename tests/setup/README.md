# Test Setup Documentation

This directory contains centralized test setup files for the EduRPG project.

## Files

- `mocks.ts` - Centralized mock implementations for all services and dependencies
- `seed.ts` - Database seeding utilities for Playwright E2E tests
- `example.test.ts` - Example test demonstrating proper usage of centralized mocks

## Centralized Mocks (`mocks.ts`)

The centralized mocks system provides consistent mock implementations for:

### Authentication Mocks
- **NextAuth**: `mockGetServerSession()`, `mockGetServerSessionUnauthorized()`
- **RBAC**: `mockRequireStudent()`, `mockRequireTeacher()`, `mockRequireOperator()`
- **Session Data**: Pre-defined test users for student, teacher, and operator roles

### Service Mocks
- **Bakaláři Client**: Mock authentication and user data fetching
- **Prisma**: Mock database operations
- **Services**: Events, Jobs, XP, Shop, Items, Sync services
- **Utils**: Logging, request ID generation, etc.

### Usage

```typescript
import { 
  mockGetServerSession, 
  mockRequireStudent,
  createMockRequest,
  resetAllMocks 
} from '@/tests/setup/mocks'

describe('My Test', () => {
  beforeEach(() => {
    resetAllMocks() // Reset all mocks before each test
  })

  it('should work with student session', async () => {
    const mockSession = mockGetServerSession('student')
    // Use the mock in your test...
  })
})
```

### Available Mock Functions

#### Authentication
- `mockGetServerSession(role)` - Returns mock session for role (student/teacher/operator)
- `mockGetServerSessionUnauthorized()` - Returns null session
- `mockRequireStudent()` - Mock student requirement
- `mockRequireTeacher()` - Mock teacher requirement  
- `mockRequireOperator()` - Mock operator requirement

#### Utilities
- `createMockRequest(method, url, body?)` - Create mock NextRequest
- `resetAllMocks()` - Reset all mocks to clean state

#### Test Data
- `mockSessions` - Pre-defined session objects for each role
- `mockBakalariClient` - Mock Bakaláři client with test data

## Database Seeding (`seed.ts`)

The seed system provides test data for Playwright E2E tests:

### Test Users
- **Student**: `jan.novak@test.school.cz` / `testpassword123`
- **Teacher**: `petr.dvorak@test.school.cz` / `testpassword123`
- **Operator**: `admin@test.school.cz` / `testpassword123`

### Usage

```typescript
import { seedTestData, cleanupTestData, getTestUser } from '@/tests/setup/seed'

// In Playwright global setup
await seedTestData()

// In tests
const student = getTestUser(UserRole.STUDENT)
const credentials = getTestCredentials(student.id)
```

### Available Functions
- `seedTestData()` - Seeds database with test data
- `cleanupTestData()` - Removes all test data
- `getTestUser(role)` - Get test user by role
- `getTestUsers(role)` - Get all test users by role
- `getTestCredentials(userId)` - Get credentials for test user

## Integration with Test Runners

### Vitest
The centralized mocks are automatically set up in `vitest.setup.ts`:

```typescript
import { setupGlobalMocks } from './tests/setup/mocks'
setupGlobalMocks()
```

### Playwright
The seed system is integrated into `playwright.config.ts`:

```typescript
import { seedTestData, cleanupTestData } from './tests/setup/seed'

export default defineConfig({
  globalSetup: async () => {
    await seedTestData()
  },
  globalTeardown: async () => {
    await cleanupTestData()
  }
})
```

## Best Practices

1. **Always use `resetAllMocks()`** in `beforeEach()` to ensure clean state
2. **Use centralized mocks** instead of creating individual mocks in each test
3. **Import from centralized location** - use `@/tests/setup/mocks` not individual files
4. **Use test data consistently** - leverage the pre-defined test users and data
5. **Clean up after tests** - the system handles this automatically, but be aware of it

## Migration Guide

If you have existing tests with individual mocks:

1. Remove individual `vi.mock()` calls
2. Import from `@/tests/setup/mocks`
3. Use `resetAllMocks()` instead of `vi.clearAllMocks()`
4. Use centralized mock functions instead of creating your own

### Before
```typescript
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(mockSession)
}))
```

### After
```typescript
import { mockGetServerSession } from '@/tests/setup/mocks'
const mockSession = mockGetServerSession('student')
```
