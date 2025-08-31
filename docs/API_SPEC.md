# API Spec (MVP)

## Auth
- NextAuth Credentials (internal). `GET /api/auth/session` returns session (role, classId).

## Health
- `GET /api/health` → `{ ok: boolean, ts: string, db: boolean }`

## Sync
- `POST /api/sync/bakalari` (Operator) → `{ runId, startedAt }`

## Jobs
- `POST /api/jobs` → create job
- `GET /api/classes/:id/jobs` → list jobs for class
- `POST /api/jobs/:id/assign` → student apply
- `POST /api/jobs/:id/review` → accept/reject/return
- `POST /api/jobs/:id/close` → close & payout

## XP
- `POST /api/xp/grant` → grant XP (enforce teacher daily budget)
- `GET /api/teacher/budget/today` → budget & remaining

## Shop/Items
- `GET /api/shop` → list items
- `POST /api/shop/buy` → buy
- `POST /api/items` (Operator) → create item
- `POST /api/items/:id/toggle` → enable/disable

## Achievements
- `POST /api/achievements` → create
- `GET /api/achievements` → list
- `POST /api/achievements/:id/award` → manual award

## Events
- `POST /api/events` → create
- `POST /api/events/:id/participate` → mark participation & grant bonus

## Errors
- 400/401/403/404/409/422/429/500 with JSON body `{ code, message }`.
