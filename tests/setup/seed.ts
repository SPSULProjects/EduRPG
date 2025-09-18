/**
 * Seed data for Playwright E2E tests
 * Provides test users and data for consistent E2E testing
 */

import { PrismaClient } from '@prisma/client'
import { UserRole } from '@/app/lib/generated'

const prisma = new PrismaClient()

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  classId?: string
  bakalariId: string
  bakalariToken: string
}

export interface TestClass {
  id: string
  name: string
  grade: number
}

export interface TestSubject {
  id: string
  name: string
  abbreviation: string
}

export const testUsers: TestUser[] = [
  {
    id: "test-student-1",
    email: "jan.novak@test.school.cz",
    name: "Jan Novák",
    role: UserRole.STUDENT,
    classId: "test-class-1",
    bakalariId: "student1",
    bakalariToken: "test_token_student1"
  },
  {
    id: "test-student-2",
    email: "marie.svobodova@test.school.cz",
    name: "Marie Svobodová",
    role: UserRole.STUDENT,
    classId: "test-class-1",
    bakalariId: "student2",
    bakalariToken: "test_token_student2"
  },
  {
    id: "test-teacher-1",
    email: "petr.dvorak@test.school.cz",
    name: "Petr Dvořák",
    role: UserRole.TEACHER,
    bakalariId: "teacher1",
    bakalariToken: "test_token_teacher1"
  },
  {
    id: "test-operator-1",
    email: "admin@test.school.cz",
    name: "Admin Admin",
    role: UserRole.OPERATOR,
    bakalariId: "operator1",
    bakalariToken: "test_token_operator1"
  }
]

export const testClasses: TestClass[] = [
  {
    id: "test-class-1",
    name: "1A",
    grade: 1
  },
  {
    id: "test-class-2",
    name: "2B",
    grade: 2
  }
]

export const testSubjects: TestSubject[] = [
  {
    id: "test-subject-1",
    name: "Matematika",
    abbreviation: "MAT"
  },
  {
    id: "test-subject-2",
    name: "Český jazyk",
    abbreviation: "CJ"
  },
  {
    id: "test-subject-3",
    name: "Anglický jazyk",
    abbreviation: "AJ"
  }
]

export const testJobs = [
  {
    id: "test-job-1",
    title: "Test Matematika Job",
    description: "Test job for mathematics",
    subjectId: "test-subject-1",
    teacherId: "test-teacher-1",
    xpReward: 100,
    moneyReward: 50,
    maxStudents: 2,
    status: "OPEN" as const
  },
  {
    id: "test-job-2",
    title: "Test Český jazyk Job",
    description: "Test job for Czech language",
    subjectId: "test-subject-2",
    teacherId: "test-teacher-1",
    xpReward: 80,
    moneyReward: 40,
    maxStudents: 1,
    status: "OPEN" as const
  }
]

export const testItems = [
  {
    id: "test-item-1",
    name: "Test Item 1",
    description: "A test item for the shop",
    price: 100,
    rarity: "COMMON" as const,
    isActive: true
  },
  {
    id: "test-item-2",
    name: "Test Item 2",
    description: "Another test item",
    price: 200,
    rarity: "RARE" as const,
    isActive: true
  }
]

export const testEvents = [
  {
    id: "test-event-1",
    title: "Test Event 1",
    description: "A test event",
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
    xpBonus: 50,
    rarityReward: "COMMON" as const,
    isActive: true
  }
]

/**
 * Seeds the test database with test data
 */
