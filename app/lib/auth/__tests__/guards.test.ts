import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  canManageUser, 
  canViewClass 
} from '../guards'
import { UserRole } from '../../generated'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}))

// Mock utils
vi.mock('../../utils', () => ({
  logEvent: vi.fn()
}))

describe('Guard Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canManageUser', () => {
    it('should allow operator to manage all users', () => {
      expect(canManageUser(UserRole.OPERATOR, UserRole.STUDENT)).toBe(true)
      expect(canManageUser(UserRole.OPERATOR, UserRole.TEACHER)).toBe(true)
      expect(canManageUser(UserRole.OPERATOR, UserRole.OPERATOR)).toBe(true)
    })

    it('should allow teacher to manage students', () => {
      expect(canManageUser(UserRole.TEACHER, UserRole.STUDENT)).toBe(true)
    })

    it('should not allow teacher to manage operators', () => {
      expect(canManageUser(UserRole.TEACHER, UserRole.OPERATOR)).toBe(false)
    })

    it('should not allow teacher to manage other teachers', () => {
      expect(canManageUser(UserRole.TEACHER, UserRole.TEACHER)).toBe(false)
    })

    it('should not allow student to manage anyone', () => {
      expect(canManageUser(UserRole.STUDENT, UserRole.STUDENT)).toBe(false)
      expect(canManageUser(UserRole.STUDENT, UserRole.TEACHER)).toBe(false)
      expect(canManageUser(UserRole.STUDENT, UserRole.OPERATOR)).toBe(false)
    })

    it('should allow users to manage themselves', () => {
      expect(canManageUser(UserRole.OPERATOR, UserRole.OPERATOR)).toBe(true)
      expect(canManageUser(UserRole.TEACHER, UserRole.TEACHER)).toBe(false) // Teachers can't manage other teachers
      expect(canManageUser(UserRole.STUDENT, UserRole.STUDENT)).toBe(false) // Students can't manage anyone
    })
  })

  describe('canViewClass', () => {
    it('should allow operator to view any class', () => {
      expect(canViewClass(UserRole.OPERATOR, 'class1', 'class2')).toBe(true)
      expect(canViewClass(UserRole.OPERATOR, undefined, 'class1')).toBe(true)
      expect(canViewClass(UserRole.OPERATOR, 'class1', undefined)).toBe(true)
    })

    it('should allow teacher to view any class (for now)', () => {
      expect(canViewClass(UserRole.TEACHER, 'class1', 'class2')).toBe(true)
      expect(canViewClass(UserRole.TEACHER, undefined, 'class1')).toBe(true)
      expect(canViewClass(UserRole.TEACHER, 'class1', undefined)).toBe(true)
    })

    it('should allow student to view their own class', () => {
      expect(canViewClass(UserRole.STUDENT, 'class1', 'class1')).toBe(true)
    })

    it('should not allow student to view other classes', () => {
      expect(canViewClass(UserRole.STUDENT, 'class1', 'class2')).toBe(false)
    })

    it('should not allow student to view class when they have no class', () => {
      expect(canViewClass(UserRole.STUDENT, undefined, 'class1')).toBe(false)
    })

    it('should not allow student to view class when target class is undefined', () => {
      expect(canViewClass(UserRole.STUDENT, 'class1', undefined)).toBe(false)
    })

    it('should handle case sensitivity correctly', () => {
      expect(canViewClass(UserRole.STUDENT, 'Class1', 'class1')).toBe(false)
      expect(canViewClass(UserRole.STUDENT, 'class1', 'Class1')).toBe(false)
    })
  })
})
