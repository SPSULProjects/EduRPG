import { NextRequest } from "next/server"
import { headers } from "next/headers"

// Security headers configuration
export const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const key = identifier
    const current = this.requests.get(key)

    // Clean up expired entries
    if (current && current.resetTime < now) {
      this.requests.delete(key)
    }

    const entry = this.requests.get(key) || { count: 0, resetTime: now + this.config.windowMs }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    entry.count++
    this.requests.set(key, entry)

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function sanitizeForLog(data: unknown): unknown {
  if (typeof data === "string") {
    return sanitizeInput(data)
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForLog)
  }
  
  if (data && typeof data === "object") {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      // Redact sensitive fields
      if (key.toLowerCase().includes("password") || 
          key.toLowerCase().includes("token") || 
          key.toLowerCase().includes("secret")) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = sanitizeForLog(value)
      }
    }
    return sanitized
  }
  
  return data
}

// Request validation
export function validateRequestId(requestId?: string): string {
  if (!requestId) {
    return crypto.randomUUID()
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(requestId)) {
    return crypto.randomUUID()
  }
  
  return requestId
}

// CSRF protection
export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

export function validateCSRFToken(token: string, sessionToken?: string): boolean {
  if (!token || !sessionToken) {
    return false
  }
  
  // In a real implementation, you would validate the token against the session
  // For now, we'll just check if both tokens exist
  return token.length > 0 && sessionToken.length > 0
}

// IP address validation
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  
  if (realIP) {
    return realIP
  }
  
  return "unknown"
}

// Content Security Policy
export function generateCSP(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'" + (nonce ? ` 'nonce-${nonce}'` : ""),
    "style-src 'self' 'unsafe-inline'" + (nonce ? ` 'nonce-${nonce}'` : ""),
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]
  
  return directives.join("; ")
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long")
  } else {
    score += 1
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push("Password must contain at least one lowercase letter")
  } else {
    score += 1
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push("Password must contain at least one uppercase letter")
  } else {
    score += 1
  }
  
  if (!/\d/.test(password)) {
    feedback.push("Password must contain at least one number")
  } else {
    score += 1
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push("Password must contain at least one special character")
  } else {
    score += 1
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  }
}

// SQL injection prevention (for dynamic queries)
export function escapeSQLString(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
}

// XSS prevention
export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  }
  
  return input.replace(/[&<>"'/]/g, (s) => map[s] || s)
}

// Session security
export function generateSecureSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("")
}

// Environment validation
export function validateEnvironment(): void {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL"
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
  
  // Validate NEXTAUTH_SECRET strength
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length < 32) {
    console.warn("NEXTAUTH_SECRET should be at least 32 characters long for security")
  }
}
