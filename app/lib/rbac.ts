import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "./auth"
import { UserRole } from "./generated"
import { logEvent } from "./utils"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return null
  }
  return session.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/signin")
  }
  return user
}

export async function requireRole(roles: UserRole[], requestId?: string) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    await logEvent('WARN', 'rbac_deny', {
      requestId,
      userId: user.id,
      metadata: {
        userRole: user.role,
        requiredRoles: roles,
        reason: 'Insufficient permissions for server action'
      }
    })
    redirect("/unauthorized")
  }
  return user
}

export async function requireOperator(requestId?: string) {
  return requireRole([UserRole.OPERATOR], requestId)
}

export async function requireTeacher(requestId?: string) {
  return requireRole([UserRole.TEACHER, UserRole.OPERATOR], requestId)
}

export async function requireStudent(requestId?: string) {
  return requireRole([UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR], requestId)
}

export function canAccessResource(userRole: UserRole, resourceRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.OPERATOR]: 3,
    [UserRole.TEACHER]: 2,
    [UserRole.STUDENT]: 1
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[resourceRole]
}

export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  return canAccessResource(currentUserRole, targetUserRole)
}

export function canViewClass(currentUserRole: UserRole, currentUserClassId?: string, targetClassId?: string): boolean {
  // Operators can view all classes
  if (currentUserRole === UserRole.OPERATOR) {
    return true
  }
  
  // Teachers can view their own class and classes they teach
  if (currentUserRole === UserRole.TEACHER) {
    return true // TODO: Implement teacher-class relationship
  }
  
  // Students can only view their own class
  if (currentUserRole === UserRole.STUDENT) {
    return currentUserClassId === targetClassId
  }
  
  return false
}
