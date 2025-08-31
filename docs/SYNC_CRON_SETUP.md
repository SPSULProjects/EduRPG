# Bakalari Sync Cron Setup

This document explains how to set up the automated 15-minute sync job for Bakalari data integration.

## Overview

The sync system runs every 15 minutes to keep the EduRPG database synchronized with Bakalari data. The sync is idempotent, meaning running it multiple times won't create duplicates.

## Prerequisites

1. **Operator Account**: You need an operator account with a valid Bakalari token
2. **Environment Variables**: Set up the required environment variables
3. **Application Running**: The EduRPG application must be running and accessible

## Environment Variables

Set these environment variables in your system:

```bash
# Application URL
APP_URL=http://localhost:3000

# Operator authentication token (get this from your operator account)
OPERATOR_TOKEN=your_operator_token_here
```

## Setup Instructions

### Linux/macOS (using crontab)

1. **Make the script executable**:
   ```bash
   chmod +x ops/sync-cron.sh
   ```

2. **Edit crontab**:
   ```bash
   crontab -e
   ```

3. **Add the cron job** (runs every 15 minutes):
   ```bash
   # Every 15 minutes
   */15 * * * * /path/to/your/edurpg/ops/sync-cron.sh
   
   # Or for specific times (e.g., every 15 minutes during school hours)
   0,15,30,45 7-17 * * 1-5 /path/to/your/edurpg/ops/sync-cron.sh
   ```

4. **Verify the cron job is added**:
   ```bash
   crontab -l
   ```

### Windows (using Task Scheduler)

1. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task**:
   - Click "Create Basic Task" in the right panel
   - Name: "EduRPG Bakalari Sync"
   - Description: "Syncs Bakalari data every 15 minutes"

3. **Set Trigger**:
   - Trigger: Daily
   - Start: Today
   - Recur every: 15 minutes
   - Duration: Indefinitely

4. **Set Action**:
   - Action: Start a program
   - Program/script: `C:\path\to\your\edurpg\ops\sync-cron.bat`

5. **Set Environment Variables**:
   - In the task properties, go to "Environment" tab
   - Add variables:
     - `APP_URL` = `http://localhost:3000`
     - `OPERATOR_TOKEN` = `your_operator_token_here`

### Docker/Container Environment

If running in a containerized environment, you can use the provided script in your container:

```dockerfile
# Add to your Dockerfile
COPY ops/sync-cron.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/sync-cron.sh

# Set environment variables
ENV APP_URL=http://localhost:3000
ENV OPERATOR_TOKEN=your_operator_token_here
```

Then add to your crontab inside the container:
```bash
*/15 * * * * /usr/local/bin/sync-cron.sh
```

## Manual Testing

Before setting up the cron job, test the sync manually:

### Using curl (Linux/macOS)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPERATOR_TOKEN" \
  http://localhost:3000/api/sync/bakalari
```

### Using PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/sync/bakalari" `
  -Method POST `
  -Headers @{
    'Authorization'='Bearer YOUR_OPERATOR_TOKEN'
    'Content-Type'='application/json'
  }
```

## Monitoring

### Log Files

The sync script logs to:
- **Linux/macOS**: `/var/log/edurpg/sync-cron.log`
- **Windows**: `C:\logs\edurpg\sync-cron.log`

### Application Logs

Check the application logs for detailed sync information:
- Look for `sync_start`, `sync_ok`, and `sync_fail` events
- Each sync has a unique `runId` for tracking

### Health Checks

Monitor the sync health by checking:
1. **Log files** for errors
2. **Application logs** for sync events
3. **Database** for recent sync activity
4. **ExternalRef table** for sync metadata

## Troubleshooting

### Common Issues

1. **Authentication Failed (401/403)**:
   - Check if `OPERATOR_TOKEN` is valid
   - Ensure the operator account has sync permissions
   - Verify the token hasn't expired

2. **Connection Refused**:
   - Ensure the EduRPG application is running
   - Check if `APP_URL` is correct
   - Verify network connectivity

3. **Sync Returns No Data**:
   - This is normal if Bakalari API doesn't provide bulk endpoints
   - The sync will still run successfully but won't create/update records
   - Check logs for specific warnings

4. **Database Errors**:
   - Ensure the database is running and accessible
   - Check if the `ExternalRef` table exists
   - Verify database permissions

### Debug Mode

To run the sync in debug mode, add logging:

```bash
# Linux/macOS
DEBUG=1 ./ops/sync-cron.sh

# Windows
set DEBUG=1
ops\sync-cron.bat
```

## Security Considerations

1. **Token Security**: Store `OPERATOR_TOKEN` securely, not in plain text files
2. **Network Security**: Use HTTPS in production environments
3. **Access Control**: Ensure only authorized users can trigger syncs
4. **Log Security**: Secure log files to prevent information leakage

## Performance

- **Typical Duration**: ≤60 seconds for most syncs
- **Idempotent**: Safe to run multiple times
- **Retry Logic**: Built-in retry mechanism for transient failures
- **Transaction Safety**: All sync operations are wrapped in database transactions

## Maintenance

1. **Regular Log Rotation**: Implement log rotation for sync logs
2. **Token Refresh**: Monitor and refresh operator tokens as needed
3. **Database Cleanup**: Periodically clean up old ExternalRef records
4. **Monitoring**: Set up alerts for sync failures

## Support

For issues with the sync system:
1. Check the log files first
2. Review application logs for detailed error messages
3. Test manually to isolate the issue
4. Contact the development team with specific error details
