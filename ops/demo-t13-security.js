#!/usr/bin/env node

/**
 * T13 Security Features Demo
 * 
 * Demonstrates all T13 security features:
 * - PII redaction
 * - Rate limiting
 * - Log retention
 * - Secure cookies
 */

const { 
  redactPIIFromString, 
  redactPIIFromObject, 
  createSafeLogMetadata 
} = require('../app/lib/security/pii-redaction')
const { 
  RateLimitService, 
  loginRateLimit 
} = require('../app/lib/security/rate-limiting')

console.log('🔒 T13 Security Features Demo\n')

// 1. PII Redaction Demo
console.log('1️⃣ PII Redaction Demo')
console.log('=' .repeat(50))

const testStrings = [
  'User john.doe@example.com logged in successfully',
  'Contact user at +420 123 456 789 for support',
  'Password: secret123 was used for authentication',
  'System started normally without issues'
]

testStrings.forEach((str, i) => {
  const redacted = redactPIIFromString(str)
  console.log(`Input ${i + 1}:  ${str}`)
  console.log(`Output ${i + 1}: ${redacted}`)
  console.log()
})

// 2. Object PII Redaction Demo
console.log('2️⃣ Object PII Redaction Demo')
console.log('=' .repeat(50))

const testObject = {
  username: 'john.doe',
  email: 'john@example.com',
  password: 'secret123',
  phone: '+420 123 456 789',
  message: 'Login successful',
  count: 5,
  timestamp: '2024-12-01T12:00:00Z'
}

console.log('Original object:')
console.log(JSON.stringify(testObject, null, 2))
console.log()

const redactedObject = redactPIIFromObject(testObject)
console.log('Redacted object:')
console.log(JSON.stringify(redactedObject, null, 2))
console.log()

// 3. Safe Log Metadata Demo
console.log('3️⃣ Safe Log Metadata Demo')
console.log('=' .repeat(50))

const unsafeMetadata = {
  username: 'john.doe',
  email: 'john@example.com',
  password: 'secret123',
  userId: 'user123',
  requestId: 'req456',
  count: 5,
  timestamp: '2024-12-01T12:00:00Z'
}

console.log('Unsafe metadata:')
console.log(JSON.stringify(unsafeMetadata, null, 2))
console.log()

const safeMetadata = createSafeLogMetadata(unsafeMetadata)
console.log('Safe metadata (only allowed fields):')
console.log(JSON.stringify(safeMetadata, null, 2))
console.log()

// 4. Rate Limiting Demo
console.log('4️⃣ Rate Limiting Demo')
console.log('=' .repeat(50))

const demoRateLimiter = new RateLimitService({
  windowMs: 60000, // 1 minute
  maxAttempts: 3,
  blockDurationMs: 300000 // 5 minutes
})

const testKey = 'demo-user'

console.log('Testing rate limiting with 5 attempts (limit: 3)...')
for (let i = 1; i <= 5; i++) {
  const result = demoRateLimiter.checkRateLimit(testKey)
  console.log(`Attempt ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (remaining: ${result.remaining})`)
  
  if (result.blocked) {
    console.log(`   Blocked until: ${new Date(result.blockExpires).toISOString()}`)
  }
}
console.log()

// 5. Login Rate Limiter Demo
console.log('5️⃣ Login Rate Limiter Demo')
console.log('=' .repeat(50))

const loginKey = 'test-user'
console.log('Testing login rate limiter (5 attempts per 15 minutes)...')

for (let i = 1; i <= 6; i++) {
  const result = loginRateLimit.checkRateLimit(loginKey)
  console.log(`Login attempt ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (remaining: ${result.remaining})`)
  
  if (result.blocked) {
    console.log(`   Blocked until: ${new Date(result.blockExpires).toISOString()}`)
    break
  }
}
console.log()

// 6. Log Retention Policy Demo
console.log('6️⃣ Log Retention Policy Demo')
console.log('=' .repeat(50))

const retentionPolicy = {
  'ACTIVE': {
    description: 'Logs less than 1 year old',
    visibility: 'All authenticated users',
    example: 'Recent login attempts, system events'
  },
  'ARCHIVED': {
    description: 'Logs 1-2 years old',
    visibility: 'All authenticated users',
    example: 'Historical system events, archived data'
  },
  'RESTRICTED': {
    description: 'Logs 2-3 years old',
    visibility: 'Operators only',
    example: 'Compliance data, audit trails'
  },
  'DELETED': {
    description: 'Logs older than 3 years',
    visibility: 'Deleted from system',
    example: 'Automatically purged for compliance'
  }
}

Object.entries(retentionPolicy).forEach(([status, info]) => {
  console.log(`${status}:`)
  console.log(`  Description: ${info.description}`)
  console.log(`  Visibility: ${info.visibility}`)
  console.log(`  Example: ${info.example}`)
  console.log()
})

// 7. Security Configuration Summary
console.log('7️⃣ Security Configuration Summary')
console.log('=' .repeat(50))

const securityConfig = {
  'Cookies': {
    'httpOnly': 'true (XSS protection)',
    'sameSite': 'lax (CSRF protection)',
    'secure': 'true in production (HTTPS only)'
  },
  'Rate Limiting': {
    'Login attempts': '5 per 15 minutes per username',
    'API requests': '100 per minute per user',
    'Block duration': '30 minutes after exceeding limit'
  },
  'Log Retention': {
    'Archive after': '1 year (365 days)',
    'Restrict after': '2 years (730 days)',
    'Delete after': '3 years (1095 days)'
  },
  'PII Protection': {
    'Email addresses': 'Automatically redacted',
    'Phone numbers': 'Automatically redacted',
    'Passwords/tokens': 'Automatically redacted',
    'Validation': 'Logs with PII are rejected'
  }
}

Object.entries(securityConfig).forEach(([category, settings]) => {
  console.log(`${category}:`)
  Object.entries(settings).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
  console.log()
})

console.log('🎉 T13 Security Features Demo Complete!')
console.log('\n📋 Next Steps:')
console.log('1. Run the validation script: node scripts/validate-t13-security.js')
console.log('2. Set up the log retention cron job')
console.log('3. Monitor security metrics in production')
console.log('4. Review and adjust rate limits based on usage patterns')
