**Owners:** DOMAIN_BACKEND_SPECIALIST + FRONTEND_PRODUCT_ENGINEER

## Objective
Achievement editor + manual award.

## Steps
1. Models: `Achievement(key unique)`, `AchievementAward`.
2. API: create/list/award; idempotent award or 409.
3. UI: Editor Form (name, rarity, condition, icon).

## Acceptance
- Duplicate key forbidden; award cannot duplicate for same user if configured.

## Checklist
- [ ] Models
- [ ] API
- [ ] UI
- [ ] Tests
