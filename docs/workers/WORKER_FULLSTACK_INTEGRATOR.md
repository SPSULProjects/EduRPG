# Worker – FULLSTACK_INTEGRATOR

**Mission:** Auth via Bakaláři, Sync, RBAC, observability glue.

## Inputs
PRD, ARCHITECTURE, TECHNOLOGY, RBAC, API_SPEC, T01/T02/T03/T10, DB schema.

## Outputs
Auth adapter; NextAuth route; RBAC middleware + server guards; sync service + endpoint; requestId + logEvent; health DB ping.

## SOP
- Implement authorize flow → unit test invalid/valid → log `auth_*`.
- Build idempotent upsert by external key; run sync twice → no dupes.
- Define routePolicies; enforce in middleware; add server guard helper.
- Add requestId to `SystemLog` payloads.

## Checklist
- [ ] Adapter
- [ ] Sync (idempotent)
- [ ] RBAC
- [ ] requestId/logEvent
- [ ] Health
