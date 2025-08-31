**Owner:** DOMAIN_BACKEND_SPECIALIST

## Objective
Events CRUD + participation bonus.

## Steps
1. Model: `Event(title, desc?, startsAt, endsAt?, xpBonus?, rarityReward?)`.
2. API: create; participate(userId).
3. Hook: on participation, grant xpBonus and/or rarity reward once.

## Acceptance
- No double participation effect; logs written.

## Checklist
- [ ] Model
- [ ] API
- [ ] Hook
- [ ] Tests
