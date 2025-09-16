# Logging & Observability

## SystemLog
- `SystemLog { id, level, message, userId?, requestId?, metadata JSON, createdAt }`
- Types: `auth_success|auth_fail`, `sync_ok|sync_fail`, `policy_ack`, `job_*`, `xp_grant`, `money_tx`, `rbac_deny`

## RequestId
- Generated per request (UUID); attached to logs & audits.

## PII Redaction (mandatory)

- All `SystemLog.payload` values are processed via `src/lib/security/redact.ts` before write.
- Redaction rules:
  - **Field-name first (case-insensitive):** password/pwd/pass, token/access_token/refresh_token/id_token/authorization/auth, api_key/apikey/secret/key, email/mail, phone/tel/mobile, address → `[redacted:field]`.
  - **Patterns inside strings:** emails → `[redacted:email]`, Czech phones (with/without +420 and separators) → `[redacted:phone]`, JWT/long tokens → `[redacted:token]`.
  - **Traversal:** depth-limited DFS (default 6), arrays supported, circular handled → `[redacted:circular]`.
- No PII permitted in logs. If redaction fails, payload becomes `[redacted:payload_error]`.

## Health
- `/api/health` returns `{ ok, ts, db }` (db ping via `SELECT 1`).
