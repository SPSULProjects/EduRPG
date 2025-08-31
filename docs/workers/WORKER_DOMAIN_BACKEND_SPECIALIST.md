# Worker – DOMAIN_BACKEND_SPECIALIST

**Mission:** Jobs, XP, Achievements, Events with transactional integrity.

## SOP
- Model constraints first; services in Prisma transactions.
- Emit `SystemLog` for all critical mutations.
- Unit tests for payout rounding & level curve; race tests for concurrency.

## Checklist
- [ ] Jobs close atomic
- [ ] XP budget enforced
- [ ] Award idempotent
- [ ] Events single‑grant
- [ ] Audits with requestId
