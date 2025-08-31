**Owner:** FULLSTACK_INTEGRATOR

## Objective
Policy enforcement via middleware + server guards.

## Steps
1. Define policy map (regex → roles).
2. Implement `middleware.ts` reading NextAuth session.
3. Server utility `requireRole(roles)` for actions/routes.
4. Log `rbac_deny` (no PII).

## Acceptance
- `/admin`, `/api/sync/bakalari` accessible only to OPERATOR.

## Checklist
- [ ] Policies
- [ ] Middleware
- [ ] Server guards
- [ ] Logs on deny
