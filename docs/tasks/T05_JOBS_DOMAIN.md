**Owner:** DOMAIN_BACKEND_SPECIALIST

## Objective
Jobs CRUD + apply + review + close/payout.

## Steps
1. Models: `Job`, `JobAssignment` (unique jobId+studentId).
2. Endpoints:
   - POST /api/jobs
   - GET /api/classes/:id/jobs
   - POST /api/jobs/:id/assign
   - POST /api/jobs/:id/review
   - POST /api/jobs/:id/close (transactional payout)
3. Payout = floor(cashBudget / acceptedCount); remainder logged.
4. Logs: `job_*`, `money_tx`.

## Acceptance
- Close is atomic; MoneyTx present for accepted students.

## Checklist
- [ ] Models
- [ ] Endpoints
- [ ] Payout
- [ ] Logs
- [ ] Tests
