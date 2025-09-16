/**
 * PII (Personally Identifiable Information) Redaction Utilities
 * 
 * Ensures no PII is logged in system logs according to T13 requirements.
 * Only IDs, counts, timestamps, and requestId are allowed in logs.
 */

// Common PII patterns to redact
const PII_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (various formats)
  /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  // Czech phone numbers
  /\b(?:\+420[-.\s]?)?([0-9]{3})[-.\s]?([0-9]{3})[-.\s]?([0-9]{3})\b/g,
  // Credit card numbers
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  // Social security numbers (Czech format)
  /\b[0-9]{6}\/[0-9]{3,4}\b/g,
  // Passwords (common patterns)
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /pwd["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /pass["\s]*[:=]["\s]*[^"\s,}]+/gi,
  // API keys and tokens
  /(?:api[_-]?key|token|secret|auth[_-]?key)["\s]*[:=]["\s]*[^"\s,}]+/gi,
  // Full names (basic pattern - may need refinement)
  /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g,
] as const

// Fields that should always be redacted
const PII_FIELDS = [
  'password', 'pwd', 'pass', 'secret', 'token', 'key', 'auth',
  'email', 'phone', 'telephone', 'mobile', 'address', 'ssn',
  'creditCard', 'cardNumber', 'cvv', 'cvc', 'pin',
  'firstName', 'lastName', 'fullName', 'name',
  'username', 'login', 'user', 'account'
] as const

/**
 * Redacts PII from a string using pattern matching
 */
export function redactPIIFromString(text: string): string {
  if (!text || typeof text !== 'string') {
    return text
  }

  let redacted = text

  // Apply pattern-based redaction
  PII_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]')
  })

  return redacted
}

/**
 * Redacts PII from an object recursively
 */
export function redactPIIFromObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return redactPIIFromString(obj)
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPIIFromObject)
  }

  const redacted: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    
    // Check if this field should be redacted
    const shouldRedact = PII_FIELDS.some(field => 
      lowerKey.includes(field) || field.includes(lowerKey)
    )
    
    if (shouldRedact) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'string') {
      redacted[key] = redactPIIFromString(value)
    } else if (typeof value === 'object') {
      redacted[key] = redactPIIFromObject(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Safe logging metadata that only includes allowed fields
 */
export interface SafeLogMetadata {
  // Allowed fields (no PII)
  requestId?: string
  userId?: string
  role?: string
  level?: string
  timestamp?: string
  count?: number
  duration?: number
  status?: string
  error?: string
  // Custom metadata (will be redacted)
  metadata?: Record<string, any>
}

/**
 * Creates safe metadata for logging by redacting PII
 */
export function createSafeLogMetadata(data: Record<string, any>): SafeLogMetadata {
  const redacted = redactPIIFromObject(data)
  
  // Extract only safe fields
  const safe: SafeLogMetadata = {}
  
  if (redacted.requestId) safe.requestId = redacted.requestId
  if (redacted.userId) safe.userId = redacted.userId
  if (redacted.role) safe.role = redacted.role
  if (redacted.level) safe.level = redacted.level
  if (redacted.timestamp) safe.timestamp = redacted.timestamp
  if (typeof redacted.count === 'number') safe.count = redacted.count
  if (typeof redacted.duration === 'number') safe.duration = redacted.duration
  if (redacted.status) safe.status = redacted.status
  if (redacted.error) safe.error = redacted.error
  
  // Include redacted metadata if present
  if (redacted.metadata && typeof redacted.metadata === 'object') {
    safe.metadata = redacted.metadata
  }
  
  return safe
}

/**
 * Validates that a log entry contains no PII
 */
export function validateLogEntry(level: string, message: string, metadata?: Record<string, any>): boolean {
  // Check message for PII
  const redactedMessage = redactPIIFromString(message)
  if (redactedMessage !== message) {
    console.warn('PII detected in log message:', { original: message, redacted: redactedMessage })
    return false
  }
  
  // Check metadata for PII
  if (metadata) {
    const redactedMetadata = redactPIIFromObject(metadata)
    const originalStr = JSON.stringify(metadata)
    const redactedStr = JSON.stringify(redactedMetadata)
    
    if (originalStr !== redactedStr) {
      console.warn('PII detected in log metadata:', { original: metadata, redacted: redactedMetadata })
      return false
    }
  }
  
  return true
}
