# EduRPG Backup Cron Configuration

**Owner:** DATA_PLATFORM_ENGINEER  
**Schedule:** Daily at 22:00 (10:00 PM)

## Cron Configuration

### Production Environment

Add the following line to the system crontab:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 22:00
0 22 * * * /ops/backup.sh >> /var/log/edurpg-backup.log 2>&1
```

### Docker Environment

For Docker-based deployments, add to the host system crontab:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 22:00
0 22 * * * docker exec edurpg-postgres /backup.sh >> /var/log/edurpg-backup.log 2>&1
```

### Alternative: Using Docker Compose

Create a backup service in `docker-compose.yml`:

```yaml
services:
  backup:
    image: postgres:16-alpine
    volumes:
      - ./ops/backup.sh:/backup.sh:ro
      - ./backups:/backups
    environment:
      - DATABASE_URL=postgresql://edurpg_user:edurpg_password@postgres:5432/edurpg
    depends_on:
      - postgres
    command: ["/bin/sh", "-c", "while true; do sleep 86400; /backup.sh; done"]
```

## Environment Variables

Ensure these environment variables are set:

```bash
# Required
DATABASE_URL="postgresql://edurpg_user:edurpg_password@localhost:5432/edurpg"

# Optional (with defaults)
BACKUP_DIR="/backups"
BACKUP_RETENTION_DAYS="30"
LOG_FILE="/var/log/edurpg-backup.log"
```

## Verification

### Check Cron Job Status

```bash
# List current cron jobs
crontab -l

# Check cron service status
systemctl status cron

# View recent cron logs
tail -f /var/log/cron
```

### Test Backup Manually

```bash
# Test backup script manually
/ops/backup.sh

# Check backup files
ls -la /backups/

# Verify log file
tail -f /var/log/edurpg-backup.log
```

## Monitoring

### Log Monitoring

The backup script logs to `/var/log/edurpg-backup.log`. Monitor for:

- Successful backups: "Backup process completed successfully"
- Errors: "ERROR:" messages
- Size verification: "Backup verification passed - Size: X"

### Automated Monitoring Script

```bash
#!/bin/bash
# check_backup.sh

LOG_FILE="/var/log/edurpg-backup.log"
BACKUP_DIR="/backups"

# Check if backup ran today
if ! grep -q "$(date +%Y-%m-%d)" "$LOG_FILE"; then
    echo "WARNING: No backup found for today"
    exit 1
fi

# Check for recent errors
if grep -q "ERROR:" "$LOG_FILE" | tail -10; then
    echo "WARNING: Recent backup errors found"
    exit 1
fi

# Check backup file exists and is recent
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/edurpg-*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found"
    exit 1
fi

# Check if backup is from today
if [[ "$LATEST_BACKUP" != *"$(date +%Y%m%d)"* ]]; then
    echo "WARNING: Latest backup is not from today"
    exit 1
fi

echo "Backup status: OK"
```

## Troubleshooting

### Common Issues

1. **Cron Job Not Running:**
   ```bash
   # Check cron service
   systemctl status cron
   systemctl start cron
   
   # Check user permissions
   sudo crontab -u postgres -l
   ```

2. **Permission Issues:**
   ```bash
   # Fix script permissions
   chmod +x /ops/backup.sh
   
   # Fix backup directory permissions
   chown postgres:postgres /backups/
   chmod 755 /backups/
   ```

3. **Database Connection Issues:**
   ```bash
   # Test database connection
   psql "$DATABASE_URL" -c "SELECT 1;"
   
   # Check PostgreSQL service
   systemctl status postgresql
   ```

## Backup Retention

The backup script automatically manages retention:

- **Default retention:** 30 days
- **Configurable via:** `BACKUP_RETENTION_DAYS` environment variable
- **Cleanup:** Runs after each backup
- **Logging:** Documents cleanup actions

## Security Considerations

- Backup files contain sensitive data
- Ensure proper file permissions (600 or 700)
- Consider encryption for backup files
- Monitor access to backup directory
- Regular security audits of backup process
