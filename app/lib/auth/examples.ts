// Examples of how to use the RBAC guards

import { 
  requireAuth, 
  requireRole, 
  requireOperator, 
  requireTeacher,
  withRoleGuard,
  withResourceGuard,
  guardRoute,
  guardApiRoute 
} from './guards'
import { UserRole } from '../generated'

// Example 1: Basic role requirement
export async function createJob(userId: string, jobData: any) {
  // Require teacher or operator role
  const user = await requireTeacher()
  
  // Now you can safely use the user object
  console.log(`Creating job for user ${user.id} with role ${user.role}`)
  
  // Your job creation logic here...
  return { success: true, jobId: '123' }
}

// Example 2: Using withRoleGuard higher-order function
export const createAchievement = withRoleGuard(
  [UserRole.OPERATOR], // Only operators can create achievements
  async (user, achievementData: any) => {
    console.log(`Operator ${user.id} creating achievement`)
    // Your achievement creation logic here...
    return { success: true, achievementId: '456' }
  }
)

// Example 3: Using withResourceGuard
export const grantXP = withResourceGuard(
  'xp', // Check if user has access to XP resource
  async (user, studentId: string, amount: number) => {
    console.log(`User ${user.id} granting ${amount} XP to student ${studentId}`)
    // Your XP granting logic here...
    return { success: true, xpGranted: amount }
  }
)

// Example 4: Server action with multiple role options
export async function manageUsers(action: 'create' | 'update' | 'delete', userData: any) {
  let requiredRoles: UserRole[]
  
  switch (action) {
    case 'create':
      requiredRoles = [UserRole.OPERATOR] // Only operators can create users
      break
    case 'update':
      requiredRoles = [UserRole.TEACHER, UserRole.OPERATOR] // Teachers and operators can update
      break
    case 'delete':
      requiredRoles = [UserRole.OPERATOR] // Only operators can delete
      break
    default:
      throw new Error('Invalid action')
  }
  
  const user = await requireRole(requiredRoles)
  console.log(`User ${user.id} performing ${action} action`)
  
  // Your user management logic here...
  return { success: true, action }
}

// Example 5: API route handler using guardApiRoute
export async function handleApiRequest(path: string, method: string, body?: any) {
  // Check route access
  const guardResult = await guardApiRoute(path)
  if (guardResult.error) {
    return {
      status: guardResult.status,
      body: guardResult.body
    }
  }
  
  const { user } = guardResult
  
  // Handle different HTTP methods
  switch (method) {
    case 'GET':
      return { status: 200, body: { message: 'Data retrieved', user: user?.id } }
    case 'POST':
      return { status: 201, body: { message: 'Data created', user: user?.id } }
    case 'PUT':
      return { status: 200, body: { message: 'Data updated', user: user?.id } }
    case 'DELETE':
      return { status: 200, body: { message: 'Data deleted', user: user?.id } }
    default:
      return { status: 405, body: { error: 'Method not allowed' } }
  }
}

// Example 6: Page component with route guard
export async function AdminPage() {
  // This will redirect to /unauthorized if user is not an operator
  const user = await requireOperator()
  
  return {
    user,
    // Your page data here...
  }
}

// Example 7: Conditional access based on user role
export async function getDashboardData() {
  const user = await requireAuth() // Just require authentication
  
  switch (user.role) {
    case UserRole.OPERATOR:
      return {
        type: 'operator',
        data: await getOperatorData()
      }
    case UserRole.TEACHER:
      return {
        type: 'teacher',
        data: await getTeacherData(user.id)
      }
    case UserRole.STUDENT:
      return {
        type: 'student',
        data: await getStudentData(user.id)
      }
    default:
      throw new Error('Unknown user role')
  }
}

// Mock functions for examples
async function getOperatorData() {
  return { allUsers: [], allClasses: [], systemStats: {} }
}

async function getTeacherData(teacherId: string) {
  return { students: [], classes: [], budget: {} }
}

async function getStudentData(studentId: string) {
  return { jobs: [], xp: 0, achievements: [] }
}
