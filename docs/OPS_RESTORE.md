# Restore Runbook

1. Stop app access to DB (maintenance window).
2. Copy desired backup to target host.
3. Restore:
   ```bash
   gunzip -c /backups/edurpg-YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
   ```
4. Verify schema version & basic queries.
5. Re-enable app.
