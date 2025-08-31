import { prisma } from "../prisma"
import { UserRole } from "../generated"
import { generateRequestId, sanitizeForLog } from "../utils"
import { LevelingSystem } from "../leveling"

export class XPService {
  static async grantXP(data: {
    studentId: string
    teacherId: string
    subjectId: string
    amount: number
    reason: string
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
      
      // Check daily budget (skip for operators)
      if (teacher.role === UserRole.TEACHER) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        let dailyBudget = await tx.teacherDailyBudget.findUnique({
          where: {
            teacherId_subjectId_date: {
              teacherId: data.teacherId,
              subjectId: data.subjectId,
              date: today
            }
          }
        })
        
        if (!dailyBudget) {
          // Create default budget for today
          dailyBudget = await tx.teacherDailyBudget.create({
            data: {
              teacherId: data.teacherId,
              subjectId: data.subjectId,
              date: today,
              budget: 1000, // Default daily budget
              used: 0
            }
          })
        }
        
        if (dailyBudget.used + data.amount > dailyBudget.budget) {
          throw new Error(`Daily XP budget exceeded. Available: ${dailyBudget.budget - dailyBudget.used}, Requested: ${data.amount}`)
        }
        
        // Update used budget
        await tx.teacherDailyBudget.update({
          where: { id: dailyBudget.id },
          data: { used: dailyBudget.used + data.amount }
        })
      }
      
      // Check for idempotency (prevent duplicate grants)
      const existingGrant = await tx.xPAudit.findFirst({
        where: {
          userId: data.studentId,
          reason: data.reason,
          requestId: reqId
        }
      })
      
      if (existingGrant) {
        return existingGrant // Return existing grant if same requestId
      }
      
      // Grant XP
      const xpAudit = await tx.xPAudit.create({
        data: {
          userId: data.studentId,
          amount: data.amount,
          reason: data.reason,
          requestId: reqId
        }
      })
      
      // Log XP grant
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`XP granted: ${data.amount} XP to student for ${data.reason}`),
          userId: data.teacherId,
          requestId: reqId,
          metadata: {
            studentId: data.studentId,
            subjectId: data.subjectId,
            amount: data.amount,
            reason: data.reason
          }
        }
      })
      
      return xpAudit
    })
  }
  
  static async getStudentXP(studentId: string) {
    const xpAudits = await prisma.xPAudit.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "desc" }
    })
    
    const totalXP = xpAudits.reduce((sum, audit) => sum + audit.amount, 0)
    const levelInfo = LevelingSystem.getLevelInfo(totalXP)
    
    return {
      totalXP,
      level: levelInfo.level,
      progressToNextLevel: LevelingSystem.getProgressToNextLevel(totalXP),
      xpForNextLevel: levelInfo.xpForNextLevel,
      xpNeededForNextLevel: levelInfo.xpRequired,
      audits: xpAudits,
      recentGrants: xpAudits.slice(0, 10) // Last 10 grants
    }
  }
  
  static async getTeacherDailyBudget(teacherId: string, subjectId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const dailyBudget = await prisma.teacherDailyBudget.findUnique({
      where: {
        teacherId_subjectId_date: {
          teacherId,
          subjectId,
          date: startOfDay
        }
      }
    })
    
    if (!dailyBudget) {
      return {
        budget: 1000, // Default budget
        used: 0,
        remaining: 1000
      }
    }
    
    return {
      budget: dailyBudget.budget,
      used: dailyBudget.used,
      remaining: dailyBudget.budget - dailyBudget.used
    }
  }
  
  static async getTeacherDailyBudgets(teacherId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const budgets = await prisma.teacherDailyBudget.findMany({
      where: {
        teacherId,
        date: startOfDay
      },
      include: {
        subject: {
          select: { name: true, code: true }
        }
      }
    })
    
    return budgets.map(budget => ({
      subject: budget.subject,
      budget: budget.budget,
      used: budget.used,
      remaining: budget.budget - budget.used
    }))
  }
  
  static async setDailyBudget(teacherId: string, subjectId: string, budget: number, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    return await prisma.teacherDailyBudget.upsert({
      where: {
        teacherId_subjectId_date: {
          teacherId,
          subjectId,
          date: startOfDay
        }
      },
      update: {
        budget
      },
      create: {
        teacherId,
        subjectId,
        date: startOfDay,
        budget,
        used: 0
      }
    })
  }
  
  static async getXPLeaderboard(classId?: string, limit: number = 10) {
    const whereClause = classId ? {
      classId
    } : {}
    
    const users = await prisma.user.findMany({
      where: {
        ...whereClause,
        role: "STUDENT"
      },
      include: {
        xpAudits: true
      }
    })
    
    const usersWithXP = users.map(user => {
      const totalXP = user.xpAudits.reduce((sum, audit) => sum + audit.amount, 0)
      const levelInfo = LevelingSystem.getLevelInfo(totalXP)
      return {
        id: user.id,
        name: user.name,
        totalXP,
        level: levelInfo.level,
        progressToNextLevel: LevelingSystem.getProgressToNextLevel(totalXP)
      }
    })
    
    return usersWithXP
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, limit)
  }
}
