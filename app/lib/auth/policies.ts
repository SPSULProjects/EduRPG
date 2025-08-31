import { UserRole } from '../generated'

export interface RoutePolicy {
  pattern: RegExp
  roles: UserRole[]
  description: string
}

export interface PolicyResult {
  allowed: boolean
  requiredRoles: UserRole[]
  userRole?: UserRole
  reason?: string
}

/**
 * Route policies defining access control for different paths
 * Format: { pattern: RegExp, roles: UserRole[], description: string }
 */
export const routePolicies: RoutePolicy[] = [
  // Admin routes - Operator only
  {
    pattern: /^\/admin(\/.*)?$/,
    roles: [UserRole.OPERATOR],
    description: 'Admin panel access'
  },
  
  // Sync routes - Operator only
  {
    pattern: /^\/api\/sync\/bakalari(\/.*)?$/,
    roles: [UserRole.OPERATOR],
    description: 'Bakalari sync operations'
  },
  
  // Item management - Operator only
  {
    pattern: /^\/api\/items(\/.*)?$/,
    roles: [UserRole.OPERATOR],
    description: 'Item management operations'
  },
  
  // Achievement management - Operator only
  {
    pattern: /^\/api\/achievements(\/.*)?$/,
    roles: [UserRole.OPERATOR],
    description: 'Achievement management operations'
  },
  
  // Event management - Operator only
  {
    pattern: /^\/api\/events(\/.*)?$/,
    roles: [UserRole.OPERATOR],
    description: 'Event management operations'
  },
  
  // XP operations - Teachers and Operators
  {
    pattern: /^\/api\/xp\/grant$/,
    roles: [UserRole.TEACHER, UserRole.OPERATOR],
    description: 'XP granting operations'
  },
  
  // Teacher budget - Teachers and Operators
  {
    pattern: /^\/api\/teacher\/budget(\/.*)?$/,
    roles: [UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Teacher budget operations'
  },
  
  // Job review operations - Teachers and Operators
  {
    pattern: /^\/api\/jobs\/\d+\/review$/,
    roles: [UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Job review operations'
  },
  
  // Job close operations - Teachers and Operators
  {
    pattern: /^\/api\/jobs\/\d+\/close$/,
    roles: [UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Job close operations'
  },
  
  // Public routes - All authenticated users
  {
    pattern: /^\/api\/health$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Health check endpoint'
  },
  
  // Shop routes - All authenticated users
  {
    pattern: /^\/api\/shop(\/.*)?$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Shop operations'
  },
  
  // Job application routes - All authenticated users
  {
    pattern: /^\/api\/jobs\/\d+\/apply$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Job application operations'
  },
  
  // Job listing routes - All authenticated users
  {
    pattern: /^\/api\/jobs(\/.*)?$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Job listing operations'
  },
  
  // Class jobs routes - All authenticated users
  {
    pattern: /^\/api\/classes\/\d+\/jobs$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Class jobs operations'
  },
  
  // Event participation - All authenticated users
  {
    pattern: /^\/api\/events\/\d+\/participate$/,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    description: 'Event participation operations'
  }
]

/**
 * Check if a user with the given role can access a specific route
 */
export function checkRouteAccess(path: string, userRole?: UserRole): PolicyResult {
  // Find matching policy
  const matchingPolicy = routePolicies.find(policy => policy.pattern.test(path))
  
  if (!matchingPolicy) {
    // No policy found - deny access by default
    return {
      allowed: false,
      requiredRoles: [],
      userRole,
      reason: 'No policy defined for route'
    }
  }
  
  if (!userRole) {
    return {
      allowed: false,
      requiredRoles: matchingPolicy.roles,
      reason: 'User not authenticated'
    }
  }
  
  const hasAccess = matchingPolicy.roles.includes(userRole)
  
  return {
    allowed: hasAccess,
    requiredRoles: matchingPolicy.roles,
    userRole,
    reason: hasAccess ? undefined : 'Insufficient permissions'
  }
}

/**
 * Get all policies for a specific role
 */
export function getPoliciesForRole(role: UserRole): RoutePolicy[] {
  return routePolicies.filter(policy => policy.roles.includes(role))
}

/**
 * Get all routes accessible by a specific role
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  return routePolicies
    .filter(policy => policy.roles.includes(role))
    .map(policy => policy.pattern.source.replace(/\\\//g, '/').replace(/\(\/\.\*\)\?\$/g, ''))
}

/**
 * Check if a role has access to a specific resource type
 */
export function hasResourceAccess(userRole: UserRole, resourceType: string): boolean {
  const resourcePolicies: Record<string, UserRole[]> = {
    admin: [UserRole.OPERATOR],
    sync: [UserRole.OPERATOR],
    items: [UserRole.OPERATOR],
    achievements: [UserRole.OPERATOR],
    events: [UserRole.OPERATOR],
    xp: [UserRole.TEACHER, UserRole.OPERATOR],
    budget: [UserRole.TEACHER, UserRole.OPERATOR],
    jobs: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    shop: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR],
    health: [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR]
  }
  
  return resourcePolicies[resourceType]?.includes(userRole) ?? false
}
