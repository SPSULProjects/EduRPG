import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRouteAccess } from './app/lib/auth/policies'
import { UserRole } from './app/lib/generated'

// Simple logging function for middleware (Edge Runtime compatible)
function logMiddlewareEvent(level: string, message: string, metadata: Record<string, any> = {}) {
  console.log(`[${level}] ${message}`, {
    timestamp: new Date().toISOString(),
    ...metadata
  })
}

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  // Add requestId to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  
  // Get the pathname for route checking
  const pathname = request.nextUrl.pathname
  
  // Skip auth check for public routes
  const publicRoutes = ['/api/auth', '/api/health', '/auth', '/favicon.ico']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (!isPublicRoute) {
    // Get JWT token for authentication
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    // Check route access based on policies
    const userRole = token?.role as UserRole | undefined
    const policyResult = checkRouteAccess(pathname, userRole)
    
    if (!policyResult.allowed) {
      // Log RBAC deny (without PII)
      logMiddlewareEvent('WARN', 'rbac_deny', {
        requestId,
        path: pathname,
        method: request.method,
        userRole: userRole || 'unauthenticated',
        requiredRoles: policyResult.requiredRoles,
        reason: policyResult.reason
      })
      
      // Return 403 Forbidden
      return new NextResponse(
        JSON.stringify({ 
          code: 'FORBIDDEN', 
          message: 'Access denied' 
        }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            'x-request-id': requestId
          } 
        }
      )
    }
  }
  
  // Create response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Add requestId to response headers
  response.headers.set('x-request-id', requestId)
  
  // Log request start
  console.log('request_start', {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  })
  
  // Add response logging
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
