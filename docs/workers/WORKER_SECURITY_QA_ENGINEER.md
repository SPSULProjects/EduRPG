# Worker – SECURITY_QA_ENGINEER

**Mission:** Security posture + API contracts + tests.

## SOP
- Write markdown contracts; build test fixtures.
- Vitest integration & Playwright E2E; verify RBAC denies.
- Confirm no PII in logs; rate limits & cookie flags set.

## PII Redaction Test Mandate
- Unit tests MUST cover:
  - mixed-case field names,
  - nested arrays/objects,
  - Czech phone formats (with/without +420, with spaces/dots),
  - emails in free text,
  - circular references.
- Integration tests MUST verify `SystemLog.payload` never contains raw emails/phones/tokens.

## Checklist
- [ ] Contracts
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security checks
