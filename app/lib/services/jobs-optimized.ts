import { JobStatus, JobAssignmentStatus, UserRole } from "../generated"
import { generateRequestId, sanitizeForLog } from "../utils"
import { BaseService } from "./base"
import { prisma } from "../prisma"

export interface CreateJobData {
  title: string
  description: string
  subjectId: string
  teacherId: string
  xpReward: number
  moneyReward: number
  maxStudents?: number
}

export interface JobFilters {
  status?: JobStatus
  subjectId?: string
  classId?: string
  teacherId?: string
  includeInactive?: boolean
}

export interface JobWithDetails {
  id: string
  title: string
  description: string
  xpReward: number
  moneyReward: number
  maxStudents: number
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  subject: {
    id: string
    name: string
  }
  teacher: {
    id: string
    name: string
    email: string
  }
  assignments: Array<{
    id: string
    status: JobAssignmentStatus
    student: {
      id: string
      name: string
    }
  }>
  _count: {
    assignments: number
  }
}

export class JobsServiceOptimized extends BaseService {
  static async createJob(data: CreateJobData, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return this.executeInTransaction(async (tx) => {
      // Verify teacher exists and has appropriate role
      const teacher = await tx.user.findFirst({
        where: {
          id: data.teacherId,
          role: { in: [UserRole.TEACHER, UserRole.OPERATOR] }
        },
        select: { id: true, name: true, role: true }
      })
      
      if (!teacher) {
        throw new Error("Teacher not found or insufficient permissions")
      }
      
      // Create job with optimized data structure
      const job = await tx.job.create({
        data: {
          title: data.title,
          description: data.description,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          xpReward: data.xpReward,
          moneyReward: data.moneyReward,
          maxStudents: data.maxStudents || 1,
          status: JobStatus.OPEN
        },
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, email: true } }
        }
      })
      
