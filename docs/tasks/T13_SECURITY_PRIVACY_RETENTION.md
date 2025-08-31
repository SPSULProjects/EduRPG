**Owner:** SECURITY_QA_ENGINEER

## Objective
Security posture + retention.

## Steps
1. Ensure no PII in logs; redact payloads.
2. Retention job: archive logs after 1 year; restrict visibility Y2‑Y3 to Operators.
3. Rate limits on login; cookies httpOnly, secure, SameSite=Lax.

## Acceptance
- Tests confirm denies; logs clean; retention executed.

## Checklist
- [ ] Logging policy
- [ ] Retention
- [ ] Rate limits + cookies
