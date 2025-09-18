import { NextRequest, NextResponse } from "next/server"
import { requireOperator } from "@/app/lib/rbac"
import { LogRetentionService, DEFAULT_RETENTION_CONFIG } from "@/app/lib/services/log-retention"
import { logEvent } from "@/app/lib/utils"
import { z } from "zod"

// Rate limiting for retention operations
const retentionRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkRetentionRateLimit(userId: string): boolean {
  const now = Date.now()
  const key = `retention:${userId}`
  const userLimit = retentionRateLimit.get(key)
  
  if (!userLimit || now > userLimit.resetTime) {
    retentionRateLimit.set(key, { count: 1, resetTime: now + 300000 }) // 5 minutes
    return true
  }
  
  if (userLimit.count >= 3) { // Max 3 runs per 5 minutes
    return false
  }
  
  userLimit.count++
  return true
}

/**
 * GET /api/admin/log-retention
 * Get retention statistics and status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireOperator()
    
    const retentionService = new LogRetentionService()
    const stats = await retentionService.getRetentionStats()
    
    await logEvent("INFO", "Retention stats requested", {
      userId: user.id,
      metadata: {
        stats
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        config: DEFAULT_RETENTION_CONFIG
      }
    })
  } catch (error) {
    console.error("Error getting retention stats:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get retention statistics" 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/log-retention
 * Run retention process
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireOperator()
    
    // Check rate limit
    if (!checkRetentionRateLimit(user.id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Please wait before running retention again." 
        },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    const schema = z.object({
      archiveAfterDays: z.number().min(1).max(3650).optional(),
      restrictAfterDays: z.number().min(1).max(3650).optional(),
      deleteAfterDays: z.number().min(1).max(3650).optional(),
      batchSize: z.number().min(10).max(10000).optional()
    })
    
    const parsedConfig = schema.parse(body)
    
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const config = {
      ...DEFAULT_RETENTION_CONFIG,
      ...(parsedConfig.archiveAfterDays !== undefined && { archiveAfterDays: parsedConfig.archiveAfterDays }),
      ...(parsedConfig.restrictAfterDays !== undefined && { restrictAfterDays: parsedConfig.restrictAfterDays }),
      ...(parsedConfig.deleteAfterDays !== undefined && { deleteAfterDays: parsedConfig.deleteAfterDays }),
      ...(parsedConfig.batchSize !== undefined && { batchSize: parsedConfig.batchSize })
    }
    
    const retentionService = new LogRetentionService(config)
    
    await logEvent("INFO", "Retention process started", {
      userId: user.id,
      metadata: {
        config
      }
    })
    
    const result = await retentionService.runRetentionProcess()
    
    await logEvent("INFO", "Retention process completed", {
      userId: user.id,
      metadata: {
        result
      }
    })
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error("Error running retention process:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid configuration", 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to run retention process" 
      },
      { status: 500 }
    )
  }
}
