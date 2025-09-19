// src/lib/security/redact.ts
// Robust, field-name-first PII redaction with safe traversal.
// No PII in logs. Keep deterministic replacements for testability.

export type RedactionOptions = {
  maxDepth?: number;
  redactCircular?: boolean;
  redactUnknownTokens?: boolean;
};

const DEFAULTS: Required<RedactionOptions> = {
  maxDepth: 6,
  redactCircular: true,
  redactUnknownTokens: true,
};

// Case-insensitive deny list for field names (exact matches)
const DENY_FIELD_NAMES = new Set([
  "password", "pwd", "pass",
  "token", "access_token", "refresh_token", "id_token", "authorization", "auth", "api_key", "apikey", "secret", "key",
  "email", "mail",
  "phone", "tel", "mobile",
  "address",
  "ssn", "social_security_number",
  "credit_card", "creditcard", "card_number", "cardnumber",
  "mfa_code", "mfaCode", "mfa_token", "mfaToken", "verification_code", "verificationCode",
  "ip_address", "ipAddress", "ip",
]);

// Field name patterns that should be redacted (partial matches)
// Be more specific to avoid false positives
const DENY_FIELD_PATTERNS = [
  /password/i,
  /pwd/i,
  /pass/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /email/i,
  /mail/i,
  /phone/i,
  /tel/i,
  /mobile/i,
  /address/i,
  /username/i,
  /login/i,
  /account/i,
  /firstname/i,
  /lastname/i,
  /fullname/i,
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /mfa[_-]?code/i,
  /mfa[_-]?token/i,
  /verification[_-]?code/i,
  /ip[_-]?address/i,
  // More specific patterns to avoid false positives
  // Remove exact "user" and "name" patterns as they're too aggressive for structural fields
];

// Patterns to mask inside string values (order matters)
const PATTERNS: Array<{ type: string; re: RegExp }> = [
  // Emails - improved pattern to catch more cases including localhost
  { type: "email", re: /[\w.+-]+@[\w.-]+(?:\.[A-Za-z]{2,}|(?:localhost|local))/g },
  // Czech phone numbers: optional +420, then 3-3-3 digits with separators or none
  { type: "phone", re: /(?<!\d)(?:\+?420[\s.-]?)?(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{3})(?!\d)/g },
  // Password patterns in strings - key:value or key=value format
  { type: "password", re: /(?:password|pwd|pass)\s*[:=]\s*[^\s,}]+/gi },
  // API keys and tokens in strings
  { type: "token", re: /(?:api[_-]?key|token|secret|auth[_-]?key)\s*[:=]\s*[^\s,}]+/gi },
  // JWT-ish / long tokens (very general, keep last)
  { type: "token", re: /\b(?:eyJ[A-Za-z0-9_\-]{10,}|[A-Za-z0-9_\-]{24,})\b/g },
];

// Stable replacement marker
function marker(type: string) {
  return `[redacted:${type}]`;
}

function redactString(s: string): string {
  let out = s;
  for (const { type, re } of PATTERNS) {
    out = out.replace(re, () => marker(type));
  }
  return out;
}

// Lowercase once for comparisons, preserve original keys in output
function lc(s: string) {
  return s.toLowerCase();
}

export function redactPII<T = unknown>(input: T, opts?: RedactionOptions): T {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  const seen = new WeakSet<object>();

  function walk(value: any, depth: number): any {
    if (value == null) return value;
    if (depth > cfg.maxDepth) return value;

    const t = typeof value;
    if (t === "string") return redactString(value);
    if (t !== "object") return value;

    if (seen.has(value)) {
      return cfg.redactCircular ? marker("circular") : value;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((v) => walk(v, depth + 1));
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const lk = lc(k);
      
      // Check exact field name matches first
      if (DENY_FIELD_NAMES.has(lk)) {
        out[k] = marker("field");
        continue;
      }
      
      // Check partial field name matches
      const isPiiField = DENY_FIELD_PATTERNS.some(pattern => pattern.test(k));
      if (isPiiField) {
        out[k] = marker("field");
        continue;
      }
      
      // For string leafs: still run pattern masking (e.g., email in "note")
      if (typeof v === "string") {
        out[k] = redactString(v);
        continue;
      }
      out[k] = walk(v, depth + 1);
    }
    return out;
  }

  return walk(input, 0);
}

// Convenience helper for logs:
export function safePayload(payload: unknown, opts?: RedactionOptions): unknown {
  try {
    return redactPII(payload, opts);
  } catch {
    // If anything goes wrong, ensure we never leak raw payload
    return marker("payload_error");
  }
}
