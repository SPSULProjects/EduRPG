/**
 * Centralized mocks for integration tests
 * Provides consistent mock implementations for auth, services, and external dependencies
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@/app/lib/generated'

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
      id: "student1",
      email: "jan.novak@school.cz",
      name: "Jan Novák",
      role: UserRole.STUDENT,
      classId: "class1"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  teacher: {
    user: {
      id: "teacher1",
      email: "petr.dvorak@school.cz", 
      name: "Petr Dvořák",
      role: UserRole.TEACHER
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  operator: {
    user: {
      id: "operator1",
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
  return vi.fn().mockResolvedValue(mockSessions.student.user)
}

export const mockRequireTeacher = () => {
  return vi.fn().mockResolvedValue(mockSessions.teacher.user)
}

export const mockRequireOperator = () => {
  return vi.fn().mockResolvedValue(mockSessions.operator.user)
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
        userID: "student1",
        userName: "Jan Novák",
        userType: "student",
        classAbbrev: "1A",
        email: "jan.novak@school.cz"
      },
      {
        userID: "student2", 
        userName: "Marie Svobodová",
        userType: "student",
        classAbbrev: "1A",
        email: "marie.svobodova@school.cz"
      },
      {
        userID: "teacher1",
        userName: "Petr Dvořák",
        userType: "teacher",
        email: "petr.dvorak@school.cz"
      },
      {
        userID: "operator1",
        userName: "Admin Admin",
        userType: "operator",
        email: "admin@school.cz"
      }
    ]

    // Mock classes
    this.classes = [
      { id: "class1", name: "1A", grade: 1 },
      { id: "class2", name: "2B", grade: 2 }
    ]

    // Mock subjects
    this.subjects = [
      { id: "subj1", name: "Matematika", abbreviation: "MAT" },
      { id: "subj2", name: "Český jazyk", abbreviation: "CJ" },
      { id: "subj3", name: "Anglický jazyk", abbreviation: "AJ" }
    ]

    // Mock enrollments
    this.enrollments = [
      { userId: "student1", classId: "class1", subjectId: "subj1" },
      { userId: "student1", classId: "class1", subjectId: "subj2" },
      { userId: "student2", classId: "class1", subjectId: "subj1" },
      { userId: "student2", classId: "class1", subjectId: "subj3" }
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
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn().mockResolvedValue(10),
  },
  class: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  subject: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userClassSubject: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  job: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  jobAssignment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  item: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  purchase: {
    findMany: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
  achievement: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  achievementAward: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  moneyTx: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
  $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
}

// ============================================================================
// SERVICE MOCKS
// ============================================================================

export const mockEventsService = {
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

export const mockJobsService = {
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

export const mockXPService = {
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

export const mockShopService = {
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
    user: { id: "operator1", role: "OPERATOR" }
  })
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
    requireOperator: mockRequireOperator()
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

  // Mock services
  vi.mock('@/app/lib/services/events', () => ({
    EventsService: mockEventsService
  }))

  vi.mock('@/app/lib/services/jobs', () => ({
    JobsService: mockJobsService
  }))

  vi.mock('@/app/lib/services/xp', () => ({
    XPService: mockXPService
  }))

  vi.mock('@/app/lib/services/shop', () => ({
    ShopService: mockShopService
  }))

  vi.mock('@/app/lib/services/items', () => ({
    ItemsService: mockItemsService
  }))

  vi.mock('@/app/lib/services/sync-bakalari', () => ({
    syncBakalariData: mockSyncService.syncBakalariData
  }))

  // Mock auth guards
  vi.mock('@/app/lib/auth/guards', () => ({
    guardApiRoute: mockGuards.guardApiRoute
  }))

  // Mock utils
  vi.mock('@/app/lib/utils', () => mockUtils)

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

  // Reset service mocks
  Object.values(mockEventsService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockJobsService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockXPService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockShopService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockItemsService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockSyncService).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockUtils).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
  Object.values(mockGuards).forEach(fn => vi.isMockFunction(fn) && fn.mockClear())
}
