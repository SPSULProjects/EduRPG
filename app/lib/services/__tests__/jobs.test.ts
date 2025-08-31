import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JobsService } from '../jobs'
import { prisma } from '../../prisma'
import { JobStatus, JobAssignmentStatus, UserRole } from '../../generated'

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    job: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    jobAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    user: {
      findFirst: vi.fn()
    },
    xPAudit: {
      create: vi.fn()
    },
    moneyTx: {
      create: vi.fn()
    },
    systemLog: {
      create: vi.fn()
    }
  }
}))

describe('JobsService', () => {
  const mockPrisma = vi.mocked(prisma)
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('closeJob - Payout Logic', () => {
    it('should calculate payouts correctly with floor division', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          },
          {
            id: 'assignment-2', 
            studentId: 'student-2',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 2' }
          }
        ]
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockResolvedValue({})
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const result = await JobsService.closeJob('job-1', 'teacher-1')

      // Verify payout calculations
      expect(result.payouts).toHaveLength(2)
      expect(result.payouts[0].xpAmount).toBe(50) // floor(100 / 2)
      expect(result.payouts[0].moneyAmount).toBe(25) // floor(50 / 2)
      expect(result.payouts[1].xpAmount).toBe(50) // floor(100 / 2)
      expect(result.payouts[1].moneyAmount).toBe(25) // floor(50 / 2)
      
      // Verify remainders
      expect(result.remainder.xp).toBe(0) // 100 - (50 + 50)
      expect(result.remainder.money).toBe(0) // 50 - (25 + 25)
    })

    it('should handle remainder correctly with uneven division', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 101,
        moneyReward: 51,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          },
          {
            id: 'assignment-2',
            studentId: 'student-2', 
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 2' }
          }
        ]
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockResolvedValue({})
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const result = await JobsService.closeJob('job-1', 'teacher-1')

      // Verify payout calculations with floor division
      expect(result.payouts).toHaveLength(2)
      expect(result.payouts[0].xpAmount).toBe(50) // floor(101 / 2)
      expect(result.payouts[0].moneyAmount).toBe(25) // floor(51 / 2)
      expect(result.payouts[1].xpAmount).toBe(50) // floor(101 / 2)
      expect(result.payouts[1].moneyAmount).toBe(25) // floor(51 / 2)
      
      // Verify remainders
      expect(result.remainder.xp).toBe(1) // 101 - (50 + 50)
      expect(result.remainder.money).toBe(1) // 51 - (25 + 25)
    })

    it('should handle single student payout correctly', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          }
        ]
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockResolvedValue({})
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const result = await JobsService.closeJob('job-1', 'teacher-1')

      // Verify single student gets full payout
      expect(result.payouts).toHaveLength(1)
      expect(result.payouts[0].xpAmount).toBe(100)
      expect(result.payouts[0].moneyAmount).toBe(50)
      
      // Verify no remainder
      expect(result.remainder.xp).toBe(0)
      expect(result.remainder.money).toBe(0)
    })

    it('should handle zero approved assignments', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: []
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockResolvedValue({})
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const result = await JobsService.closeJob('job-1', 'teacher-1')

      // Verify no payouts
      expect(result.payouts).toHaveLength(0)
      
      // Verify full remainder
      expect(result.remainder.xp).toBe(100)
      expect(result.remainder.money).toBe(50)
    })

    it('should filter only approved assignments for payout', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          },
          {
            id: 'assignment-2',
            studentId: 'student-2',
            status: JobAssignmentStatus.APPLIED, // Not approved
            student: { name: 'Student 2' }
          },
          {
            id: 'assignment-3',
            studentId: 'student-3',
            status: JobAssignmentStatus.REJECTED, // Not approved
            student: { name: 'Student 3' }
          }
        ]
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockResolvedValue({})
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const result = await JobsService.closeJob('job-1', 'teacher-1')

      // Verify only approved assignment gets payout
      expect(result.payouts).toHaveLength(1)
      expect(result.payouts[0].studentId).toBe('student-1')
      expect(result.payouts[0].xpAmount).toBe(100) // Full amount for single approved student
      expect(result.payouts[0].moneyAmount).toBe(50)
      
      // Verify no remainder
      expect(result.remainder.xp).toBe(0)
      expect(result.remainder.money).toBe(0)
    })
  })

  describe('closeJob - Transactional Integrity', () => {
    it('should rollback all changes if any operation fails', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          }
        ]
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: vi.fn().mockRejectedValue(new Error('Database error'))
          },
          moneyTx: {
            create: vi.fn().mockResolvedValue({})
          },
          systemLog: {
            create: vi.fn().mockResolvedValue({})
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      await expect(JobsService.closeJob('job-1', 'teacher-1')).rejects.toThrow('Database error')
    })

    it('should create all required audit records', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: [
          {
            id: 'assignment-1',
            studentId: 'student-1',
            status: JobAssignmentStatus.APPROVED,
            student: { name: 'Student 1' }
          }
        ]
      }

      const mockXpAuditCreate = vi.fn().mockResolvedValue({})
      const mockMoneyTxCreate = vi.fn().mockResolvedValue({})
      const mockSystemLogCreate = vi.fn().mockResolvedValue({})

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob),
            update: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED })
          },
          jobAssignment: {
            update: vi.fn().mockResolvedValue({})
          },
          xPAudit: {
            create: mockXpAuditCreate
          },
          moneyTx: {
            create: mockMoneyTxCreate
          },
          systemLog: {
            create: mockSystemLogCreate
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      await JobsService.closeJob('job-1', 'teacher-1')

      // Verify XP audit was created
      expect(mockXpAuditCreate).toHaveBeenCalledWith({
        data: {
          userId: 'student-1',
          amount: 100,
          reason: 'Job completion: Test Job',
          requestId: expect.any(String)
        }
      })

      // Verify money transaction was created
      expect(mockMoneyTxCreate).toHaveBeenCalledWith({
        data: {
          userId: 'student-1',
          amount: 50,
          type: 'EARNED',
          reason: 'Job completion: Test Job',
          requestId: expect.any(String)
        }
      })

      // Verify system logs were created
      expect(mockSystemLogCreate).toHaveBeenCalledTimes(1) // Main log only (no assignments = no remainders)
    })
  })

  describe('closeJob - Authorization', () => {
    it('should reject if user is not the job creator', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.OPEN,
        assignments: []
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob)
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      await expect(JobsService.closeJob('job-1', 'teacher-2')).rejects.toThrow('Only the job creator can close the job')
    })

    it('should reject if job is already closed', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Test Job',
        xpReward: 100,
        moneyReward: 50,
        teacherId: 'teacher-1',
        status: JobStatus.CLOSED,
        assignments: []
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          job: {
            findUnique: vi.fn().mockResolvedValue(mockJob)
          }
        }
        return await callback(mockTx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      await expect(JobsService.closeJob('job-1', 'teacher-1')).rejects.toThrow('Job cannot be closed in current status')
    })
  })
})
