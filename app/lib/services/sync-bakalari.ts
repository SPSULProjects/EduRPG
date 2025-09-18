import { prisma } from "../prisma"
import { getBakalariUserData, getBakalariSubjectData, loginToBakalari } from "../bakalari/bakalari"
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
  runId: string
  startedAt: string
  completedAt: string
  durationMs: number
}

export interface SyncOptions {
  requestId?: string
  operatorId?: string
  bakalariUsername?: string
  bakalariPassword?: string
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
  return match && match[1] ? parseInt(match[1], 10) : 1
}

/**
 * Fetches all users from Bakalari API
 * Note: This is a simplified implementation since Bakalari API doesn't provide bulk user endpoints
 * In a real implementation, you would need admin credentials or a different approach
 */
async function fetchBakalariUsers(accessToken: string): Promise<any[]> {
  // Since Bakalari API doesn't provide bulk user endpoints,
  // we'll need to implement this differently in production
  // For now, we'll return an empty array and log this limitation
  console.warn("Bakalari API doesn't provide bulk user endpoints. Manual sync required.")
  return []
}

/**
 * Fetches all classes from Bakalari API
 * Note: This is a simplified implementation since Bakalari API doesn't provide bulk class endpoints
 */
async function fetchBakalariClasses(accessToken: string): Promise<any[]> {
  // Since Bakalari API doesn't provide bulk class endpoints,
  // we'll need to implement this differently in production
  // For now, we'll return an empty array and log this limitation
  console.warn("Bakalari API doesn't provide bulk class endpoints. Manual sync required.")
  return []
}

/**
 * Fetches all subjects from Bakalari API
 */
async function fetchBakalariSubjects(accessToken: string): Promise<any[]> {
  try {
    const subjectsData = await getBakalariSubjectData(accessToken)
    if (!subjectsData || !Array.isArray(subjectsData)) {
      return []
    }
    return subjectsData
  } catch (error) {
    console.error("Error fetching Bakalari subjects:", error)
    return []
  }
}

/**
 * Creates or updates an external reference for idempotent sync
 */
async function upsertExternalRef(
  tx: any,
  type: string,
  externalId: string,
  internalId: string,
  metadata?: any
) {
  return await tx.externalRef.upsert({
    where: {
      type_externalId: {
        type,
        externalId
      }
    },
    update: {
      internalId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      updatedAt: new Date()
    },
    create: {
      type,
      externalId,
      internalId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
    }
  })
}

/**
 * Syncs Bakalari data to our database using external key strategy for idempotency
 */
