# EduRPG API Contracts

This document defines the API contracts for all endpoints in the EduRPG application.

## Authentication

All endpoints (except `/api/health`) require authentication via NextAuth session.

### Session Structure
```typescript
interface Session {
  user: {
    id: string
    email: string
    name: string
    role: "STUDENT" | "TEACHER" | "OPERATOR"
    classId?: string // Only for students
    bakalariToken?: string // Only for operators
  }
}
```

## Endpoints

### Health Check

#### `GET /api/health`

**Description:** Health check endpoint for monitoring

**Authentication:** None required

**Response:**
```typescript
// Success (200)
{
  status: "healthy" | "unhealthy"
  timestamp: string // ISO 8601
  database: "connected" | "disconnected"
  userCount?: number // Only on success
  error?: string // Only on failure
  version: "1.0.0"
}
```

---

### Authentication

#### `GET/POST /api/auth/[...nextauth]`

**Description:** NextAuth.js authentication endpoints

**Authentication:** None required

**Request (POST):**
```typescript
{
  username: string
  password: string
}
```

**Response:**
```typescript
// Success (200)
{
  user: Session["user"]
  expires: string
}

// Error (401)
{
  error: "CredentialsSignin" | "Configuration" | "AccessDenied"
}
```

---

### Sync

#### `POST /api/sync/bakalari`

**Description:** Trigger Bakaláři data synchronization

**Authentication:** OPERATOR role required

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
// Success (200)
{
  success: true
  runId: string
  startedAt: string // ISO 8601
  completedAt: string // ISO 8601
  durationMs: number
  result: {
    classesCreated: number
    classesUpdated: number
    usersCreated: number
    usersUpdated: number
    subjectsCreated: number
    subjectsUpdated: number
    enrollmentsCreated: number
    enrollmentsUpdated: number
  }
  requestId: string
  timestamp: string // ISO 8601
}

// Error (400)
{
  code: "MISSING_TOKEN"
  message: string
  requestId: string
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}

