import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { UserRole } from "@/app/lib/generated"
import { ApiResponseHandler } from "./response"

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: UserRole
  classId?: string
}

export interface GuardResult {
  success: true
  user: AuthenticatedUser
  requestId: string
}

export interface GuardError {
  success: false
  response: Response
  requestId: string
}

export type GuardResponse = GuardResult | GuardError

export async function requireAuth(request: NextRequest): Promise<GuardResponse> {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return {
        success: false,
        response: ApiResponseHandler.unauthorized(requestId),
        requestId,
      }
    }

    return {
      success: true,
      user: session.user as AuthenticatedUser,
      requestId,
    }
  } catch (error) {
    console.error("Auth guard error:", error)
    return {
      success: false,
      response: ApiResponseHandler.internalError(requestId),
      requestId,
    }
  }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<GuardResponse> {
  const authResult = await requireAuth(request)

  if (!authResult.success) {
    return authResult
  }

  const { user, requestId } = authResult

  if (!allowedRoles.includes(user.role)) {
    return {
      success: false,
      response: ApiResponseHandler.forbidden(requestId),
      requestId,
    }
  }

  return authResult
}

export async function requireTeacher(request: NextRequest): Promise<GuardResponse> {
  return requireRole(request, [UserRole.TEACHER, UserRole.OPERATOR])
}

export async function requireOperator(request: NextRequest): Promise<GuardResponse> {
  return requireRole(request, [UserRole.OPERATOR])
}

export async function requireStudent(request: NextRequest): Promise<GuardResponse> {
  return requireRole(request, [UserRole.STUDENT])
}

export function withAuth<T extends unknown[], R>(
  handler: (user: AuthenticatedUser, request: NextRequest, ...args: T) => Promise<R>
) {
  return async (request: NextRequest, ...args: T): Promise<R> => {
    const authResult = await requireAuth(request)

    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.response.status}`)
    }

    return handler(authResult.user, request, ...args) as R
  }
}

export function withRole<T extends unknown[], R>(
  allowedRoles: UserRole[],
  handler: (user: AuthenticatedUser, request: NextRequest, ...args: T) => Promise<R>
) {
  return async (request: NextRequest, ...args: T): Promise<R> => {
    const authResult = await requireRole(request, allowedRoles)

    if (!authResult.success) {
      // Return the response directly instead of throwing
      return authResult.response as R
    }

    return handler(authResult.user, request, ...args) as R
  }
}