      // Log creation with structured data
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Job created: ${data.title}`),
          userId: data.teacherId,
          requestId: reqId,
          metadata: {
            jobId: job.id,
            subjectId: data.subjectId,
            xpReward: data.xpReward,
            moneyReward: data.moneyReward,
            maxStudents: data.maxStudents || 1
          }
        }
      })
      
      return job
    })
  }
  
  static async applyForJob(jobId: string, studentId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return this.executeInTransaction(async (tx) => {
      // Get job with current assignments in a single query
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          assignments: {
            where: { studentId },
            select: { id: true, status: true }
          },
          _count: {
            select: { assignments: true }
          }
        }
      })
      
      if (!job) {
        throw new Error("Job not found")
      }
      
      if (job.status !== JobStatus.OPEN) {
        throw new Error("Job is not open for applications")
      }
      
      if (job.assignments.length > 0) {
        throw new Error("Student already applied for this job")
      }
      
      if (job._count.assignments >= job.maxStudents) {
        throw new Error("Job is full")
      }
      
      // Create assignment
      const assignment = await tx.jobAssignment.create({
        data: {
          jobId,
          studentId,
          status: JobAssignmentStatus.APPLIED
        },
        include: {
          student: { select: { id: true, name: true } }
        }
      })
      
      // Log application
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Student applied for job: ${job.title}`),
          userId: studentId,
          requestId: reqId,
          metadata: {
            jobId,
            assignmentId: assignment.id
          }
        }
      })
      
      return assignment
    })
  }
  
  static async getJobsForStudent(studentId: string, classId?: string): Promise<JobWithDetails[]> {
    const whereClause: any = {
      status: JobStatus.OPEN,
      subject: {
        enrollments: {
          some: { classId: classId || undefined }
        }
      }
    }
    
    // Remove classId filter if not provided
    if (!classId) {
      delete whereClause.subject.enrollments
    }
    
    return this.findManyOptimized(prisma.job, {
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        assignments: {
          where: { studentId },
          select: {
            id: true,
            status: true,
            student: { select: { id: true, name: true } }
          }
        },
        _count: { select: { assignments: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  }
  
  static async getJobsForTeacher(teacherId: string, filters: JobFilters = {}): Promise<JobWithDetails[]> {
    const whereClause: any = {
      teacherId,
      ...(filters.status && { status: filters.status }),
      ...(filters.subjectId && { subjectId: filters.subjectId }),
      ...(filters.includeInactive === false && { status: JobStatus.OPEN })
    }
    
    return this.findManyOptimized(prisma.job, {
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            student: { select: { id: true, name: true } }
          }
        },
        _count: { select: { assignments: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  }
  
  static async getJobs(filters: JobFilters = {}, pagination?: { page: number; limit: number }): Promise<JobWithDetails[]> {
    const whereClause: any = {
      ...(filters.status && { status: filters.status }),
      ...(filters.subjectId && { subjectId: filters.subjectId }),
      ...(filters.teacherId && { teacherId: filters.teacherId }),
      ...(filters.classId && {
        subject: {
          enrollments: {
            some: { classId: filters.classId }
          }
        }
      }),
      ...(filters.includeInactive === false && { status: JobStatus.OPEN })
    }
    
    if (pagination) {
      const result = await this.paginate(prisma.job, {
        where: whereClause,
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, email: true } },
          assignments: {
            include: {
              student: { select: { id: true, name: true } }
            }
          },
          _count: { select: { assignments: true } }
        }
      }, pagination)
      
      return result.data
    }
    
    return this.findManyOptimized(prisma.job, {
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            student: { select: { id: true, name: true } }
          }
        },
        _count: { select: { assignments: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  }
  
  static async approveJobAssignment(assignmentId: string, teacherId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return this.executeInTransaction(async (tx) => {
      // Get assignment with job details
      const assignment = await tx.jobAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          job: {
            include: {
              teacher: { select: { id: true, role: true } }
            }
          },
          student: { select: { id: true, name: true } }
        }
      })
      
      if (!assignment) {
        throw new Error("Assignment not found")
      }
      
      if (assignment.job.teacher.id !== teacherId) {
        throw new Error("Only the job creator can approve assignments")
      }
      
      if (assignment.status !== JobAssignmentStatus.APPLIED) {
        throw new Error("Assignment is not in applied status")
      }
      
      // Update assignment status
      const updatedAssignment = await tx.jobAssignment.update({
        where: { id: assignmentId },
        data: { status: JobAssignmentStatus.APPROVED },
        include: {
          student: { select: { id: true, name: true } }
        }
      })
      
      // Log approval
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Job assignment approved: ${assignment.job.title}`),
          userId: teacherId,
          requestId: reqId,
          metadata: {
            assignmentId,
            jobId: assignment.job.id,
            studentId: assignment.student.id
          }
        }
      })
      
      return updatedAssignment
    })
  }
  
  static async closeJob(jobId: string, teacherId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return this.executeInTransaction(async (tx) => {
      // Get job with all assignments
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          teacher: { select: { id: true, role: true } },
          assignments: {
            where: { status: JobAssignmentStatus.APPROVED },
            include: {
              student: { select: { id: true, name: true } }
            }
          }
        }
      })
      
      if (!job) {
        throw new Error("Job not found")
      }
      
      if (job.teacher.id !== teacherId) {
        throw new Error("Only the job creator can close jobs")
      }
      
      if (job.status !== JobStatus.OPEN) {
        throw new Error("Job is not open")
      }
      
      // Close the job
      const closedJob = await tx.job.update({
        where: { id: jobId },
        data: { status: JobStatus.CLOSED },
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, email: true } }
        }
      })
      
      // Process payouts for approved assignments
      const payoutPromises = job.assignments.map(async (assignment) => {
        // Create XP audit
        await tx.xPAudit.create({
          data: {
            userId: assignment.student.id,
            amount: job.xpReward,
            reason: `Job completion: ${job.title}`,
            requestId: reqId
          }
        })
        
        // Create money transaction
        await tx.moneyTx.create({
          data: {
            userId: assignment.student.id,
            amount: job.moneyReward,
            type: "EARNED",
            description: `Job completion: ${job.title}`,
            requestId: reqId
          }
        })
        
        // Update assignment status
        return tx.jobAssignment.update({
          where: { id: assignment.id },
          data: { status: JobAssignmentStatus.COMPLETED }
        })
      })
      
      await Promise.all(payoutPromises)
      
      // Log job closure
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Job closed: ${job.title}`),
          userId: teacherId,
          requestId: reqId,
          metadata: {
            jobId,
            assignmentsProcessed: job.assignments.length,
            totalXPGranted: job.xpReward * job.assignments.length,
            totalMoneyGranted: job.moneyReward * job.assignments.length
          }
        }
      })
      
      return closedJob
    })
  }
  
  static async getJobStats(teacherId: string) {
    const [totalJobs, openJobs, closedJobs, totalApplications] = await Promise.all([
      prisma.job.count({ where: { teacherId } }),
      prisma.job.count({ where: { teacherId, status: JobStatus.OPEN } }),
      prisma.job.count({ where: { teacherId, status: JobStatus.CLOSED } }),
      prisma.jobAssignment.count({
        where: {
          job: { teacherId }
        }
      })
    ])
    
    return {
      totalJobs,
      openJobs,
      closedJobs,
      totalApplications
    }
  }
}
