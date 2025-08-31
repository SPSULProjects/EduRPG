#!/usr/bin/env bash
set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
LOG_FILE="${LOG_FILE:-/var/log/edurpg-backup.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Error handling
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Main verification function
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup: $backup_file"
    
    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    # Check file size
    local size=$(stat -c%s "$backup_file")
    if [ "$size" -lt 1024 ]; then
        error "Backup file too small ($size bytes) - likely corrupted or empty"
    fi
    
    log "Backup size: $(du -h "$backup_file" | cut -f1)"
    
    # Check file integrity
    log "Checking file integrity..."
    if ! gunzip -t "$backup_file"; then
        error "Backup file is corrupted (gunzip test failed)"
    fi
    
    # Extract and verify schema
    log "Verifying database schema..."
    local schema_check=$(gunzip -c "$backup_file" | grep -E "^CREATE TABLE|^-- Name:" | head -5)
    if [ -z "$schema_check" ]; then
        warning "No CREATE TABLE statements found - backup may be incomplete"
    else
        log "Schema verification passed"
    fi
    
    # Check for key tables
    log "Checking for key tables..."
    local key_tables=("users" "classes" "jobs" "subjects" "events")
    local missing_tables=()
    
    for table in "${key_tables[@]}"; do
        if ! gunzip -c "$backup_file" | grep -q "CREATE TABLE.*$table"; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        warning "Missing key tables: ${missing_tables[*]}"
    else
        log "All key tables found"
    fi
    
    success "Backup verification completed successfully"
}

# Check backup retention
check_retention() {
    log "Checking backup retention..."
    
    local retention_days="${BACKUP_RETENTION_DAYS:-30}"
    local old_backups=$(find "$BACKUP_DIR" -name "edurpg-*.sql.gz" -type f -mtime +$retention_days 2>/dev/null | wc -l)
    
    if [ "$old_backups" -gt 0 ]; then
        warning "Found $old_backups backup(s) older than $retention_days days"
        find "$BACKUP_DIR" -name "edurpg-*.sql.gz" -type f -mtime +$retention_days -ls 2>/dev/null
    else
        log "No old backups found (retention: $retention_days days)"
    fi
}

# Check backup frequency
check_frequency() {
    log "Checking backup frequency..."
    
    local today=$(date +%Y%m%d)
    local recent_backups=$(find "$BACKUP_DIR" -name "edurpg-${today}*.sql.gz" 2>/dev/null | wc -l)
    
    if [ "$recent_backups" -eq 0 ]; then
        warning "No backups found for today ($today)"
    else
        log "Found $recent_backups backup(s) for today"
    fi
    
    # Check last 7 days
    local week_backups=0
    for i in {1..7}; do
        local date_check=$(date -d "$i days ago" +%Y%m%d)
        if [ -n "$(find "$BACKUP_DIR" -name "edurpg-${date_check}*.sql.gz" 2>/dev/null)" ]; then
            ((week_backups++))
        fi
    done
    
    log "Backups in last 7 days: $week_backups"
}

# Main function
main() {
    log "Starting EduRPG backup verification"
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
    fi
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/edurpg-*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup files found in $BACKUP_DIR"
    fi
    
    log "Latest backup: $latest_backup"
    
    # Verify the latest backup
    verify_backup "$latest_backup"
    
    # Check retention and frequency
    check_retention
    check_frequency
    
    # List all backups
    log "All backup files:"
    ls -lah "$BACKUP_DIR"/edurpg-*.sql.gz 2>/dev/null || log "No backup files found"
    
    success "Backup verification completed"
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    # No arguments - verify latest backup
    main
elif [ $# -eq 1 ]; then
    # One argument - verify specific backup
    verify_backup "$1"
else
    echo "Usage: $0 [backup_file]"
    echo "  If no backup_file is specified, verifies the latest backup"
    exit 1
fi
