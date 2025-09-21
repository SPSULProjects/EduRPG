import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRouteAccess } from './app/lib/auth/policies'
import { UserRole } from './app/lib/generated'

// Simple logging function for middleware (Edge Runtime compatible)
// Note: This is a simplified version for Edge Runtime - full PII redaction is in utils.ts
function logMiddlewareEvent(level: string, message: string, metadata: Record<string, any> = {}) {
  // Basic PII redaction for Edge Runtime
  const safeMetadata = { ...metadata }
  
  // Remove common PII fields
  const piiFields = ['password', 'email', 'phone', 'name', 'username', 'token', 'secret']
  piiFields.forEach(field => {
    if (safeMetadata[field]) {
      safeMetadata[field] = '[REDACTED]'
    }
  })
  
  console.log(`[${level}] ${message}`, {
    timestamp: new Date().toISOString(),
    ...safeMetadata
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
  const publicRoutes = ['/api/auth', '/api/health', '/auth', '/favicon.ico', '/']
    const loginRoute = ['/auth/signin']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // Get JWT token for authentication
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    })
  
  if (!isPublicRoute) {
    // If no token, redirect to sign-in page
    if (!token) {
      logMiddlewareEvent('INFO', 'auth_redirect', {
        requestId,
        path: pathname,
        method: request.method,
        reason: 'unauthenticated'
      })
      
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(signInUrl)
    }
    
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

    if (loginRoute.some(route => pathname.startsWith(route))) {
        // If the user is authenticated already, move him to dashboard

        const userRole = token?.role as UserRole | undefined
        if (userRole) {
            logMiddlewareEvent('INFO', 'redirect to dashboard', {
                requestId,
                path: pathname,
                method: request.method,
                userRole: userRole || 'unauthenticated',
            })
            return NextResponse.redirect(new URL("/dashboard", request.url))
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
  
  // Log request start (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('request_start', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })
  }
  
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
