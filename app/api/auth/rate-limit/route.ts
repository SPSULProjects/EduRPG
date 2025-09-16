import { NextRequest, NextResponse } from "next/server"
import { loginRateLimit, apiRateLimit } from "@/app/lib/security/rate-limiting"
import { logEvent } from "@/app/lib/utils"

/**
 * GET /api/auth/rate-limit
 * Check rate limit status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const type = searchParams.get('type') || 'login'
    
    if (!username) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Username parameter is required" 
        },
        { status: 400 }
      )
    }
    
    let rateLimiter
    let key
    
    switch (type) {
      case 'login':
        rateLimiter = loginRateLimit
        key = `login:${username}`
        break
      case 'api':
        rateLimiter = apiRateLimit
        key = `api:${username}`
        break
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Invalid rate limit type. Use 'login' or 'api'" 
          },
          { status: 400 }
        )
    }
    
    const status = rateLimiter.getRateLimitStatus(key)
    
    await logEvent("INFO", "Rate limit status checked", {
      metadata: {
        username,
        type,
        status
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        type,
        username,
        ...status
      }
    })
  } catch (error) {
    console.error("Error checking rate limit status:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to check rate limit status" 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/rate-limit
 * Reset rate limit for a user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // This would typically require admin authentication
    // For now, we'll just log the attempt
    const body = await request.json()
    const { username, type = 'login' } = body
    
    if (!username) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Username is required" 
        },
        { status: 400 }
      )
    }
    
    let rateLimiter
    let key
    
    switch (type) {
      case 'login':
        rateLimiter = loginRateLimit
        key = `login:${username}`
        break
      case 'api':
        rateLimiter = apiRateLimit
        key = `api:${username}`
        break
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Invalid rate limit type. Use 'login' or 'api'" 
          },
          { status: 400 }
        )
    }
    
    rateLimiter.resetRateLimit(key)
    
    await logEvent("INFO", "Rate limit reset", {
      metadata: {
        username,
        type
      }
    })
    
    return NextResponse.json({
      success: true,
      message: "Rate limit reset successfully"
    })
  } catch (error) {
    console.error("Error resetting rate limit:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to reset rate limit" 
      },
      { status: 500 }
    )
  }
}
