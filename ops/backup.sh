#!/usr/bin/env bash
set -euo pipefail

# Configuration
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/edurpg-backup.log}"

# Timestamp for backup file
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="edurpg-${STAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
cleanup() {
    if [ -f "${BACKUP_PATH}.tmp" ]; then
        rm -f "${BACKUP_PATH}.tmp"
        log "Cleaned up temporary backup file"
    fi
}

trap cleanup EXIT

# Main backup process
main() {
    log "Starting EduRPG database backup"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Verify database connection
    log "Verifying database connection..."
    if ! pg_isready "$DATABASE_URL" >/dev/null 2>&1; then
        log "ERROR: Database is not ready"
        exit 1
    fi
    
    # Create backup with progress indicator
    log "Creating backup: $BACKUP_FILE"
    if pg_dump "$DATABASE_URL" | gzip > "${BACKUP_PATH}.tmp"; then
        mv "${BACKUP_PATH}.tmp" "$BACKUP_PATH"
        log "Backup completed successfully"
    else
        log "ERROR: Backup failed"
        exit 1
    fi
    
    # Verify backup file
    log "Verifying backup file..."
    if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log "Backup verification passed - Size: $BACKUP_SIZE"
    else
        log "ERROR: Backup file verification failed"
        exit 1
    fi
    
    # Clean up old backups
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "edurpg-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # List current backups
    log "Current backups:"
    ls -lah "$BACKUP_DIR"/edurpg-*.sql.gz 2>/dev/null || log "No existing backups found"
    
    log "Backup process completed successfully"
}

# Run main function
main "$@"
