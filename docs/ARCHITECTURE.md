# Architecture Overview

## Layers
UI (RSC/Client) → Server Actions / Route Handlers → Domain Services → Prisma → Postgres

## Integration
- Bakaláři DataConnector via `bakalari.adapter` for login & sync.
- Sync service every 15 min (cron) and on‑demand endpoint.

## Key Models
User, Class, Subject, Enrollment, Job, JobAssignment, TeacherDailyBudget, XPAudit, MoneyTx,
Item, Purchase, Achievement, AchievementAward, Event, SystemLog (optional ExternalRef).

## Security
- JWT sessions via NextAuth.
- RBAC middleware + server guard utilities.
- No PII in logs; requestId propagation.

## Ops
- Postgres 16 via Docker Compose.
- Nightly `pg_dump` 22:00; restore runbook.
- Manual deploy (no CI/CD).
