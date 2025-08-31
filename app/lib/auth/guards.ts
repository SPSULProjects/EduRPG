import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../auth'
import { UserRole } from '../generated'
import { logEvent } from '../utils'
import { checkRouteAccess, hasResourceAccess } from './policies'

/**
 * Server guard utility for protecting server actions and API routes
 */

/**
 * Require authentication and return the current user
 * Redirects to signin if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }
  return session.user
}

/**
 * Require specific roles for access
 * Redirects to unauthorized if user doesn't have required roles
 */
export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    await logEvent('WARN', 'rbac_deny', {
      metadata: {
        userRole: user.role,
        requiredRoles: roles,
        reason: 'Insufficient permissions for server action'
      }
    })
    redirect('/unauthorized')
  }
  return user
}

/**
 * Require operator role
 */
export async function requireOperator() {
  return requireRole([UserRole.OPERATOR])
}

/**
 * Require teacher or operator role
 */
export async function requireTeacher() {
  return requireRole([UserRole.TEACHER, UserRole.OPERATOR])
}

/**
 * Require any authenticated user (student, teacher, or operator)
 */
export async function requireAnyUser() {
  return requireRole([UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR])
}

/**
 * Check if user has access to a specific resource type
 * Returns boolean without redirecting
 */
export async function checkResourceAccess(resourceType: string): Promise<boolean> {
  const user = await getServerSession(authOptions)
  if (!user?.user) {
    return false
  }
  return hasResourceAccess(user.user.role, resourceType)
}

/**
 * Guard function that checks route access and logs denies
 * Returns user if access is allowed, throws error if not
 */
export async function guardRoute(path: string) {
  const session = await getServerSession(authOptions)
  const userRole = session?.user?.role
  
  const policyResult = checkRouteAccess(path, userRole)
  
  if (!policyResult.allowed) {
    await logEvent('WARN', 'rbac_deny', {
      metadata: {
        path,
        userRole: userRole || 'unauthenticated',
        requiredRoles: policyResult.requiredRoles,
        reason: policyResult.reason
      }
    })
    
    throw new Error('Access denied')
  }
  
  return session!.user
}

/**
 * Guard function for API routes that returns proper HTTP responses
 * Use this in API route handlers
 */
export async function guardApiRoute(path: string) {
  const session = await getServerSession(authOptions)
  const userRole = session?.user?.role
  
  const policyResult = checkRouteAccess(path, userRole)
  
  if (!policyResult.allowed) {
    await logEvent('WARN', 'rbac_deny', {
      metadata: {
        path,
        userRole: userRole || 'unauthenticated',
        requiredRoles: policyResult.requiredRoles,
        reason: policyResult.reason
      }
    })
    
    return {
      error: true,
      status: 403,
      body: { code: 'FORBIDDEN', message: 'Access denied' }
    }
  }
  
  return {
    error: false,
    user: session!.user
  }
}

/**
 * Higher-order function to wrap server actions with role requirements
 */
export function withRoleGuard<T extends any[], R>(
  roles: UserRole[],
  action: (user: any, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const user = await requireRole(roles)
    return action(user, ...args)
  }
}

/**
 * Higher-order function to wrap server actions with resource access check
 */
export function withResourceGuard<T extends any[], R>(
  resourceType: string,
  action: (user: any, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const user = await requireAuth()
    const hasAccess = hasResourceAccess(user.role, resourceType)
    
    if (!hasAccess) {
      await logEvent('WARN', 'rbac_deny', {
        metadata: {
          resourceType,
          userRole: user.role,
          reason: 'Insufficient permissions for resource access'
        }
      })
      throw new Error('Access denied')
    }
    
    return action(user, ...args)
  }
}

/**
 * Check if current user can manage another user based on role hierarchy
 */
export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.OPERATOR]: 3,
    [UserRole.TEACHER]: 2,
    [UserRole.STUDENT]: 1
  }
  
  return roleHierarchy[currentUserRole] >= roleHierarchy[targetUserRole]
}

/**
 * Check if current user can view a specific class
 */
export function canViewClass(
  currentUserRole: UserRole, 
  currentUserClassId?: string, 
  targetClassId?: string
): boolean {
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
