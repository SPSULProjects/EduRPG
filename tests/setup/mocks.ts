/**
 * Centralized mocks for integration tests
 * Provides consistent mock implementations for auth, services, and external dependencies
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@/app/lib/generated'

// Mock CUID generation for consistent test data
let cuidCounter = 0
export const generateMockCuid = () => `cuid_${++cuidCounter}_${Date.now()}`

// ============================================================================
// AUTHENTICATION MOCKS
// ============================================================================

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    classId?: string
    bakalariToken?: string
  }
  expires: string
}

export const mockSessions: Record<string, MockSession> = {
  student: {
    user: {
      id: "cuid_student_001",
      email: "jan.novak@school.cz",
      name: "Jan Novák",
      role: UserRole.STUDENT,
      classId: "cuid_class_001"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  teacher: {
    user: {
      id: "cuid_teacher_001",
      email: "petr.dvorak@school.cz", 
      name: "Petr Dvořák",
      role: UserRole.TEACHER
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  operator: {
    user: {
      id: "cuid_operator_001",
      email: "admin@school.cz",
      name: "Admin Admin", 
      role: UserRole.OPERATOR,
      bakalariToken: "mock_token_operator1"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// NextAuth mock functions
export const mockGetServerSession = (role: keyof typeof mockSessions) => {
  return vi.fn().mockResolvedValue(mockSessions[role])
}

export const mockGetServerSessionUnauthorized = () => {
  return vi.fn().mockResolvedValue(null)
}

// RBAC mock functions
export const mockRequireStudent = () => {
  return vi.fn().mockResolvedValue(mockSessions.student?.user)
}

export const mockRequireTeacher = () => {
  return vi.fn().mockResolvedValue(mockSessions.teacher?.user)
}

export const mockRequireOperator = () => {
  return vi.fn().mockResolvedValue(mockSessions.operator?.user)
}

export const mockRequireRoleForbidden = () => {
  return vi.fn().mockRejectedValue(new Error("Forbidden"))
}

// ============================================================================
// BAKALÁŘI CLIENT MOCKS
// ============================================================================

export interface MockBakalariUserData {
  userID: string
  userName: string
  userType: "student" | "teacher" | "operator"
  classAbbrev?: string
  email?: string
}

export interface MockBakalariClassData {
  id: string
  name: string
  grade: number
}

export interface MockBakalariSubjectData {
  id: string
  name: string
  abbreviation: string
}

export class MockBakalariClient {
  private users: MockBakalariUserData[] = []
  private classes: MockBakalariClassData[] = []
  private subjects: MockBakalariSubjectData[] = []
  private enrollments: Array<{ userId: string; classId: string; subjectId: string }> = []

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    // Mock users
    this.users = [
      {
        userID: "cuid_student_001",
        userName: "Jan Novák",
        userType: "student",
        classAbbrev: "1A",
        email: "jan.novak@school.cz"
      },
      {
        userID: "cuid_student_002", 
        userName: "Marie Svobodová",
        userType: "student",
        classAbbrev: "1A",
        email: "marie.svobodova@school.cz"
      },
      {
        userID: "cuid_teacher_001",
        userName: "Petr Dvořák",
        userType: "teacher",
        email: "petr.dvorak@school.cz"
      },
      {
        userID: "cuid_operator_001",
        userName: "Admin Admin",
        userType: "operator",
        email: "admin@school.cz"
      }
    ]

    // Mock classes
    this.classes = [
      { id: "cuid_class_001", name: "1A", grade: 1 },
      { id: "cuid_class_002", name: "2B", grade: 2 }
    ]

    // Mock subjects
    this.subjects = [
      { id: "cuid_subject_001", name: "Matematika", abbreviation: "MAT" },
      { id: "cuid_subject_002", name: "Český jazyk", abbreviation: "CJ" },
      { id: "cuid_subject_003", name: "Anglický jazyk", abbreviation: "AJ" }
    ]

    // Mock enrollments
    this.enrollments = [
      { userId: "cuid_student_001", classId: "cuid_class_001", subjectId: "cuid_subject_001" },
      { userId: "cuid_student_001", classId: "cuid_class_001", subjectId: "cuid_subject_002" },
      { userId: "cuid_student_002", classId: "cuid_class_001", subjectId: "cuid_subject_001" },
      { userId: "cuid_student_002", classId: "cuid_class_001", subjectId: "cuid_subject_003" }
    ]
  }

  async authenticate(username: string, password: string): Promise<{ token: string; user: MockBakalariUserData }> {
    // Mock authentication - accept any credentials for testing
    const user = this.users.find(u => 
      u.userName.toLowerCase().includes(username.toLowerCase()) ||
      u.email?.toLowerCase().includes(username.toLowerCase())
    )

    if (!user) {
      throw new Error("Invalid credentials")
    }

    return {
      token: `mock_token_${user.userID}`,
      user
    }
  }

  async getUserData(token: string): Promise<MockBakalariUserData> {
    const userId = token.replace("mock_token_", "")
    const user = this.users.find(u => u.userID === userId)
    
    if (!user) {
      throw new Error("Invalid token")
    }

    return user
  }

  async getClasses(token: string): Promise<MockBakalariClassData[]> {
    this.validateToken(token)
    return [...this.classes]
  }

  async getSubjects(token: string): Promise<MockBakalariSubjectData[]> {
    this.validateToken(token)
    return [...this.subjects]
  }

  async getEnrollments(token: string): Promise<Array<{ userId: string; classId: string; subjectId: string }>> {
    this.validateToken(token)
    return [...this.enrollments]
  }

  private validateToken(token: string): void {
    if (!token.startsWith("mock_token_")) {
      throw new Error("Invalid token")
    }
  }

  // Test utilities
  addUser(user: MockBakalariUserData) {
    this.users.push(user)
  }

  addClass(cls: MockBakalariClassData) {
    this.classes.push(cls)
  }

  addSubject(subject: MockBakalariSubjectData) {
    this.subjects.push(subject)
  }

  clearData() {
    this.users = []
    this.classes = []
    this.subjects = []
    this.enrollments = []
  }

  reset() {
    this.clearData()
    this.seedMockData()
  }
}

// Global mock instance
export const mockBakalariClient = new MockBakalariClient()

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn().mockResolvedValue(10),
  },
  class: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  subject: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  userClassSubject: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  job: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  jobAssignment: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  purchase: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
  achievement: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  achievementAward: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  moneyTx: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventParticipation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
  xPAudit: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
  $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
}

// ============================================================================
// SERVICE MOCKS
// ============================================================================

export const mockEventsService = {
  getEvents: vi.fn().mockResolvedValue([]),
  getEvent: vi.fn().mockResolvedValue({
    id: "event-1",
    title: "Test Event",
    description: "Test Description",
    startsAt: new Date('2024-01-01T10:00:00Z'),
    endsAt: new Date('2024-01-01T12:00:00Z'),
    xpBonus: 100,
    rarityReward: "RARE",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  createEvent: vi.fn().mockResolvedValue({
    id: "event-1",
    title: "Test Event",
    description: "Test Description",
    startsAt: new Date('2024-01-01T10:00:00Z'),
    endsAt: new Date('2024-01-01T12:00:00Z'),
    xpBonus: 100,
    rarityReward: "RARE",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  participateInEvent: vi.fn().mockResolvedValue({
    id: "participation-1",
    eventId: "event-1",
    userId: "student-1",
    requestId: "req-1",
    createdAt: new Date()
  }),
  getUserParticipations: vi.fn().mockResolvedValue([])
}

export const mockJobsService = {
  getJobsForStudent: vi.fn().mockResolvedValue([
    {
      id: "cuid_job_001",
      title: "Test Job",
      description: "Test Description",
      subjectId: "cuid_subject_001",
      subjectName: "Math",
      xpReward: 100,
      moneyReward: 50,
      maxStudents: 1,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherId: "cuid_teacher_001",
      teacherName: "Test Teacher"
    }
  ]),
  getJobsForTeacher: vi.fn().mockResolvedValue([
    {
      id: "cuid_job_001",
      title: "Test Job",
      description: "Test Description",
      subjectId: "cuid_subject_001",
      subjectName: "Math",
      xpReward: 100,
      moneyReward: 50,
      maxStudents: 1,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherId: "cuid_teacher_001",
      teacherName: "Test Teacher",
      applications: []
    }
  ]),
  getJobsForOperator: vi.fn().mockResolvedValue([]),
  createJob: vi.fn().mockResolvedValue({
    id: "cuid_job_001",
    title: "Test Job",
    description: "Test Description",
    subjectId: "cuid_subject_001",
    xpReward: 100,
    moneyReward: 50,
    maxStudents: 1,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    teacherId: "cuid_teacher_001"
  }),
  applyForJob: vi.fn().mockResolvedValue({
    id: "cuid_application_001",
    jobId: "cuid_job_001",
    studentId: "cuid_student_001",
    status: "PENDING",
    appliedAt: new Date().toISOString()
  }),
  closeJob: vi.fn().mockResolvedValue({
    job: {
      id: "cuid_job_001",
      status: "CLOSED",
      closedAt: new Date()
    },
    payouts: [],
    remainder: { xp: 0, money: 0 }
  }),
  reviewApplication: vi.fn()
}

export const mockXPService = {
  getStudentXP: vi.fn().mockResolvedValue({
    totalXP: 100,
    recentGrants: []
  }),
  grantXP: vi.fn().mockResolvedValue({
    id: "cuid_xp_001",
    studentId: "cuid_student_001",
    subjectId: "cuid_subject_001",
    amount: 100,
    reason: "Test grant",
    grantedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    grantedBy: "cuid_teacher_001"
  })
}

export const mockShopService = {
  getItems: vi.fn().mockResolvedValue([]),
  getItemById: vi.fn().mockResolvedValue({
    id: "cuid_item_001",
    name: "Test Item",
    description: "Test Description",
    price: 100,
    rarity: "COMMON",
    type: "CONSUMABLE",
    isActive: true
  }),
  createItem: vi.fn().mockResolvedValue({
    id: "cuid_item_001",
    name: "Test Item",
    description: "Test Description",
    price: 100,
    rarity: "COMMON",
    type: "CONSUMABLE",
    isActive: true
  }),
  toggleItem: vi.fn().mockResolvedValue({
    id: "cuid_item_001",
    name: "Test Item",
    isActive: false
  }),
  getShopStats: vi.fn().mockResolvedValue({
    totalItems: 10,
    activeItems: 8,
    totalPurchases: 25
  }),
  getUserBalance: vi.fn().mockResolvedValue(1000),
  getUserPurchases: vi.fn().mockResolvedValue([]),
  buyItem: vi.fn().mockResolvedValue({
    id: "cuid_purchase_001",
    itemId: "cuid_item_001",
    studentId: "cuid_student_001",
    price: 100,
    purchasedAt: new Date().toISOString()
  })
}

export const mockItemsService = {
  getAllItems: vi.fn().mockResolvedValue([]),
  createItem: vi.fn()
}

export const mockSyncService = {
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
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createMockRequest(
  method: string = "GET",
  url: string = "http://localhost:3000/api/test",
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  // Create a new RequestInit object without null signal for NextRequest compatibility
  const nextRequestInit: any = { ...requestInit }
  if (nextRequestInit.signal === null) {
    delete nextRequestInit.signal
  }
  
  return new NextRequest(url, nextRequestInit)
}

export const mockUtils = {
  logEvent: vi.fn(),
  getRequestIdFromRequest: vi.fn().mockReturnValue("test-request-id"),
  generateRequestId: vi.fn().mockReturnValue("test-request-id"),
  sanitizeForLog: vi.fn((msg: string) => msg),
}

export const mockGuards = {
  guardApiRoute: vi.fn().mockResolvedValue({
    error: null,
    user: { id: "cuid_operator_001", role: "OPERATOR" }
  }),
  canManageUser: vi.fn(),
  canViewClass: vi.fn()
}

// ============================================================================
// NEXT.JS MOCKS
// ============================================================================

export const mockNextNavigation = {
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: vi.fn(),
}

export const mockNextAuthReact = {
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}

// ============================================================================
// GLOBAL MOCKS SETUP
// ============================================================================

export function setupGlobalMocks() {
  // Mock Next.js router
  vi.mock('next/navigation', () => mockNextNavigation)

  // Mock NextAuth
  vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
    default: vi.fn()
  }))

  // Mock NextAuth React
  vi.mock('next-auth/react', () => mockNextAuthReact)

  // Mock RBAC functions
  vi.mock('@/app/lib/rbac', () => ({
    requireStudent: mockRequireStudent(),
    requireTeacher: mockRequireTeacher(),
    requireOperator: mockRequireOperator(),
    requireRole: vi.fn().mockImplementation((roles) => {
      if (roles.includes('OPERATOR')) return mockRequireOperator()()
      if (roles.includes('TEACHER')) return mockRequireTeacher()()
      if (roles.includes('STUDENT')) return mockRequireStudent()()
      return mockRequireRoleForbidden()()
    }),
    requireAuth: vi.fn().mockResolvedValue(mockSessions.student?.user),
    getCurrentUser: vi.fn().mockResolvedValue(mockSessions.student?.user),
    canAccessResource: vi.fn().mockImplementation((userRole: string, resourceRole: string) => {
      const roleHierarchy: Record<string, number> = { 'OPERATOR': 3, 'TEACHER': 2, 'STUDENT': 1 }
      return (roleHierarchy[userRole] || 0) >= (roleHierarchy[resourceRole] || 0)
    }),
    canManageUser: vi.fn().mockImplementation((currentUserRole, targetUserRole) => {
      const roleHierarchy: Record<string, number> = { 'OPERATOR': 3, 'TEACHER': 2, 'STUDENT': 1 }
      return (roleHierarchy[currentUserRole] || 0) >= (roleHierarchy[targetUserRole] || 0)
    }),
    canViewClass: vi.fn().mockImplementation((currentUserRole, currentUserClassId, targetClassId) => {
      if (currentUserRole === 'OPERATOR') return true
      if (currentUserRole === 'TEACHER') return true
      if (currentUserRole === 'STUDENT') return currentUserClassId === targetClassId
      return false
    })
  }))

  // Mock Auth Guard functions
  vi.mock('@/app/lib/auth/guards', () => ({
    requireStudent: mockRequireStudent(),
    requireTeacher: mockRequireTeacher(),
    requireOperator: mockRequireOperator(),
    requireRole: vi.fn().mockImplementation((roles) => {
      if (roles.includes('OPERATOR')) return mockRequireOperator()()
      if (roles.includes('TEACHER')) return mockRequireTeacher()()
      if (roles.includes('STUDENT')) return mockRequireStudent()()
      return mockRequireRoleForbidden()()
    }),
    requireAuth: vi.fn().mockResolvedValue(mockSessions.student?.user),
    guardRoute: vi.fn().mockResolvedValue(mockSessions.student?.user),
    guardApiRoute: vi.fn().mockResolvedValue({ error: null, user: mockSessions.student?.user }),
    canManageUser: vi.fn().mockImplementation((currentUserRole, targetUserRole) => {
      const roleHierarchy: Record<string, number> = { 'OPERATOR': 3, 'TEACHER': 2, 'STUDENT': 1 }
      return (roleHierarchy[currentUserRole] || 0) >= (roleHierarchy[targetUserRole] || 0)
    }),
    canViewClass: vi.fn().mockImplementation((currentUserRole, currentUserClassId, targetClassId) => {
      if (currentUserRole === 'OPERATOR') return true
      if (currentUserRole === 'TEACHER') return true
      if (currentUserRole === 'STUDENT') return currentUserClassId === targetClassId
      return false
    })
  }))

  // Mock Bakaláři client
  vi.mock('@/app/lib/bakalari', () => ({
    loginToBakalariAndFetchUserData: vi.fn(),
    BakalariUserData: {},
    BakalariLoginResponse: {},
    BakalariLoginStatus: {},
    BakalariLoginReturn: {}
  }))

  // Mock Prisma
  vi.mock('@/app/lib/prisma', () => ({
    prisma: mockPrisma
  }))

  // Note: Service mocks are removed to allow actual service implementations to be used
  // Individual tests can mock specific services as needed using vi.mock() locally

  vi.mock('@/app/lib/services/sync-bakalari', () => ({
    syncBakalariData: mockSyncService.syncBakalariData
  }))

  // Note: auth guards are not mocked globally to allow direct testing of utility functions

  // Mock utils - but allow logEvent to work when needed
  vi.mock('@/app/lib/utils', () => ({
    ...mockUtils,
    logEvent: vi.fn().mockImplementation(async (level, message, options) => {
      // For tests that need actual logEvent functionality, we'll allow it through
      // Individual tests can override this mock as needed
      return Promise.resolve()
    })
  }))

  // Global test setup
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// ============================================================================
// RESET FUNCTIONS
// ============================================================================

export function resetAllMocks() {
  vi.clearAllMocks()
  mockBakalariClient.reset()
  
  // Reset Prisma mocks
  Object.values(mockPrisma).forEach(mock => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach(fn => {
        if (vi.isMockFunction(fn)) {
          fn.mockClear()
        }
      })
    } else if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset service mocks (only for services that are still globally mocked)
  Object.values(mockSyncService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockUtils).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockGuards).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
}
