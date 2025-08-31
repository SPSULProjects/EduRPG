**Owners:** FULLSTACK_INTEGRATOR + DATA_PLATFORM_ENGINEER

## Objective
SystemLog + requestId + health.

## Steps
1. Middleware creates `requestId` (UUID).
2. `logEvent()` helper appends requestId to payload.
3. `/api/health` includes DB ping.

## Acceptance
- All critical actions have requestId; health returns `{ ok, db:true }` when healthy.

## Checklist
- [ ] requestId
- [ ] logEvent
- [ ] health
