#!/bin/bash

# EduRPG Bakalari Sync Cron Script
# Runs every 15 minutes to sync data from Bakalari

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
SYNC_ENDPOINT="/api/sync/bakalari"
LOG_FILE="/var/log/edurpg/sync-cron.log"
MAX_RETRIES=3
RETRY_DELAY=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[$timestamp] INFO: $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] WARN: $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR: $message${NC}"
            ;;
    esac
    
    # Also write to log file
    echo "[$timestamp] $level: $message" >> "$LOG_FILE"
}

# Function to perform sync with retries
perform_sync() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "INFO" "Starting Bakalari sync (attempt $attempt/$MAX_RETRIES)"
        
        # Make HTTP request to sync endpoint
        response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $OPERATOR_TOKEN" \
            "$APP_URL$SYNC_ENDPOINT")
        
        # Extract HTTP status code (last line)
        http_code=$(echo "$response" | tail -n1)
        # Extract response body (all lines except last)
        response_body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" -eq 200 ]; then
            log "INFO" "Sync completed successfully"
            log "INFO" "Response: $response_body"
            return 0
        elif [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
            log "ERROR" "Authentication failed (HTTP $http_code)"
            log "ERROR" "Response: $response_body"
            return 1
        elif [ "$http_code" -eq 500 ]; then
            log "WARN" "Server error (HTTP $http_code), will retry"
            log "WARN" "Response: $response_body"
        else
            log "WARN" "Unexpected response (HTTP $http_code), will retry"
            log "WARN" "Response: $response_body"
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log "INFO" "Waiting $RETRY_DELAY seconds before retry..."
            sleep $RETRY_DELAY
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "Sync failed after $MAX_RETRIES attempts"
    return 1
}

# Main execution
main() {
    log "INFO" "=== EduRPG Bakalari Sync Cron Started ==="
    
    # Check if required environment variables are set
    if [ -z "$OPERATOR_TOKEN" ]; then
        log "ERROR" "OPERATOR_TOKEN environment variable is not set"
        log "ERROR" "Please set a valid operator token for authentication"
        exit 1
    fi
    
    if [ -z "$APP_URL" ]; then
        log "WARN" "APP_URL not set, using default: $APP_URL"
    fi
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Perform sync
    if perform_sync; then
        log "INFO" "=== EduRPG Bakalari Sync Cron Completed Successfully ==="
        exit 0
    else
        log "ERROR" "=== EduRPG Bakalari Sync Cron Failed ==="
        exit 1
    fi
}

# Run main function
main "$@"
