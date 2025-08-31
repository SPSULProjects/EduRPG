**Owner:** FULLSTACK_INTEGRATOR

## Objective
Idempotent one‑way sync Users/Classes/Subjects every 15 min + manual.

## Steps
1. Migration: add ExternalRef table or `externalId` columns (unique).
2. Service `src/lib/services/sync-bakalari.service.ts`:
   - Fetch arrays: users, classes, subjects.
   - Transaction: classes → users (+enrollment) → subjects.
   - Summary counts.
3. Endpoint `POST /api/sync/bakalari` (Operator).
4. Cron docs for 15‑min schedule.
5. Logs `sync_ok`/`sync_fail` with counts.

## Acceptance
- Double‑run yields no duplicates; ≤60s typical.

## Checklist
- [ ] Migration
- [ ] Service
- [ ] Endpoint
- [ ] Cron docs
- [ ] Logs
