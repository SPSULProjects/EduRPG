# P1 Handoff – Redaction

**Owner:** SECURITY_QA_ENGINEER  
**Support:** FULLSTACK_INTEGRATOR (wiring in logEvent)

## Deliverables
- `src/lib/security/redact.ts` (library)
- `src/lib/services/log.service.ts` uses `safePayload()`
- `tests/redact.spec.ts` (Vitest)
- `/docs/LOGGING.md` updated
- `/docs/workers/WORKER_SECURITY_QA_ENGINEER.md` updated mandate

## Acceptance
- Unit tests green
- No raw PII observed in any SystemLog payload during integration tests
- Reviewer approves redaction behavior

## Implementation Summary

### Core Redaction Module (`src/lib/security/redact.ts`)
- **Field-name-first approach**: Case-insensitive deny list for sensitive field names
- **Pattern-based redaction**: Email, Czech phone numbers, JWT tokens
- **Robust traversal**: Depth-limited DFS (default 6), circular reference protection
- **Error safety**: Never leaks raw data, fallback to `[redacted:payload_error]`
- **Deterministic output**: `[redacted:type]` markers for testability

### Log Service Integration (`src/lib/services/log.service.ts`)
- **Semantic logging API**: LogType-based interface (`auth_success`, `sync_ok`, etc.)
- **Enhanced redaction**: Uses `safePayload()` for all payload data
- **Backward compatibility**: Maps to existing SystemLog model structure
- **Smart message generation**: Human-readable messages from log types

### Enhanced Existing Logging (`app/lib/utils.ts`)
- **Dual redaction**: Existing validation + new enhanced redaction
- **Backward compatibility**: Maintains existing API while adding robust PII protection
- **Enhanced metadata safety**: Applies `safePayload()` to metadata before logging

### Comprehensive Test Coverage (`tests/redact.spec.ts`)
- **15 unit tests** covering all critical scenarios:
  - Field-name redaction (case-insensitive)
  - Pattern-based redaction (emails, Czech phones, JWT tokens)
  - Nested structures and arrays
  - Depth limiting and circular references
  - Error handling and edge cases
  - Mixed PII and non-PII data
- **All tests passing** ✅

### Documentation Updates
- **LOGGING.md**: Enhanced PII redaction specifications with detailed rules
- **API_SPEC.md**: Standardized error envelope format
- **WORKER_SECURITY_QA_ENGINEER.md**: PII redaction test mandate

## Key Features

### Field-Name-First Redaction
```typescript
// These field names are automatically redacted regardless of value
const DENY_FIELD_NAMES = [
  "password", "pwd", "pass",
  "token", "access_token", "refresh_token", "id_token", "authorization", "auth", "api_key", "apikey", "secret", "key",
  "email", "mail",
  "phone", "tel", "mobile",
  "address"
];
```

### Pattern-Based Redaction
- **Emails**: `[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}`
- **Czech phones**: `(?:\+?420[\s.-]?)?(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{3})`
- **JWT tokens**: `(?:eyJ[A-Za-z0-9_\-]{10,}|[A-Za-z0-9_\-]{24,})`

### Robust Error Handling
- **Circular references**: Detected and handled safely
- **Depth limits**: Prevents infinite recursion
- **Exception safety**: Never leaks raw data, even on errors
- **Graceful degradation**: Fallback to safe markers

## Usage Examples

### Basic Redaction
```typescript
import { redactPII } from "@/src/lib/security/redact";

const input = {
  email: "user@example.com",
  password: "secret123",
  note: "Contact me at admin@school.cz or +420 123 456 789"
};

const redacted = redactPII(input);
// Result: { email: "[redacted:field]", password: "[redacted:field]", note: "Contact me at [redacted:email] or [redacted:phone]" }
```

### Log Service Usage
```typescript
import { logEvent } from "@/src/lib/services/log.service";

await logEvent("auth_success", "user123", null, {
  email: "user@example.com",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
}, "req-456");
// SystemLog.payload will contain redacted data
```

## Security Compliance

### PII Protection
- **No raw PII** in SystemLog payloads
- **Field-name detection** more reliable than pattern-only approaches
- **Czech-specific patterns** for local compliance
- **Comprehensive coverage** of common PII types

### Performance & Reliability
- **Efficient traversal** with depth limits
- **Memory safe** with circular reference protection
- **Deterministic output** for consistent behavior
- **Error resilient** with safe fallbacks

## Next Steps

1. **Integration testing**: Verify SystemLog.payload contains no raw PII
2. **Code review**: SECURITY_QA_ENGINEER approval of redaction behavior
3. **Production deployment**: Monitor logs for PII compliance
4. **Future enhancements**: Additional PII patterns as needed

## Files Modified/Created

### New Files
- `src/lib/security/redact.ts` - Core redaction module
- `src/lib/services/log.service.ts` - Enhanced log service
- `tests/redact.spec.ts` - Comprehensive unit tests
- `docs/workers/HANDOFF_P1.md` - This handoff document

### Modified Files
- `app/lib/utils.ts` - Enhanced existing logEvent function
- `docs/LOGGING.md` - Updated PII redaction specifications
- `docs/API_SPEC.md` - Standardized error envelope
- `docs/workers/WORKER_SECURITY_QA_ENGINEER.md` - Added test mandate

## Test Results
```
✓ tests/redact.spec.ts (15)
  ✓ redactPII (11)
    ✓ redacts deny-listed fields by name (case-insensitive)
    ✓ masks email and CZ phone patterns inside strings
    ✓ handles nested objects and arrays
    ✓ limits depth to avoid runaway traversal
    ✓ handles circular structures safely
    ✓ preserves non-PII data
    ✓ redacts JWT-like tokens in strings
    ✓ handles various Czech phone number formats
    ✓ handles null and undefined values
    ✓ respects redaction options
    ✓ handles complex nested structures with mixed PII
  ✓ safePayload (4)
    ✓ returns redacted payload on success
    ✓ returns error marker on exception
    ✓ handles edge cases that might cause errors
    ✓ handles primitive values

Test Files  1 passed (1)
Tests  15 passed (15)
```

**Status: ✅ COMPLETE - Ready for SECURITY_QA_ENGINEER review**
