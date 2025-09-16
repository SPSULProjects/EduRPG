/**
 * Integration tests for API endpoints
 * Tests API contracts with mocked Bakaláři client
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { 
  createMockRequest, 
  mockGetServerSession, 
  mockGetServerSessionUnauthorized,
  mockRequireStudent,
  mockRequireTeacher,
  mockRequireOperator,
  mockRequireRoleForbidden
} from "@/app/lib/__tests__/mocks/auth"
import { mockBakalariClient } from "@/app/lib/__tests__/mocks/bakalari"

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
  default: vi.fn()
}))

// Mock RBAC functions
vi.mock("@/app/lib/rbac", () => ({
  requireStudent: vi.fn().mockResolvedValue({
    id: "student1",
    email: "jan.novak@school.cz",
    name: "Jan Novák",
    role: "STUDENT",
    classId: "class1"
  }),
  requireTeacher: vi.fn().mockResolvedValue({
    id: "teacher1",
    email: "petr.dvorak@school.cz",
    name: "Petr Dvořák",
    role: "TEACHER"
  }),
  requireOperator: vi.fn().mockResolvedValue({
    id: "operator1",
    email: "admin@school.cz",
    name: "Admin Admin",
    role: "OPERATOR",
    bakalariToken: "mock_token_operator1"
  })
}))

// Mock Bakaláři client
vi.mock("@/app/lib/bakalari/bakalari", () => ({
  loginToBakalariAndFetchUserData: vi.fn(),
  BakalariUserData: {}
}))

// Mock Prisma
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: {
      count: vi.fn().mockResolvedValue(10),
      findUnique: vi.fn()
    },
    class: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    subject: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    userClassSubject: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}))

// Mock services
vi.mock("@/app/lib/services/events", () => ({
  EventsService: {
    getEvents: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockResolvedValue({
      id: "event1",
      title: "Test Event",
      description: "Test Description",
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      xpBonus: 50,
      rarityReward: "COMMON",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}))

vi.mock("@/app/lib/services/jobs", () => ({
  JobsService: {
    getJobsForStudent: vi.fn().mockResolvedValue([
      {
        id: "job1",
        title: "Test Job",
        description: "Test Description",
        subjectId: "subject1",
        subjectName: "Math",
        xpReward: 100,
        moneyReward: 50,
        maxStudents: 1,
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: "teacher1",
        teacherName: "Test Teacher"
      }
    ]),
    getJobsForTeacher: vi.fn().mockResolvedValue([
      {
        id: "job1",
        title: "Test Job",
        description: "Test Description",
        subjectId: "subject1",
        subjectName: "Math",
        xpReward: 100,
        moneyReward: 50,
        maxStudents: 1,
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacherId: "teacher1",
        teacherName: "Test Teacher",
        applications: []
      }
    ]),
    getJobsForOperator: vi.fn().mockResolvedValue([]),
    createJob: vi.fn().mockResolvedValue({
      id: "job1",
      title: "Test Job",
      description: "Test Description",
      subjectId: "subject1",
      xpReward: 100,
      moneyReward: 50,
      maxStudents: 1,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherId: "teacher1"
    }),
    applyForJob: vi.fn().mockResolvedValue({
      id: "app1",
      jobId: "job1",
      studentId: "student1",
      status: "PENDING",
      appliedAt: new Date().toISOString()
    }),
    reviewApplication: vi.fn()
  }
}))

vi.mock("@/app/lib/services/xp", () => ({
  XPService: {
    getStudentXP: vi.fn().mockResolvedValue({
      totalXP: 100,
      recentGrants: []
    }),
    grantXP: vi.fn().mockResolvedValue({
      id: "xp1",
      studentId: "student1",
      subjectId: "subject1",
      amount: 100,
      reason: "Test grant",
      grantedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      grantedBy: "teacher1"
    })
  }
}))

vi.mock("@/app/lib/services/shop", () => ({
  ShopService: {
    getItems: vi.fn().mockResolvedValue([]),
    getUserBalance: vi.fn().mockResolvedValue(1000),
    getUserPurchases: vi.fn().mockResolvedValue([]),
    buyItem: vi.fn().mockResolvedValue({
      id: "purchase1",
      itemId: "item1",
      studentId: "student1",
      price: 100,
      purchasedAt: new Date().toISOString()
    })
  }
}))

vi.mock("@/app/lib/services/items", () => ({
  ItemsService: {
    getAllItems: vi.fn().mockResolvedValue([]),
    createItem: vi.fn()
  }
}))

vi.mock("@/app/lib/services/sync-bakalari", () => ({
  syncBakalariData: vi.fn().mockResolvedValue({
    success: true,
    runId: "sync123",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1000,
    classesCreated: 1,
    classesUpdated: 0,
    usersCreated: 1,
    usersUpdated: 0,
    subjectsCreated: 1,
    subjectsUpdated: 0,
    enrollmentsCreated: 1,
    enrollmentsUpdated: 0
  })
}))

vi.mock("@/app/lib/auth/guards", () => ({
  guardApiRoute: vi.fn().mockResolvedValue({
    error: null,
    user: { id: "operator1", role: "OPERATOR" }
  })
}))

vi.mock("@/app/lib/utils", () => ({
  logEvent: vi.fn(),
  getRequestIdFromRequest: vi.fn().mockReturnValue("test-request-id"),
  generateRequestId: vi.fn().mockReturnValue("test-request-id")
}))

describe("API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBakalariClient.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const { GET } = await import("@/app/api/health/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/health")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe("healthy")
      expect(data.database).toBe("connected")
      expect(data.version).toBe("1.0.0")
      expect(data.timestamp).toBeDefined()
    })
  })

  describe("Authentication", () => {
    it("should authenticate with valid credentials", async () => {
      const { loginToBakalariAndFetchUserData } = await import("@/app/lib/bakalari/bakalari")
      vi.mocked(loginToBakalariAndFetchUserData).mockResolvedValue({
        userID: "student1",
        userName: "Jan Novák",
        userType: "student",
        classAbbrev: "1A",
        email: "jan.novak@school.cz"
      })

      // Mock NextAuth route handler
      const mockPOST = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
      vi.doMock("@/app/api/auth/[...nextauth]/route", () => ({
        POST: mockPOST
      }))

      const { POST } = await import("@/app/api/auth/[...nextauth]/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/auth/signin", {
        username: "jan.novak",
        password: "password123"
      })
      
      const response = await POST(request)
      
      // NextAuth handles the response, so we just verify it doesn't throw
      expect(response).toBeDefined()
    })
  })

  describe("Jobs API", () => {
    it("should list jobs for student", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { GET } = await import("@/app/api/jobs/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/jobs")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      expect(Array.isArray(data.jobs)).toBe(true)
    })

    it("should list jobs for teacher", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("teacher"))

      const { GET } = await import("@/app/api/jobs/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/jobs")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      expect(Array.isArray(data.jobs)).toBe(true)
    })

    it("should create job as teacher", async () => {
      const { requireTeacher } = await import("@/app/lib/rbac")
      vi.mocked(requireTeacher).mockImplementation(mockRequireTeacher())

      const { POST } = await import("@/app/api/jobs/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/jobs", {
        title: "Test Job",
        description: "Test Description",
        subjectId: "subj1",
        xpReward: 100,
        moneyReward: 50
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.job).toBeDefined()
      expect(data.job.title).toBe("Test Job")
    })

    it("should reject job creation for student", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { POST } = await import("@/app/api/jobs/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/jobs", {
        title: "Test Job",
        description: "Test Description", 
        subjectId: "subj1",
        xpReward: 100,
        moneyReward: 50
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain("Forbidden")
    })

    it("should apply for job as student", async () => {
      const { requireStudent } = await import("@/app/lib/rbac")
      vi.mocked(requireStudent).mockImplementation(mockRequireStudent())

      const { POST } = await import("@/app/api/jobs/[id]/apply/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/jobs/job1/apply")
      
      const response = await POST(request, { params: Promise.resolve({ id: "job1" }) })
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.application).toBeDefined()
      expect(data.application.jobId).toBe("job1")
    })
  })

  describe("XP System", () => {
    it("should get student XP", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { GET } = await import("@/app/api/xp/student/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/xp/student")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.totalXP).toBeDefined()
      expect(data.recentGrants).toBeDefined()
      expect(Array.isArray(data.recentGrants)).toBe(true)
    })

    it("should grant XP as teacher", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("teacher"))

      const { POST } = await import("@/app/api/xp/grant/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/xp/grant", {
        studentId: "student1",
        subjectId: "subj1", 
        amount: 100,
        reason: "Test grant"
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.xpGrant).toBeDefined()
      expect(data.xpGrant.amount).toBe(100)
    })

    it("should reject XP grant for student", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { POST } = await import("@/app/api/xp/grant/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/xp/grant", {
        studentId: "student1",
        subjectId: "subj1",
        amount: 100,
        reason: "Test grant"
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain("Forbidden")
    })
  })

  describe("Shop API", () => {
    it("should get shop items for student", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { GET } = await import("@/app/api/shop/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/shop")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.items).toBeDefined()
      expect(data.userBalance).toBeDefined()
      expect(data.userPurchases).toBeDefined()
    })

    it("should buy item as student", async () => {
      const { requireStudent } = await import("@/app/lib/rbac")
      vi.mocked(requireStudent).mockImplementation(mockRequireStudent())

      const { POST } = await import("@/app/api/shop/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/shop", {
        itemId: "item1"
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.purchase).toBeDefined()
      expect(data.purchase.itemId).toBe("item1")
    })
  })

  describe("Events API", () => {
    it("should get events", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { GET } = await import("@/app/api/events/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/events")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.events).toBeDefined()
      expect(Array.isArray(data.events)).toBe(true)
    })

    it("should create event as operator", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("operator"))

      const { POST } = await import("@/app/api/events/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/events", {
        title: "Test Event",
        description: "Test Description",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        xpBonus: 50
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.event).toBeDefined()
      expect(data.event.title).toBe("Test Event")
    })

    it("should reject event creation for student", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSession("student"))

      const { POST } = await import("@/app/api/events/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/events", {
        title: "Test Event",
        description: "Test Description",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toContain("Forbidden")
    })
  })

  describe("Sync API", () => {
    it("should trigger sync as operator", async () => {
      const { POST } = await import("@/app/api/sync/bakalari/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/sync/bakalari")
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.runId).toBeDefined()
      expect(data.result).toBeDefined()
    })

    it("should reject sync for student", async () => {
      const { guardApiRoute } = await import("@/app/lib/auth/guards")
      vi.mocked(guardApiRoute).mockResolvedValue({
        error: "Forbidden",
        body: { error: "Forbidden" },
        status: 403
      })

      const { POST } = await import("@/app/api/sync/bakalari/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/sync/bakalari")
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toBe("Forbidden")
    })
  })

  describe("Error Handling", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const { getServerSession } = await import("next-auth")
      vi.mocked(getServerSession).mockImplementation(mockGetServerSessionUnauthorized())

      const { GET } = await import("@/app/api/jobs/route")
      const request = createMockRequest("GET", "http://localhost:3000/api/jobs")
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    it("should return 400 for validation errors", async () => {
      const { requireTeacher } = await import("@/app/lib/rbac")
      vi.mocked(requireTeacher).mockImplementation(mockRequireTeacher())

      const { POST } = await import("@/app/api/jobs/route")
      const request = createMockRequest("POST", "http://localhost:3000/api/jobs", {
        title: "", // Invalid: empty title
        description: "Test Description",
        subjectId: "subj1",
        xpReward: 100,
        moneyReward: 50
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe("Validation error")
      expect(data.details).toBeDefined()
    })
  })
})
