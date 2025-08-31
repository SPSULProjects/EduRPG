import { describe, it, expect } from 'vitest'
import { 
  checkRouteAccess, 
  getPoliciesForRole, 
  getAccessibleRoutes, 
  hasResourceAccess,
  routePolicies,
  type RoutePolicy,
  type PolicyResult 
} from '../policies'
import { UserRole } from '../../generated'

describe('Route Policies', () => {
  describe('checkRouteAccess', () => {
    it('should allow operator access to admin routes', () => {
      const result = checkRouteAccess('/admin', UserRole.OPERATOR)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
      expect(result.userRole).toBe(UserRole.OPERATOR)
    })

    it('should deny student access to admin routes', () => {
      const result = checkRouteAccess('/admin', UserRole.STUDENT)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
      expect(result.userRole).toBe(UserRole.STUDENT)
      expect(result.reason).toBe('Insufficient permissions')
    })

    it('should deny unauthenticated access to admin routes', () => {
      const result = checkRouteAccess('/admin', undefined)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
      expect(result.userRole).toBeUndefined()
      expect(result.reason).toBe('User not authenticated')
    })

    it('should allow operator access to sync routes', () => {
      const result = checkRouteAccess('/api/sync/bakalari', UserRole.OPERATOR)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
    })

    it('should deny teacher access to sync routes', () => {
      const result = checkRouteAccess('/api/sync/bakalari', UserRole.TEACHER)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
    })

    it('should allow teacher access to XP grant routes', () => {
      const result = checkRouteAccess('/api/xp/grant', UserRole.TEACHER)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.TEACHER, UserRole.OPERATOR])
    })

    it('should allow operator access to XP grant routes', () => {
      const result = checkRouteAccess('/api/xp/grant', UserRole.OPERATOR)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.TEACHER, UserRole.OPERATOR])
    })

    it('should deny student access to XP grant routes', () => {
      const result = checkRouteAccess('/api/xp/grant', UserRole.STUDENT)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([UserRole.TEACHER, UserRole.OPERATOR])
    })

    it('should allow all authenticated users access to health endpoint', () => {
      const roles = [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR]
      roles.forEach(role => {
        const result = checkRouteAccess('/api/health', role)
        expect(result.allowed).toBe(true)
        expect(result.requiredRoles).toEqual([UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR])
      })
    })

    it('should allow all authenticated users access to shop routes', () => {
      const roles = [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR]
      roles.forEach(role => {
        const result = checkRouteAccess('/api/shop', role)
        expect(result.allowed).toBe(true)
        expect(result.requiredRoles).toEqual([UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR])
      })
    })

    it('should allow all authenticated users access to job application routes', () => {
      const roles = [UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR]
      roles.forEach(role => {
        const result = checkRouteAccess('/api/jobs/123/apply', role)
        expect(result.allowed).toBe(true)
        expect(result.requiredRoles).toEqual([UserRole.STUDENT, UserRole.TEACHER, UserRole.OPERATOR])
      })
    })

    it('should allow teachers and operators access to job review routes', () => {
      const allowedRoles = [UserRole.TEACHER, UserRole.OPERATOR]
      allowedRoles.forEach(role => {
        const result = checkRouteAccess('/api/jobs/123/review', role)
        expect(result.allowed).toBe(true)
        expect(result.requiredRoles).toEqual([UserRole.TEACHER, UserRole.OPERATOR])
      })
    })

    it('should deny students access to job review routes', () => {
      const result = checkRouteAccess('/api/jobs/123/review', UserRole.STUDENT)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([UserRole.TEACHER, UserRole.OPERATOR])
    })

    it('should deny access to undefined routes', () => {
      const result = checkRouteAccess('/api/undefined/route', UserRole.OPERATOR)
      expect(result.allowed).toBe(false)
      expect(result.requiredRoles).toEqual([])
      expect(result.reason).toBe('No policy defined for route')
    })

    it('should handle nested admin routes', () => {
      const result = checkRouteAccess('/admin/users/123', UserRole.OPERATOR)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
    })

    it('should handle nested sync routes', () => {
      const result = checkRouteAccess('/api/sync/bakalari/status', UserRole.OPERATOR)
      expect(result.allowed).toBe(true)
      expect(result.requiredRoles).toEqual([UserRole.OPERATOR])
    })
  })

  describe('getPoliciesForRole', () => {
    it('should return all policies for operator', () => {
      const policies = getPoliciesForRole(UserRole.OPERATOR)
      expect(policies.length).toBeGreaterThan(0)
      policies.forEach(policy => {
        expect(policy.roles).toContain(UserRole.OPERATOR)
      })
    })

    it('should return policies for teacher', () => {
      const policies = getPoliciesForRole(UserRole.TEACHER)
      expect(policies.length).toBeGreaterThan(0)
      policies.forEach(policy => {
        expect(policy.roles).toContain(UserRole.TEACHER)
      })
    })

    it('should return policies for student', () => {
      const policies = getPoliciesForRole(UserRole.STUDENT)
      expect(policies.length).toBeGreaterThan(0)
      policies.forEach(policy => {
        expect(policy.roles).toContain(UserRole.STUDENT)
      })
    })
  })

  describe('getAccessibleRoutes', () => {
    it('should return accessible routes for operator', () => {
      const routes = getAccessibleRoutes(UserRole.OPERATOR)
      expect(routes.length).toBeGreaterThan(0)
      expect(routes).toContain('^/admin')
      expect(routes).toContain('^/api/sync/bakalari')
    })

    it('should return accessible routes for teacher', () => {
      const routes = getAccessibleRoutes(UserRole.TEACHER)
      expect(routes.length).toBeGreaterThan(0)
      expect(routes).toContain('^/api/xp/grant$')
      expect(routes).toContain('^/api/teacher/budget')
    })

    it('should return accessible routes for student', () => {
      const routes = getAccessibleRoutes(UserRole.STUDENT)
      expect(routes.length).toBeGreaterThan(0)
      expect(routes).toContain('^/api/health$')
      expect(routes).toContain('^/api/shop')
    })
  })

  describe('hasResourceAccess', () => {
    it('should allow operator access to all resources', () => {
      const resources = ['admin', 'sync', 'items', 'achievements', 'events', 'xp', 'budget', 'jobs', 'shop', 'health']
      resources.forEach(resource => {
        expect(hasResourceAccess(UserRole.OPERATOR, resource)).toBe(true)
      })
    })

    it('should allow teacher access to appropriate resources', () => {
      expect(hasResourceAccess(UserRole.TEACHER, 'xp')).toBe(true)
      expect(hasResourceAccess(UserRole.TEACHER, 'budget')).toBe(true)
      expect(hasResourceAccess(UserRole.TEACHER, 'jobs')).toBe(true)
      expect(hasResourceAccess(UserRole.TEACHER, 'shop')).toBe(true)
      expect(hasResourceAccess(UserRole.TEACHER, 'health')).toBe(true)
    })

    it('should deny teacher access to operator-only resources', () => {
      expect(hasResourceAccess(UserRole.TEACHER, 'admin')).toBe(false)
      expect(hasResourceAccess(UserRole.TEACHER, 'sync')).toBe(false)
      expect(hasResourceAccess(UserRole.TEACHER, 'items')).toBe(false)
      expect(hasResourceAccess(UserRole.TEACHER, 'achievements')).toBe(false)
      expect(hasResourceAccess(UserRole.TEACHER, 'events')).toBe(false)
    })

    it('should allow student access to appropriate resources', () => {
      expect(hasResourceAccess(UserRole.STUDENT, 'jobs')).toBe(true)
      expect(hasResourceAccess(UserRole.STUDENT, 'shop')).toBe(true)
      expect(hasResourceAccess(UserRole.STUDENT, 'health')).toBe(true)
    })

    it('should deny student access to restricted resources', () => {
      expect(hasResourceAccess(UserRole.STUDENT, 'admin')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'sync')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'items')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'achievements')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'events')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'xp')).toBe(false)
      expect(hasResourceAccess(UserRole.STUDENT, 'budget')).toBe(false)
    })

    it('should deny access to undefined resources', () => {
      expect(hasResourceAccess(UserRole.OPERATOR, 'undefined')).toBe(false)
    })
  })

  describe('routePolicies structure', () => {
    it('should have valid policy structure', () => {
      routePolicies.forEach(policy => {
        expect(policy).toHaveProperty('pattern')
        expect(policy).toHaveProperty('roles')
        expect(policy).toHaveProperty('description')
        expect(Array.isArray(policy.roles)).toBe(true)
        expect(policy.roles.length).toBeGreaterThan(0)
        expect(typeof policy.description).toBe('string')
        expect(policy.description.length).toBeGreaterThan(0)
      })
    })

    it('should have unique patterns', () => {
      const patterns = routePolicies.map(p => p.pattern.source)
      const uniquePatterns = new Set(patterns)
      expect(uniquePatterns.size).toBe(patterns.length)
    })

    it('should have valid role values', () => {
      const validRoles = Object.values(UserRole)
      routePolicies.forEach(policy => {
        policy.roles.forEach(role => {
          expect(validRoles).toContain(role)
        })
      })
    })
  })
})
