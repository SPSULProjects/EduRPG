# EduRPG Database Restore Runbook

**Owner:** DATA_PLATFORM_ENGINEER  
**Last Updated:** 2024-12-19

## Overview

This document provides step-by-step instructions for restoring the EduRPG database from backup files. The restore process should be tested quarterly in a staging environment.

## Prerequisites

- Access to the backup files (typically in `/backups/`)
- PostgreSQL client tools (`psql`, `pg_dump`)
- Sufficient disk space for the restored database
- Database connection credentials

## Backup File Location

Backups are stored in: `/backups/edurpg-YYYYMMDD_HHMMSS.sql.gz`

## Restore Process

### 1. Pre-Restore Checklist

- [ ] Verify backup file exists and is not corrupted
- [ ] Check available disk space (should be 2x backup size)
- [ ] Stop the application to prevent data corruption
- [ ] Document current database state (if possible)

### 2. Verify Backup File

```bash
# Check backup file integrity
gunzip -t /backups/edurpg-YYYYMMDD_HHMMSS.sql.gz

# Check backup file size
ls -lh /backups/edurpg-YYYYMMDD_HHMMSS.sql.gz

# Verify backup contains expected data
gunzip -c /backups/edurpg-YYYYMMDD_HHMMSS.sql.gz | head -20
```

### 3. Stop Application

```bash
# Stop the Next.js application
docker-compose down
```

### 4. Restore Database

```bash
# Set environment variables
export DATABASE_URL="postgresql://edurpg_user:edurpg_password@localhost:5432/edurpg"
export BACKUP_FILE="/backups/edurpg-YYYYMMDD_HHMMSS.sql.gz"

# Drop and recreate database (WARNING: This will destroy existing data)
psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS edurpg;"
psql "$DATABASE_URL" -c "CREATE DATABASE edurpg;"

# Restore from backup
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
```

### 5. Verify Restore

```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT version();"

# Verify key tables exist and have data
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM classes;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM jobs;"
```

### 6. Restart Application

```bash
# Start the application
docker-compose up -d

# Verify application health
curl http://localhost:3000/api/health
```

## Verification Steps

### Size/Date Sanity Checks

1. **Backup Size Verification:**
   - Backup should be > 1KB (not empty)
   - Size should be consistent with previous backups (±20%)
   - Check for unusual size changes

2. **Date Verification:**
   - Backup timestamp should match expected schedule
   - No gaps in backup sequence
   - Recent backups should exist

### Automated Verification Script

```bash
#!/bin/bash
# verify_backup.sh

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found"
    exit 1
fi

# Check file size
SIZE=$(stat -c%s "$BACKUP_FILE")
if [ "$SIZE" -lt 1024 ]; then
    echo "ERROR: Backup file too small ($SIZE bytes)"
    exit 1
fi

# Check file integrity
if ! gunzip -t "$BACKUP_FILE"; then
    echo "ERROR: Backup file corrupted"
    exit 1
fi

echo "Backup verification passed"
```

## Quarterly Restore Test Plan

### Test Schedule
- **Q1:** January 15th
- **Q2:** April 15th
- **Q3:** July 15th
- **Q4:** October 15th

### Test Success Criteria

- [ ] Backup file can be extracted without errors
- [ ] Database restore completes within 30 minutes
- [ ] All key tables contain expected data
- [ ] Application starts successfully
- [ ] Core functionality works as expected
- [ ] No data corruption detected

## Troubleshooting

### Common Issues

1. **Permission Denied:**
   ```bash
   chmod +x /ops/backup.sh
   chown postgres:postgres /backups/
   ```

2. **Insufficient Disk Space:**
   ```bash
   df -h /backups/
   # Clean up old backups if needed
   ```

3. **Database Connection Issues:**
   ```bash
   # Check PostgreSQL service
   systemctl status postgresql
   
   # Verify connection string
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```
