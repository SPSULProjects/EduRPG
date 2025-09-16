import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomUUID } from "crypto"
import { prisma } from "./prisma"
import { LogLevel } from "./generated"
import { NextRequest } from "next/server"
import { createSafeLogMetadata, validateLogEntry } from "./security/pii-redaction"
import { safePayload } from "../src/lib/security/redact"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Logs an event to the SystemLog table with PII redaction
 */
export async function logEvent(
  level: LogLevel,
  message: string,
  options: {
    userId?: string
    requestId?: string
    metadata?: Record<string, any>
  } = {}
) {
  try {
    // Validate and redact PII before logging
    if (!validateLogEntry(level, message, options.metadata)) {
      console.warn('Log entry contains PII and was rejected:', { level, message, options })
      return
    }

    // Create safe metadata using enhanced redaction
    const safeMetadata = createSafeLogMetadata({
      ...options,
      timestamp: new Date().toISOString(),
      metadata: options.metadata ? safePayload(options.metadata) : undefined
    })

    await prisma.systemLog.create({
      data: {
        level,
        message,
        userId: safeMetadata.userId,
        requestId: safeMetadata.requestId,
        metadata: safeMetadata.metadata ? JSON.parse(JSON.stringify(safeMetadata.metadata)) : null
      }
    })
  } catch (error) {
    // Fallback to console if database logging fails (with PII redaction)
    console.error("Failed to log to SystemLog:", error)
    const safeOptions = createSafeLogMetadata(options)
    console.log(`[${level}] ${message}`, safeOptions)
  }
}

/**
 * Gets the request ID from headers
 */
export function getRequestId(headers: Headers): string | undefined {
  return headers.get('x-request-id') || undefined
}

/**
 * Gets the request ID from NextRequest
 */
export function getRequestIdFromRequest(request: NextRequest): string | undefined {
  return request.headers.get('x-request-id') || undefined
}

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK'
  }).format(amount)
}

export function formatXP(amount: number): string {
  return new Intl.NumberFormat('cs-CZ').format(amount) + ' XP'
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'text-gray-500'
    case 'UNCOMMON':
      return 'text-green-500'
    case 'RARE':
      return 'text-blue-500'
    case 'EPIC':
      return 'text-purple-500'
    case 'LEGENDARY':
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'bg-gray-100'
    case 'UNCOMMON':
      return 'bg-green-100'
    case 'RARE':
      return 'bg-blue-100'
    case 'EPIC':
      return 'bg-purple-100'
    case 'LEGENDARY':
      return 'bg-orange-100'
    default:
      return 'bg-gray-100'
  }
}

export function calculateLevel(xp: number): { level: number; progress: number } {
  // Simple level calculation: each level requires level * 100 XP
  let level = 1
  let remainingXP = xp
  
  while (remainingXP >= level * 100) {
    remainingXP -= level * 100
    level++
  }
  
  const xpForNextLevel = level * 100
  const progress = Math.round((remainingXP / xpForNextLevel) * 100)
  
  return { level, progress }
}

export function sanitizeForLog(message: string): string {
  // Remove potential PII from log messages
  return message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{3}\b/g, '[PHONE]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
}
