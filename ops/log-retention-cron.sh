#!/bin/bash

# EduRPG Log Retention Cron Script
# Runs daily to archive and restrict old logs according to T13 requirements

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
RETENTION_ENDPOINT="/api/admin/log-retention"
LOG_FILE="/var/log/edurpg/log-retention-cron.log"
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

# Check if required environment variables are set
if [ -z "$OPERATOR_TOKEN" ]; then
    log ERROR "OPERATOR_TOKEN environment variable is not set"
    log ERROR "Please set a valid operator token for authentication"
    exit 1
fi

log INFO "=== EduRPG Log Retention Cron Started ==="

# Function to perform retention with retries
perform_retention() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log INFO "Starting log retention process (attempt $attempt/$MAX_RETRIES)"
        
        # Make HTTP request to retention endpoint
        response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $OPERATOR_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"batchSize": 1000}' \
            "$APP_URL$RETENTION_ENDPOINT")
        
        # Extract HTTP status code
        http_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" -eq 200 ]; then
            log INFO "Log retention completed successfully"
            log INFO "Response: $response_body"
            return 0
        elif [ "$http_code" -eq 429 ]; then
            log WARN "Rate limit exceeded, waiting before retry"
            sleep $RETRY_DELAY
        else
            log ERROR "Retention failed with HTTP $http_code"
            log ERROR "Response: $response_body"
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            log INFO "Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
    done
    
    log ERROR "All retention attempts failed"
    return 1
}

# Function to get retention statistics
get_retention_stats() {
    log INFO "Getting retention statistics..."
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $OPERATOR_TOKEN" \
        "$APP_URL$RETENTION_ENDPOINT")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log INFO "Retention statistics retrieved successfully"
        log INFO "Stats: $response_body"
    else
        log ERROR "Failed to get retention statistics (HTTP $http_code)"
        log ERROR "Response: $response_body"
    fi
}

# Main execution
main() {
    # Get initial statistics
    get_retention_stats
    
    # Perform retention
    if perform_retention; then
        log INFO "=== Log Retention Cron Completed Successfully ==="
        
        # Get final statistics
        log INFO "Getting final retention statistics..."
        get_retention_stats
        
        exit 0
    else
        log ERROR "=== Log Retention Cron Failed ==="
        exit 1
    fi
}

# Run main function
main
