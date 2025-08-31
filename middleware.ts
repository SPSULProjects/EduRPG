import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  // Add requestId to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
