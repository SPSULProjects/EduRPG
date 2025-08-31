# API Spec (MVP)

## Auth
- NextAuth Credentials (internal). `GET /api/auth/session` returns session (role, classId).

## Health
- `GET /api/health` → `{ ok: boolean, ts: string, db: boolean }`

## Sync
- `POST /api/sync/bakalari` (Operator) → `{ runId, startedAt }`

## Jobs
- `POST /api/jobs` → create job
- `GET /api/jobs` → list jobs (role-based filtering)
- `GET /api/classes/:id/jobs` → list jobs for class
- `POST /api/jobs/:id/apply` → student apply
- `POST /api/jobs/:id/review` → accept/reject/return
- `POST /api/jobs/:id/close` → close & payout

## XP
- `POST /api/xp/grant` → grant XP (enforce teacher daily budget)
- `GET /api/xp/student` → get student XP data
- `GET /api/teacher/budget/today` → budget & remaining

## Shop/Items
- `GET /api/shop` → list active items
- `POST /api/shop` → buy item
- `GET /api/items` → list all items (Operator only)
- `POST /api/items` → create item (Operator only)
- `POST /api/items/:id/toggle` → enable/disable item (Operator only)

## Achievements
- `GET /api/achievements` → list achievements
- `POST /api/achievements` → create achievement (Operator only)
- `POST /api/achievements/:id/award` → manual award (Operator only)

## Events
- `POST /api/events` → create event (Operator only)
- `GET /api/events` → list events (all users, operators can see inactive with `?includeInactive=true`)
- `POST /api/events/:id/participate` → mark participation & grant bonus (all authenticated users)

## Error Response Format
All endpoints return consistent error responses:
```json
{
  "code": "ERROR_CODE",
  "message": "Human readable error message"
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (e.g., already applied, already awarded)
- 422: Unprocessable Entity
- 429: Rate Limited
- 500: Internal Server Error
- 503: Service Unavailable (health check failures)