export async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...')

    // Clean existing test data
    await cleanupTestData()

    // Create test classes
    for (const testClass of testClasses) {
      await prisma.class.create({
        data: {
          id: testClass.id,
          name: testClass.name,
          grade: testClass.grade
        }
      })
    }
    console.log(`✅ Created ${testClasses.length} test classes`)

    // Create test subjects
    for (const testSubject of testSubjects) {
      await prisma.subject.create({
        data: {
          id: testSubject.id,
          name: testSubject.name,
          abbreviation: testSubject.abbreviation
        }
      })
    }
    console.log(`✅ Created ${testSubjects.length} test subjects`)

    // Create test users
    for (const testUser of testUsers) {
      await prisma.user.create({
        data: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
          classId: testUser.classId,
          bakalariId: testUser.bakalariId,
          bakalariToken: testUser.bakalariToken
        }
      })
    }
    console.log(`✅ Created ${testUsers.length} test users`)

    // Create user-class-subject enrollments for students
    const students = testUsers.filter(u => u.role === UserRole.STUDENT)
    for (const student of students) {
      for (const subject of testSubjects) {
        await prisma.userClassSubject.create({
          data: {
            userId: student.id,
            classId: student.classId!,
            subjectId: subject.id
          }
        })
      }
    }
    console.log(`✅ Created enrollments for ${students.length} students`)

    // Create test jobs
    for (const testJob of testJobs) {
      await prisma.job.create({
        data: {
          id: testJob.id,
          title: testJob.title,
          description: testJob.description,
          subjectId: testJob.subjectId,
          teacherId: testJob.teacherId,
          xpReward: testJob.xpReward,
          moneyReward: testJob.moneyReward,
          maxStudents: testJob.maxStudents,
          status: testJob.status
        }
      })
    }
    console.log(`✅ Created ${testJobs.length} test jobs`)

    // Create test items
    for (const testItem of testItems) {
      await prisma.item.create({
        data: {
          id: testItem.id,
          name: testItem.name,
          description: testItem.description,
          price: testItem.price,
          rarity: testItem.rarity,
          isActive: testItem.isActive
        }
      })
    }
    console.log(`✅ Created ${testItems.length} test items`)

    // Create test events
    for (const testEvent of testEvents) {
      await prisma.event.create({
        data: {
          id: testEvent.id,
          title: testEvent.title,
          description: testEvent.description,
          startsAt: testEvent.startsAt,
          endsAt: testEvent.endsAt,
          xpBonus: testEvent.xpBonus,
          rarityReward: testEvent.rarityReward,
          isActive: testEvent.isActive
        }
      })
    }
    console.log(`✅ Created ${testEvents.length} test events`)

    // Give students some initial XP and money
    for (const student of students) {
      // Add some XP
      await prisma.moneyTx.create({
        data: {
          userId: student.id,
          amount: 1000, // Starting money
          type: 'GRANT',
          reason: 'Initial test balance'
        }
      })

      // Add some XP grants
      await prisma.xpGrant.create({
        data: {
          studentId: student.id,
          subjectId: testSubjects[0]?.id,
          amount: 100,
          reason: 'Initial test XP',
          grantedBy: testUsers.find(u => u.role === UserRole.TEACHER)!.id
        }
      })
    }
    console.log(`✅ Added initial XP and money for ${students.length} students`)

    console.log('🎉 Test data seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

/**
 * Cleans up test data from the database
 */
export async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...')

    // Delete in reverse order of dependencies
    await prisma.xpGrant.deleteMany({
      where: {
        OR: [
          { studentId: { startsWith: 'test-' } },
          { grantedBy: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.moneyTx.deleteMany({
      where: {
        userId: { startsWith: 'test-' }
      }
    })

    await prisma.purchase.deleteMany({
      where: {
        OR: [
          { studentId: { startsWith: 'test-' } },
          { itemId: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.jobAssignment.deleteMany({
      where: {
        OR: [
          { jobId: { startsWith: 'test-' } },
          { studentId: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.job.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    await prisma.event.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    await prisma.item.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    await prisma.userClassSubject.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: 'test-' } },
          { classId: { startsWith: 'test-' } },
          { subjectId: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.user.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    await prisma.subject.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    await prisma.class.deleteMany({
      where: {
        id: { startsWith: 'test-' }
      }
    })

    console.log('✅ Test data cleanup completed')
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error)
    throw error
  }
}

/**
 * Gets a test user by role
 */
export function getTestUser(role: UserRole): TestUser | undefined {
  return testUsers.find(user => user.role === role)
}

/**
 * Gets all test users by role
 */
export function getTestUsers(role: UserRole): TestUser[] {
  return testUsers.filter(user => user.role === role)
}

/**
 * Gets test credentials for a user
 */
export function getTestCredentials(userId: string): { username: string; password: string } {
  const user = testUsers.find(u => u.id === userId)
  if (!user) {
    throw new Error(`Test user with ID ${userId} not found`)
  }

  // For testing, we use the email as username and a simple password
  return {
    username: user.email,
    password: 'testpassword123'
  }
}

/**
 * Closes the Prisma connection
 */
export async function closePrismaConnection() {
  await prisma.$disconnect()
}

// Export the prisma instance for direct use if needed
export { prisma }
