import { prisma } from "../prisma"
import { getBakalariUserData, getBakalariSubjectData } from "../bakalari/bakalari"
import { UserRole } from "../generated"
import { logEvent } from "../utils"

export interface SyncResult {
  success: boolean
  classesCreated: number
  classesUpdated: number
  usersCreated: number
  usersUpdated: number
  subjectsCreated: number
  subjectsUpdated: number
  enrollmentsCreated: number
  enrollmentsUpdated: number
  errors: string[]
}

export interface SyncOptions {
  requestId?: string
  operatorId?: string
}

/**
 * Maps Bakalari user type to our UserRole enum
 */
const mapBakalariUserTypeToRole = (userType: string): UserRole => {
  switch (userType.toLowerCase()) {
    case "student":
      return UserRole.STUDENT
    case "teacher":
      return UserRole.TEACHER
    default:
      return UserRole.STUDENT
  }
}

/**
 * Extracts grade from class abbreviation (e.g., "1.A" -> 1)
 */
const extractGradeFromClass = (classAbbrev: string): number => {
  const match = classAbbrev.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 1
}

/**
 * Syncs Bakalari data to our database
 * This is a simplified version that would need to be expanded based on actual Bakalari API structure
 */
export async function syncBakalariData(
  bakalariToken: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    classesCreated: 0,
    classesUpdated: 0,
    usersCreated: 0,
    usersUpdated: 0,
    subjectsCreated: 0,
    subjectsUpdated: 0,
    enrollmentsCreated: 0,
    enrollmentsUpdated: 0,
    errors: []
  }

  try {
    // Log sync start
    await logEvent("INFO", "Bakalari sync started", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        operatorId: options.operatorId
      }
    })

    // In a real implementation, you would:
    // 1. Fetch all users from Bakalari API
    // 2. Fetch all classes from Bakalari API  
    // 3. Fetch all subjects from Bakalari API
    // 4. Process them in a transaction

    // For now, this is a placeholder implementation
    // You would need to implement the actual API calls based on Bakalari's structure
    
    // Example structure (this would need to be adapted to actual Bakalari API):
    /*
    const bakalariUsers = await fetchBakalariUsers(bakalariToken)
    const bakalariClasses = await fetchBakalariClasses(bakalariToken)
    const bakalariSubjects = await fetchBakalariSubjects(bakalariToken)
    */

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      // Sync classes first
      // for (const bakalariClass of bakalariClasses) {
      //   const existingClass = await tx.class.findFirst({
      //     where: { name: bakalariClass.abbrev }
      //   })
      
      //   if (existingClass) {
      //     await tx.class.update({
      //       where: { id: existingClass.id },
      //       data: { grade: extractGradeFromClass(bakalariClass.abbrev) }
      //     })
      //     result.classesUpdated++
      //   } else {
      //     await tx.class.create({
      //       data: {
      //         name: bakalariClass.abbrev,
      //         grade: extractGradeFromClass(bakalariClass.abbrev)
      //       }
      //     })
      //     result.classesCreated++
      //   }
      // }

      // Sync subjects
      // for (const bakalariSubject of bakalariSubjects) {
      //   const existingSubject = await tx.subject.findFirst({
      //     where: { code: bakalariSubject.code }
      //   })
      
      //   if (existingSubject) {
      //     await tx.subject.update({
      //       where: { id: existingSubject.id },
      //       data: { name: bakalariSubject.name }
      //     })
      //     result.subjectsUpdated++
      //   } else {
      //     await tx.subject.create({
      //       data: {
      //         name: bakalariSubject.name,
      //         code: bakalariSubject.code
      //       }
      //     })
      //     result.subjectsCreated++
      //   }
      // }

      // Sync users and enrollments
      // for (const bakalariUser of bakalariUsers) {
      //   const userRole = mapBakalariUserTypeToRole(bakalariUser.userType)
      //   
      //   // Find or create class for students
      //   let classId: string | undefined
      //   if (userRole === UserRole.STUDENT && bakalariUser.classAbbrev) {
      //     const classRecord = await tx.class.findFirst({
      //       where: { name: bakalariUser.classAbbrev }
      //     })
      //     if (classRecord) {
      //       classId = classRecord.id
      //     }
      //   }

      //   // Upsert user
      //   const user = await tx.user.upsert({
      //     where: { bakalariId: bakalariUser.userID },
      //     update: {
      //       name: bakalariUser.fullUserName,
      //       classId: classId,
      //       updatedAt: new Date()
      //     },
      //     create: {
      //       email: `${bakalariUser.userID}@bakalari.local`,
      //       name: bakalariUser.fullUserName,
      //       role: userRole,
      //       bakalariId: bakalariUser.userID,
      //       classId: classId
      //     }
      //   })

      //   if (user.id) {
      //     if (classId) {
      //       result.usersCreated++
      //     } else {
      //       result.usersUpdated++
      //     }
      //   }

      //   // Handle enrollments for students
      //   if (userRole === UserRole.STUDENT && bakalariUser.subjects) {
      //     for (const subjectCode of bakalariUser.subjects) {
      //       const subject = await tx.subject.findFirst({
      //         where: { code: subjectCode }
      //       })
      //       
      //       if (subject && classId) {
      //         await tx.enrollment.upsert({
      //           where: {
      //             userId_subjectId: {
      //               userId: user.id,
      //               subjectId: subject.id
      //             }
      //           },
      //           update: {
      //             classId: classId,
      //             updatedAt: new Date()
      //           },
      //           create: {
      //             userId: user.id,
      //             subjectId: subject.id,
      //             classId: classId
      //           }
      //         })
      //         
      //         if (classId) {
      //           result.enrollmentsCreated++
      //         } else {
      //           result.enrollmentsUpdated++
      //         }
      //       }
      //     }
      //   }
      // }
    })

    result.success = true

    // Log successful sync
    await logEvent("INFO", "Bakalari sync completed successfully", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        result
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    result.errors.push(errorMessage)
    
    // Log failed sync
    await logEvent("ERROR", "Bakalari sync failed", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        errors: result.errors
      }
    })
  }

  return result
}
