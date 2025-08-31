**Owner:** DATA_PLATFORM_ENGINEER

## Objective
Nightly database backups & restore runbook (no CI/CD).

## Steps
1. Create `/ops/backup.sh` (pg_dump | gzip); set permissions.
2. Cron sample: `0 22 * * * /path/backup.sh`.
3. `/docs/OPS_RESTORE.md` with restore steps (`gunzip -c` → `psql`).
4. Verify artifacts (date/size sanity) and quarterly restore test.

## Acceptance
- Backups present daily; restore verified in staging.

## Checklist
- [ ] backup.sh
- [ ] Cron docs
- [ ] Restore doc
- [ ] Verification steps
