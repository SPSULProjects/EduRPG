# Worker – DATA_PLATFORM_ENGINEER

**Mission:** Schema, migrations, indexes, backups, retention.

## SOP
- Add indexes (teacherId/classId); unique keys; verify query plans.
- `backup.sh` nightly; restore runbook; quarterly restore test.
- DB ping in health; archive logs after 1 year → restrict Y2‑Y3.

## Checklist
- [ ] Migrations
- [ ] Indexes
- [ ] Backups + restore
- [ ] Retention
