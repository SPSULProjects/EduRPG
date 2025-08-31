**Owner:** DOMAIN_BACKEND_SPECIALIST

## Objective
Daily teacher XP budget + level curve.

## Steps
1. Model: `TeacherDailyBudget` (unique teacherId+date).
2. API: POST /api/xp/grant; GET /api/teacher/budget/today.
3. Service: `grantXP()` enforces remaining budget; writes `XPAudit`.
4. Level curve in `/src/lib/leveling.ts`; unit tests.
5. Daily reset job to create budgets.

## Acceptance
- Budget cannot go negative; grants audited.

## Checklist
- [ ] Model
- [ ] API
- [ ] Service
- [ ] Curve + tests
- [ ] Reset job
