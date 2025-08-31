# Logging & Observability

## SystemLog
- `SystemLog { id, type, actorId?, targetId?, payload JSON, createdAt }`
- Types: `auth_success|auth_fail`, `sync_ok|sync_fail`, `policy_ack`, `job_*`, `xp_grant`, `money_tx`, `rbac_deny`

## RequestId
- Generated per request (UUID); attached to logs & audits.

## PII Policy
- No personal data in logs. Only IDs, counts, timestamps, and requestId.

## Health
- `/api/health` returns `{ ok, ts, db }` (db ping via `SELECT 1`).