export async function syncBakalariData(
  bakalariToken: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const runId = crypto.randomUUID()
  const startedAt = new Date()
  
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
    errors: [],
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0
  }

  try {
    // Log sync start
    await logEvent("INFO", "sync_start", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        runId,
        operatorId: options.operatorId,
        startedAt: result.startedAt
      }
    })

    // Fetch data from Bakalari API
    const [bakalariUsers, bakalariClasses, bakalariSubjects] = await Promise.all([
      fetchBakalariUsers(bakalariToken),
      fetchBakalariClasses(bakalariToken),
      fetchBakalariSubjects(bakalariToken)
    ])

    // Process in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Sync classes first (if we have class data)
      if (bakalariClasses.length > 0) {
        for (const bakalariClass of bakalariClasses) {
          try {
            const externalId = bakalariClass.id || bakalariClass.abbrev
            const existingRef = await tx.externalRef.findUnique({
              where: {
                type_externalId: {
                  type: 'class',
                  externalId
                }
              }
            })

            if (existingRef) {
              // Update existing class
              await tx.class.update({
                where: { id: existingRef.internalId },
                data: {
                  name: bakalariClass.abbrev || bakalariClass.name,
                  grade: extractGradeFromClass(bakalariClass.abbrev || bakalariClass.name),
                  updatedAt: new Date()
                }
              })
              result.classesUpdated++
            } else {
              // Create new class
              const newClass = await tx.class.create({
                data: {
                  name: bakalariClass.abbrev || bakalariClass.name,
                  grade: extractGradeFromClass(bakalariClass.abbrev || bakalariClass.name)
                }
              })
              
              // Create external reference
              await upsertExternalRef(tx, 'class', externalId, newClass.id, {
                bakalariClassId: bakalariClass.id,
                bakalariClassAbbrev: bakalariClass.abbrev
              })
              
              result.classesCreated++
            }
          } catch (error) {
            const errorMsg = `Error syncing class ${bakalariClass.abbrev}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            console.error(errorMsg)
          }
        }
      }

      // Sync subjects
      if (bakalariSubjects.length > 0) {
        for (const bakalariSubject of bakalariSubjects) {
          try {
            const externalId = bakalariSubject.id || bakalariSubject.code
            const existingRef = await tx.externalRef.findUnique({
              where: {
                type_externalId: {
                  type: 'subject',
                  externalId
                }
              }
            })

            if (existingRef) {
              // Update existing subject
              await tx.subject.update({
                where: { id: existingRef.internalId },
                data: {
                  name: bakalariSubject.name,
                  code: bakalariSubject.code || bakalariSubject.id,
                  updatedAt: new Date()
                }
              })
              result.subjectsUpdated++
            } else {
              // Create new subject
              const newSubject = await tx.subject.create({
                data: {
                  name: bakalariSubject.name,
                  code: bakalariSubject.code || bakalariSubject.id
                }
              })
              
              // Create external reference
              await upsertExternalRef(tx, 'subject', externalId, newSubject.id, {
                bakalariSubjectId: bakalariSubject.id,
                bakalariSubjectCode: bakalariSubject.code
              })
              
              result.subjectsCreated++
            }
          } catch (error) {
            const errorMsg = `Error syncing subject ${bakalariSubject.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            console.error(errorMsg)
          }
        }
      }

      // Sync users and enrollments
      if (bakalariUsers.length > 0) {
        for (const bakalariUser of bakalariUsers) {
          try {
            const userRole = mapBakalariUserTypeToRole(bakalariUser.userType)
            const externalId = bakalariUser.userID || bakalariUser.id
            
            // Find or create class for students
            let classId: string | undefined
            if (userRole === UserRole.STUDENT && bakalariUser.classAbbrev) {
              const classRef = await tx.externalRef.findFirst({
                where: {
                  type: 'class',
                  externalId: bakalariUser.classId || bakalariUser.classAbbrev
                }
              })
              if (classRef) {
                classId = classRef.internalId
              }
            }

            const existingUserRef = await tx.externalRef.findUnique({
              where: {
                type_externalId: {
                  type: 'user',
                  externalId
                }
              }
            })

            let userId: string
            if (existingUserRef) {
              // Update existing user
              await tx.user.update({
                where: { id: existingUserRef.internalId },
                data: {
                  name: bakalariUser.fullUserName,
                  classId: classId,
                  updatedAt: new Date()
                }
              })
              userId = existingUserRef.internalId
              result.usersUpdated++
            } else {
              // Create new user
              const newUser = await tx.user.create({
                data: {
                  email: `${externalId}@bakalari.local`,
                  name: bakalariUser.fullUserName,
                  role: userRole,
                  bakalariId: externalId,
                  classId: classId
                }
              })
              
              // Create external reference
              await upsertExternalRef(tx, 'user', externalId, newUser.id, {
                bakalariUserId: bakalariUser.userID,
                bakalariUserType: bakalariUser.userType
              })
              
              userId = newUser.id
              result.usersCreated++
            }

            // Handle enrollments for students
            if (userRole === UserRole.STUDENT && bakalariUser.subjects && classId) {
              for (const subjectData of bakalariUser.subjects) {
                try {
                  const subjectExternalId = subjectData.id || subjectData.code
                  const subjectRef = await tx.externalRef.findFirst({
                    where: {
                      type: 'subject',
                      externalId: subjectExternalId
                    }
                  })
                  
                  if (subjectRef) {
                    const enrollmentExternalId = `${userId}-${subjectRef.internalId}`
                    const existingEnrollmentRef = await tx.externalRef.findUnique({
                      where: {
                        type_externalId: {
                          type: 'enrollment',
                          externalId: enrollmentExternalId
                        }
                      }
                    })

                    if (existingEnrollmentRef) {
                      // Update existing enrollment
                      await tx.enrollment.update({
                        where: { id: existingEnrollmentRef.internalId },
                        data: {
                          classId: classId,
                          updatedAt: new Date()
                        }
                      })
                      result.enrollmentsUpdated++
                    } else {
                      // Create new enrollment
                      const newEnrollment = await tx.enrollment.create({
                        data: {
                          userId: userId,
                          subjectId: subjectRef.internalId,
                          classId: classId
                        }
                      })
                      
                      // Create external reference
                      await upsertExternalRef(tx, 'enrollment', enrollmentExternalId, newEnrollment.id, {
                        userId,
                        subjectId: subjectRef.internalId,
                        classId
                      })
                      
                      result.enrollmentsCreated++
                    }
                  }
                } catch (error) {
                  const errorMsg = `Error syncing enrollment for user ${userId}, subject ${subjectData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                  result.errors.push(errorMsg)
                  console.error(errorMsg)
                }
              }
            }
          } catch (error) {
            const errorMsg = `Error syncing user ${bakalariUser.fullUserName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            console.error(errorMsg)
          }
        }
      }
    })

    const completedAt = new Date()
    result.completedAt = completedAt.toISOString()
    result.durationMs = completedAt.getTime() - startedAt.getTime()
    result.success = result.errors.length === 0

    // Log successful sync
    await logEvent("INFO", "sync_ok", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        runId,
        result,
        durationMs: result.durationMs
      }
    })

  } catch (error) {
    const completedAt = new Date()
    result.completedAt = completedAt.toISOString()
    result.durationMs = completedAt.getTime() - startedAt.getTime()
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    result.errors.push(errorMessage)
    
    // Log failed sync
    await logEvent("ERROR", "sync_fail", {
      requestId: options.requestId,
      userId: options.operatorId,
      metadata: {
        runId,
        errors: result.errors,
        durationMs: result.durationMs
      }
    })
  }

  return result
}
