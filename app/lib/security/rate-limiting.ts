/**
 * Rate Limiting Service (T13)
 * 
 * Implements rate limiting for login attempts and other sensitive operations.
 * Uses in-memory storage for simplicity (in production, use Redis).
 */

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxAttempts: number // Maximum attempts per window
  blockDurationMs?: number // How long to block after exceeding limit
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  blocked: boolean
  blockExpires?: number
}

// In-memory storage for rate limiting
// In production, this should be replaced with Redis
const rateLimitStore = new Map<string, {
  attempts: number
  windowStart: number
  blocked: boolean
  blockExpires?: number
}>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.windowStart + 3600000) { // 1 hour cleanup
      rateLimitStore.delete(key)
    }
  }
}, 300000) // 5 minutes

export class RateLimitService {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if an action is allowed for a given key
   */
  checkRateLimit(key: string): RateLimitResult {
    const now = Date.now()
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs
    const storeKey = `${key}:${windowStart}`
    
    let data = rateLimitStore.get(storeKey)
    
    if (!data) {
      data = {
        attempts: 0,
        windowStart,
        blocked: false
      }
      rateLimitStore.set(storeKey, data)
    }

    // Check if currently blocked
    if (data.blocked && data.blockExpires && now < data.blockExpires) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.config.windowMs,
        blocked: true,
        blockExpires: data.blockExpires
      }
    }

    // Reset block status if expired
    if (data.blocked && data.blockExpires && now >= data.blockExpires) {
      data.blocked = false
      data.blockExpires = undefined
    }

    // Check if within rate limit
    if (data.attempts >= this.config.maxAttempts) {
      // Block if configured
      if (this.config.blockDurationMs) {
        data.blocked = true
        data.blockExpires = now + this.config.blockDurationMs
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.config.windowMs,
        blocked: data.blocked,
        blockExpires: data.blockExpires
      }
    }

    // Increment attempts
    data.attempts++
    
    return {
      allowed: true,
      remaining: this.config.maxAttempts - data.attempts,
      resetTime: windowStart + this.config.windowMs,
      blocked: false
    }
  }

  /**
   * Reset rate limit for a key (for testing or manual override)
   */
  resetRateLimit(key: string): void {
    const now = Date.now()
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs
    const storeKey = `${key}:${windowStart}`
    rateLimitStore.delete(storeKey)
  }

  /**
   * Get current rate limit status for a key
   */
  getRateLimitStatus(key: string): RateLimitResult {
    const now = Date.now()
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs
    const storeKey = `${key}:${windowStart}`
    
    const data = rateLimitStore.get(storeKey)
    
    if (!data) {
      return {
        allowed: true,
        remaining: this.config.maxAttempts,
        resetTime: windowStart + this.config.windowMs,
        blocked: false
      }
    }

    // Check if currently blocked
    if (data.blocked && data.blockExpires && now < data.blockExpires) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.config.windowMs,
        blocked: true,
        blockExpires: data.blockExpires
      }
    }

    return {
      allowed: data.attempts < this.config.maxAttempts,
      remaining: Math.max(0, this.config.maxAttempts - data.attempts),
      resetTime: windowStart + this.config.windowMs,
      blocked: false
    }
  }
}

// Pre-configured rate limiters for different operations
export const loginRateLimit = new RateLimitService({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes after exceeding limit
})

export const apiRateLimit = new RateLimitService({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 100, // 100 requests per minute
  blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes
})

export const sensitiveOperationRateLimit = new RateLimitService({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10, // 10 attempts per minute
  blockDurationMs: 10 * 60 * 1000 // Block for 10 minutes
})

/**
 * Middleware helper for rate limiting
 */
export function withRateLimit(
  rateLimiter: RateLimitService,
  getKey: (request: Request) => string
) {
  return async (request: Request): Promise<Response | null> => {
    const key = getKey(request)
    const result = rateLimiter.checkRateLimit(key)
    
    if (!result.allowed) {
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: result.blocked 
            ? 'Too many attempts. Please try again later.'
            : 'Too many requests. Please slow down.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          blocked: result.blocked
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimiter['config'].maxAttempts.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString()
          }
        }
      )
      return response
    }
    
    return null // Allow request to proceed
  }
}
