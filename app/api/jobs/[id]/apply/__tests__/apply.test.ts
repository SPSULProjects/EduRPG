import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { JobsService } from '../../../../../lib/services/jobs'
import { logEvent } from '../../../../../lib/utils'

// Mock the JobsService
vi.mock('../../../../../lib/services/jobs', () => ({
  JobsService: {
    applyForJob: vi.fn()
  }
}))

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock utils
vi.mock('../../../../../lib/utils', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
  sanitizeForLog: vi.fn((msg: string) => msg),
  logEvent: vi.fn()
}))

describe('Job Apply API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/jobs/[id]/apply', () => {
    const mockStudentSession = {
      user: {
        id: 'student-1',
        role: 'STUDENT',
        classId: 'class-1'
      }
    }

    const mockTeacherSession = {
      user: {
        id: 'teacher-1',
        role: 'TEACHER'
      }
    }

    const mockAssignment = {
      id: 'assignment-1',
      jobId: 'job-1',
      studentId: 'student-1',
      status: 'APPLIED' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    }

    it('should successfully apply for a job', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockResolvedValue(mockAssignment as any)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.assignment).toEqual(mockAssignment)
      expect(JobsService.applyForJob).toHaveBeenCalledWith('job-1', 'student-1', 'test-request-id')
      expect(logEvent).toHaveBeenCalledWith('INFO', 'job_application_success', {
        requestId: 'test-request-id',
        userId: 'student-1',
        metadata: {
          jobId: 'job-1',
          assignmentId: 'assignment-1'
        }
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(logEvent).toHaveBeenCalledWith('WARN', 'auth_deny', {
        requestId: 'test-request-id',
        metadata: { path: '/api/jobs/[id]/apply', reason: 'No session' }
      })
    })

    it('should return 403 for non-student user', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockTeacherSession as any)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
      expect(logEvent).toHaveBeenCalledWith('WARN', 'rbac_deny', {
        requestId: 'test-request-id',
        userId: 'teacher-1',
        metadata: {
          path: '/api/jobs/[id]/apply',
          userRole: 'TEACHER',
          requiredRole: 'STUDENT'
        }
      })
    })

    it('should return 400 for invalid job ID', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)

      const request = new NextRequest('http://localhost:3000/api/jobs//apply')
      const response = await POST(request, { params: Promise.resolve({ id: '' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid job ID')
      expect(logEvent).toHaveBeenCalledWith('WARN', 'validation_error', {
        requestId: 'test-request-id',
        userId: 'student-1',
        metadata: {
          path: '/api/jobs/[id]/apply',
          field: 'jobId',
          value: ''
        }
      })
    })

    it('should return 404 when job not found', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue(new Error('Job not found'))

      const request = new NextRequest('http://localhost:3000/api/jobs/nonexistent/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
      expect(logEvent).toHaveBeenCalledWith('ERROR', 'job_application_failed', {
        requestId: 'test-request-id',
        userId: 'student-1',
        metadata: {
          path: '/api/jobs/[id]/apply',
          jobId: 'nonexistent',
          error: 'Job not found'
        }
      })
    })

    it('should return 409 when already applied', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue(new Error('Student already applied for this job'))

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Already applied for this job')
    })

    it('should return 400 when job is not available', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue(new Error('Job is not open for applications'))

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Job is not available')
    })

    it('should return 400 when job is full', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue(new Error('Job is full'))

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Job is not available')
    })

    it('should return 500 for unexpected errors', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(require('next-auth').getServerSession).mockResolvedValue(mockStudentSession as any)
      vi.mocked(JobsService.applyForJob).mockRejectedValue('String error')

      const request = new NextRequest('http://localhost:3000/api/jobs/job-1/apply')
      const response = await POST(request, { params: Promise.resolve({ id: 'job-1' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
