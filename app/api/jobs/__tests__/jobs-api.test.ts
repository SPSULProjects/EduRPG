import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { JobsService } from '@/app/lib/services/jobs'
import { mockGetServerSession } from '../../../../vitest.setup'

// Mock the JobsService
vi.mock('@/app/lib/services/jobs', () => ({
  JobsService: {
    createJob: vi.fn(),
    getJobsForStudent: vi.fn(),
    getJobsForTeacher: vi.fn()
  }
}))

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/jobs', () => {
    it('should return jobs for student', async () => {
      const mockSession = {
        user: {
          id: 'student-1',
          role: 'STUDENT',
          classId: 'class-1'
        }
      }

      const mockJobs = [
        {
          id: 'job-1',
          title: 'Test Job',
          description: 'Test Description',
          xpReward: 100,
          moneyReward: 50
        }
      ]

      mockGetServerSession.mockResolvedValue(mockSession as any)
      vi.mocked(JobsService.getJobsForStudent).mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toEqual(mockJobs)
      expect(JobsService.getJobsForStudent).toHaveBeenCalledWith('student-1', 'class-1')
    })

    it('should return jobs for teacher', async () => {
      const mockSession = {
        user: {
          id: 'teacher-1',
          role: 'TEACHER'
        }
      }

      const mockJobs = [
        {
          id: 'job-1',
          title: 'Test Job',
          description: 'Test Description',
          xpReward: 100,
          moneyReward: 50
        }
      ]

      mockGetServerSession.mockResolvedValue(mockSession as any)
      vi.mocked(JobsService.getJobsForTeacher).mockResolvedValue(mockJobs)

      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toEqual(mockJobs)
      expect(JobsService.getJobsForTeacher).toHaveBeenCalledWith('teacher-1')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/jobs', () => {
    it('should create a new job', async () => {
      const mockSession = {
        user: {
          id: 'teacher-1',
          role: 'TEACHER'
        }
      }

      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        description: 'Test Description',
        xpReward: 100,
        moneyReward: 50
      }

      mockGetServerSession.mockResolvedValue(mockSession as any)
      vi.mocked(JobsService.createJob).mockResolvedValue(mockJob)

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Job',
          description: 'Test Description',
          subjectId: 'clh123456789012345678901234',
          xpReward: 100,
          moneyReward: 50
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.job).toEqual(mockJob)
      expect(JobsService.createJob).toHaveBeenCalledWith({
        title: 'Test Job',
        description: 'Test Description',
        subjectId: 'clh123456789012345678901234',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1'
      })
    })
  })
})
