/**
 * Example test demonstrating how to use centralized mocks
 * This file shows the proper way to use the centralized mock system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  mockGetServerSession, 
  mockGetServerSessionUnauthorized,
  mockRequireStudent,
  mockRequireTeacher,
  mockRequireOperator,
  createMockRequest,
  resetAllMocks,
  mockSessions
} from './mocks'

describe('Centralized Mocks Example', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Authentication Mocks', () => {
    it('should provide student session mock', async () => {
      const mockSession = mockGetServerSession('student')
      expect(mockSession).toBeDefined()
      
      // The mock function will return the student session when called
      const session = await mockSession()
      expect(session.user.role).toBe('STUDENT')
      expect(session.user.name).toBe('Jan Novák')
    })

    it('should provide teacher session mock', async () => {
      const mockSession = mockGetServerSession('teacher')
      const session = await mockSession()
      expect(session.user.role).toBe('TEACHER')
      expect(session.user.name).toBe('Petr Dvořák')
    })

    it('should provide operator session mock', async () => {
      const mockSession = mockGetServerSession('operator')
      const session = await mockSession()
      expect(session.user.role).toBe('OPERATOR')
      expect(session.user.name).toBe('Admin Admin')
    })

    it('should provide unauthorized session mock', async () => {
      const mockSession = mockGetServerSessionUnauthorized()
      const session = await mockSession()
      expect(session).toBeNull()
    })
  })

  describe('RBAC Mocks', () => {
    it('should provide student requirement mock', async () => {
      const mockRequire = mockRequireStudent()
      const user = await mockRequire()
      expect(user.role).toBe('STUDENT')
    })

    it('should provide teacher requirement mock', async () => {
      const mockRequire = mockRequireTeacher()
      const user = await mockRequire()
      expect(user.role).toBe('TEACHER')
    })

    it('should provide operator requirement mock', async () => {
      const mockRequire = mockRequireOperator()
      const user = await mockRequire()
      expect(user.role).toBe('OPERATOR')
    })
  })

  describe('Request Mocks', () => {
    it('should create mock GET request', () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/test')
      expect(request.method).toBe('GET')
      expect(request.url).toBe('http://localhost:3000/api/test')
    })

    it('should create mock POST request with body', () => {
      const body = { test: 'data' }
      const request = createMockRequest('POST', 'http://localhost:3000/api/test', body)
      expect(request.method).toBe('POST')
      expect(request.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('Session Data', () => {
    it('should have consistent test user data', () => {
      expect(mockSessions.student.user.id).toBe('cuid_student_001')
      expect(mockSessions.student.user.email).toBe('jan.novak@school.cz')
      expect(mockSessions.student.user.role).toBe('STUDENT')
      expect(mockSessions.student.user.classId).toBe('cuid_class_001')

      expect(mockSessions.teacher.user.id).toBe('cuid_teacher_001')
      expect(mockSessions.teacher.user.email).toBe('petr.dvorak@school.cz')
      expect(mockSessions.teacher.user.role).toBe('TEACHER')

      expect(mockSessions.operator.user.id).toBe('cuid_operator_001')
      expect(mockSessions.operator.user.email).toBe('admin@school.cz')
      expect(mockSessions.operator.user.role).toBe('OPERATOR')
    })
  })
})
