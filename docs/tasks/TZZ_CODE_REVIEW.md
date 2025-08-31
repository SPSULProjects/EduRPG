**Owner:** CODE_REVIEW_SUPERSENIOR

## Objective
Final review gate; no build/push without **Green**.

## Steps
1. Validate PRD alignment & API contract adherence.
2. Security scan: authZ correctness, secret handling, injections.
3. Performance review: N+1, complexity traps, client JS footprint.
4. Error handling & logging (no PII, requestId present).
5. Test sufficiency (unit/integration/E2E).

## Acceptance
- Reviewer grants **Green**. Otherwise changes requested with exact diffs and rationale.

## Checklist
- [ ] Domain correctness
- [ ] Security
- [ ] Performance
- [ ] Error handling
- [ ] Logging
- [ ] Tests
