import { prisma } from "../prisma"
import { JobStatus, JobAssignmentStatus, UserRole } from "../generated"
import { generateRequestId, sanitizeForLog } from "../utils"

export class JobsService {
  static async createJob(data: {
    title: string
    description: string
    subjectId: string
    teacherId: string
    xpReward: number
    moneyReward: number
    maxStudents?: number
  }, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      // Verify teacher exists and has TEACHER role
      const teacher = await tx.user.findFirst({
        where: {
          id: data.teacherId,
          role: { in: [UserRole.TEACHER, UserRole.OPERATOR] }
        }
      })
      
      if (!teacher) {
        throw new Error("Teacher not found or insufficient permissions")
      }
      
      // Create job
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
        }
      })
      
      // Log creation
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
            moneyReward: data.moneyReward
          }
        }
      })
      
      return job
    })
  }
  
  static async applyForJob(jobId: string, studentId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      // Verify job exists and is open
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: { assignments: true }
      })
      
      if (!job) {
        throw new Error("Job not found")
      }
      
      if (job.status !== JobStatus.OPEN) {
        throw new Error("Job is not open for applications")
      }
      
      // Check if student already applied
      const existingAssignment = await tx.jobAssignment.findUnique({
        where: {
          jobId_studentId: {
            jobId,
            studentId
          }
        }
      })
      
      if (existingAssignment) {
        throw new Error("Student already applied for this job")
      }
      
      // Check if job is full
      if (job.assignments.length >= job.maxStudents) {
        throw new Error("Job is full")
      }
      
      // Create assignment
      const assignment = await tx.jobAssignment.create({
        data: {
          jobId,
          studentId,
          status: JobAssignmentStatus.APPLIED
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
  
  static async approveJobAssignment(assignmentId: string, teacherId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.jobAssignment.findUnique({
        where: { id: assignmentId },
        include: { job: true }
      })
      
      if (!assignment) {
        throw new Error("Assignment not found")
      }
      
      if (assignment.job.teacherId !== teacherId) {
        throw new Error("Only the job creator can approve assignments")
      }
      
      if (assignment.status !== JobAssignmentStatus.APPLIED) {
        throw new Error("Assignment is not in APPLIED status")
      }
      
      const updatedAssignment = await tx.jobAssignment.update({
        where: { id: assignmentId },
        data: { status: JobAssignmentStatus.APPROVED }
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
            jobId: assignment.jobId,
            studentId: assignment.studentId
          }
        }
      })
      
      return updatedAssignment
    })
  }
  
  static async completeJob(jobId: string, teacherId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          assignments: {
            include: { student: true }
          }
        }
      })
      
      if (!job) {
        throw new Error("Job not found")
      }
      
      if (job.teacherId !== teacherId) {
        throw new Error("Only the job creator can complete the job")
      }
      
      if (job.status !== JobStatus.OPEN && job.status !== JobStatus.IN_PROGRESS) {
        throw new Error("Job cannot be completed in current status")
      }
      
      // Update job status
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CLOSED,
          closedAt: new Date()
        }
      })
      
      // Process payouts for approved assignments
      const approvedAssignments = job.assignments.filter(
        a => a.status === JobAssignmentStatus.APPROVED
      )
      
      for (const assignment of approvedAssignments) {
        // Calculate individual payout (split equally)
        const xpPerStudent = Math.floor(job.xpReward / approvedAssignments.length)
        const moneyPerStudent = Math.floor(job.moneyReward / approvedAssignments.length)
        
        // Award XP
        await tx.xPAudit.create({
          data: {
            userId: assignment.studentId,
            amount: xpPerStudent,
            reason: `Job completion: ${job.title}`,
            requestId: reqId
          }
        })
        
        // Award money
        await tx.moneyTx.create({
          data: {
            userId: assignment.studentId,
            amount: moneyPerStudent,
            type: "EARNED",
            reason: `Job completion: ${job.title}`,
            requestId: reqId
          }
        })
        
        // Update assignment status
        await tx.jobAssignment.update({
          where: { id: assignment.id },
          data: {
            status: JobAssignmentStatus.COMPLETED,
            completedAt: new Date()
          }
        })
      }
      
      // Log completion
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Job completed: ${job.title}`),
          userId: teacherId,
          requestId: reqId,
          metadata: {
            jobId,
            totalXP: job.xpReward,
            totalMoney: job.moneyReward,
            studentsCount: approvedAssignments.length
          }
        }
      })
      
      return updatedJob
    })
  }
  
  static async getJobsForStudent(studentId: string, classId?: string) {
    return await prisma.job.findMany({
      where: {
        status: JobStatus.OPEN,
        subject: {
          enrollments: {
            some: {
              userId: studentId,
              ...(classId && { classId })
            }
          }
        }
      },
      include: {
        subject: true,
        teacher: {
          select: { name: true }
        },
        assignments: {
          where: { studentId }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  }
  
  static async getJobsForTeacher(teacherId: string) {
    return await prisma.job.findMany({
      where: { teacherId },
      include: {
        subject: true,
        assignments: {
          include: {
            student: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  }
}