// Error (500)
{
  success: false
  runId: string
  startedAt: string
  completedAt: string
  durationMs: number
  errors: string[]
  requestId: string
  timestamp: string
}
```

---

### Jobs

#### `GET /api/jobs`

**Description:** List jobs based on user role

**Authentication:** Required

**Query Parameters:**
- `status?: "OPEN" | "CLOSED"` (Teachers/Operators only)

**Response:**
```typescript
// Success (200)
{
  jobs: Array<{
    id: string
    title: string
    description: string
    subjectId: string
    subjectName: string
    xpReward: number
    moneyReward: number
    maxStudents: number
    status: "OPEN" | "CLOSED"
    createdAt: string
    updatedAt: string
    teacherId: string
    teacherName: string
    applications?: Array<{
      id: string
      studentId: string
      studentName: string
      status: "PENDING" | "APPROVED" | "REJECTED"
      appliedAt: string
    }> // Only for Teachers/Operators
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

#### `POST /api/jobs`

**Description:** Create a new job

**Authentication:** TEACHER role required

**Request:**
```typescript
{
  title: string // 1-100 chars
  description: string // 1-1000 chars
  subjectId: string // CUID
  xpReward: number // 1-10000
  moneyReward: number // 0-10000
  maxStudents?: number // 1-10, default 1
}
```

**Response:**
```typescript
// Success (201)
{
  job: {
    id: string
    title: string
    description: string
    subjectId: string
    xpReward: number
    moneyReward: number
    maxStudents: number
    status: "OPEN"
    createdAt: string
    updatedAt: string
    teacherId: string
  }
}

// Error (400)
{
  error: "Validation error"
  details: Array<{
    path: string[]
    message: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden - Only teachers can create jobs"
}
```

#### `POST /api/jobs/[id]/apply`

**Description:** Apply for a job

**Authentication:** STUDENT role required

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
// Success (201)
{
  application: {
    id: string
    jobId: string
    studentId: string
    status: "PENDING"
    appliedAt: string
  }
}

// Error (400)
{
  error: "Job not found" | "Already applied" | "Job is closed" | "Maximum students reached"
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden - Only students can apply for jobs"
}
```

#### `POST /api/jobs/[id]/review`

**Description:** Review a job application

**Authentication:** TEACHER role required (job owner)

**Request:**
```typescript
{
  applicationId: string
  status: "APPROVED" | "REJECTED"
  feedback?: string
}
```

**Response:**
```typescript
// Success (200)
{
  application: {
    id: string
    status: "APPROVED" | "REJECTED"
    feedback?: string
    reviewedAt: string
  }
}

// Error (400)
{
  error: "Application not found" | "Invalid status" | "Not authorized to review this application"
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

---

### XP System

#### `GET /api/xp/student`

**Description:** Get student's XP data

**Authentication:** STUDENT role required

**Response:**
```typescript
// Success (200)
{
  totalXP: number
  recentGrants: Array<{
    id: string
    amount: number
    reason: string
    subjectId: string
    subjectName: string
    grantedAt: string
    grantedBy: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

#### `POST /api/xp/grant`

**Description:** Grant XP to a student

**Authentication:** TEACHER or OPERATOR role required

**Request:**
```typescript
{
  studentId: string
  subjectId: string
  amount: number // 1-10000
  reason: string
}
```

**Response:**
```typescript
// Success (200)
{
  xpGrant: {
    id: string
    studentId: string
    subjectId: string
    amount: number
    reason: string
    grantedAt: string
    grantedBy: string
  }
  budgetRemaining: number // Only for teachers
}

// Error (400)
{
  error: "Missing required fields" | "Amount must be a positive number" | "Amount exceeds maximum allowed" | "Insufficient budget" | "Student not found"
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden - Only teachers can grant XP"
}
```

---

### Shop & Items

#### `GET /api/shop`

**Description:** Get shop items and user data

**Authentication:** Required

**Query Parameters:**
- `active?: boolean` - Filter active items only

**Response:**
```typescript
// Success (200) - Students
{
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    type: "COSMETIC" | "UTILITY"
    imageUrl?: string
    isActive: boolean
  }>
  userBalance: number
  userPurchases: Array<{
    id: string
    itemId: string
    itemName: string
    price: number
    purchasedAt: string
  }>
}

// Success (200) - Teachers/Operators
{
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    type: "COSMETIC" | "UTILITY"
    imageUrl?: string
    isActive: boolean
  }>
}

// Error (401)
{
  error: "Unauthorized"
}
```

#### `POST /api/shop`

**Description:** Purchase an item

**Authentication:** STUDENT role required

**Request:**
```typescript
{
  itemId: string // CUID
}
```

**Response:**
```typescript
// Success (201)
{
  purchase: {
    id: string
    itemId: string
    studentId: string
    price: number
    purchasedAt: string
  }
}

// Error (400)
{
  error: "Validation error" | "Insufficient funds" | "Item not found" | "Item not available"
  details?: Array<{
    path: string[]
    message: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

#### `GET /api/items`

**Description:** Get all items (admin view)

**Authentication:** None required

**Response:**
```typescript
// Success (200)
{
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    type: "COSMETIC" | "UTILITY"
    imageUrl?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
}
```

#### `POST /api/items`

**Description:** Create a new item

**Authentication:** OPERATOR role required

**Request:**
```typescript
{
  name: string // 1-100 chars
  description: string // 1-500 chars
  price: number // 1-10000
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
  type: "COSMETIC" | "UTILITY"
  imageUrl?: string // Valid URL
}
```

**Response:**
```typescript
// Success (201)
{
  item: {
    id: string
    name: string
    description: string
    price: number
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    type: "COSMETIC" | "UTILITY"
    imageUrl?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

// Error (400)
{
  error: "Validation error"
  details: Array<{
    path: string[]
    message: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

---

### Events

#### `GET /api/events`

**Description:** Get events

**Authentication:** Required

**Query Parameters:**
- `includeInactive?: boolean` - Include inactive events (OPERATOR only)

**Response:**
```typescript
// Success (200)
{
  events: Array<{
    id: string
    title: string
    description?: string
    startsAt: string // ISO 8601
    endsAt?: string // ISO 8601
    xpBonus?: number
    rarityReward?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

#### `POST /api/events`

**Description:** Create a new event

**Authentication:** OPERATOR role required

**Request:**
```typescript
{
  title: string // 1-100 chars
  description?: string // max 1000 chars
  startsAt: string // ISO 8601 datetime
  endsAt?: string // ISO 8601 datetime
  xpBonus?: number // 0-10000
  rarityReward?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
}
```

**Response:**
```typescript
// Success (201)
{
  event: {
    id: string
    title: string
    description?: string
    startsAt: string
    endsAt?: string
    xpBonus?: number
    rarityReward?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY"
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

// Error (400)
{
  error: "Validation error"
  details: Array<{
    path: string[]
    message: string
  }>
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

---

### Teacher Budget

#### `GET /api/teacher/budget/today`

**Description:** Get teacher's daily XP budget

**Authentication:** TEACHER role required

**Response:**
```typescript
// Success (200)
{
  budget: {
    totalBudget: number
    usedBudget: number
    remainingBudget: number
    resetAt: string // ISO 8601
  }
}

// Error (401/403)
{
  error: "Unauthorized" | "Forbidden"
}
```

---

### Policy

#### `GET /api/policy/check`

**Description:** Check if user has acknowledged policy

**Authentication:** Required

**Response:**
```typescript
// Success (200)
{
  acknowledged: boolean
  acknowledgedAt?: string // ISO 8601
  version: string
}

// Error (401)
{
  error: "Unauthorized"
}
```

---

## Error Responses

All endpoints may return these common error responses:

### 401 Unauthorized
```typescript
{
  error: "Unauthorized"
}
```

### 403 Forbidden
```typescript
{
  error: "Forbidden" | "Forbidden - [specific reason]"
}
```

### 500 Internal Server Error
```typescript
{
  error: "Internal server error"
}
```

## Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:
- Login attempts: 5 per minute per IP
- Other endpoints: No specific limits (handled by NextAuth)

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
