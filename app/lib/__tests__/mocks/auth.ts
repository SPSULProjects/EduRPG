/**
 * Mock authentication utilities for testing
 */

import { vi } from "vitest"
import { NextRequest } from "next/server"
import { UserRole } from "@/app/lib/generated"

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    classId?: string
    bakalariToken?: string
  }
  expires: string
}

export const mockSessions: Record<string, MockSession> = {
  student: {
    user: {
      id: "student1",
      email: "jan.novak@school.cz",
      name: "Jan Novák",
      role: UserRole.STUDENT,
      classId: "class1"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  teacher: {
    user: {
      id: "teacher1",
      email: "petr.dvorak@school.cz", 
      name: "Petr Dvořák",
      role: UserRole.TEACHER
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  operator: {
    user: {
      id: "operator1",
      email: "admin@school.cz",
      name: "Admin Admin", 
      role: UserRole.OPERATOR,
      bakalariToken: "mock_token_operator1"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

export function createMockRequest(
  method: string = "GET",
  url: string = "http://localhost:3000/api/test",
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(url, requestInit)
}

export function mockGetServerSession(role: keyof typeof mockSessions) {
  return vi.fn().mockResolvedValue(mockSessions[role])
}

export function mockGetServerSessionUnauthorized() {
  return vi.fn().mockResolvedValue(null)
}

export function mockRequireStudent() {
  return vi.fn().mockResolvedValue(mockSessions.student.user)
}

export function mockRequireTeacher() {
  return vi.fn().mockResolvedValue(mockSessions.teacher.user)
}

export function mockRequireOperator() {
  return vi.fn().mockResolvedValue(mockSessions.operator.user)
}

export function mockRequireRoleForbidden() {
  return vi.fn().mockRejectedValue(new Error("Forbidden"))
}
