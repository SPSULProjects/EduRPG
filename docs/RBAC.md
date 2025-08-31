# RBAC Policy

## Roles
- `OPERATOR`, `TEACHER`, `STUDENT`

## Route Policy Map (regex → roles)
- `/admin.*` → OPERATOR
- `/api/sync/bakalari` → OPERATOR
- `/dashboard.*` → OPERATOR|TEACHER|STUDENT

## Server Guards
- Utilities enforce role checks in route handlers & server actions.

## Testing
- E2E verifies denies for unauthorized roles.
