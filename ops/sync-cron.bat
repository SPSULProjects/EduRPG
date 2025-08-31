@echo off
REM EduRPG Bakalari Sync Cron Script (Windows)
REM Runs every 15 minutes to sync data from Bakalari

REM Configuration
set APP_URL=%APP_URL%
if "%APP_URL%"=="" set APP_URL=http://localhost:3000
set SYNC_ENDPOINT=/api/sync/bakalari
set LOG_FILE=C:\logs\edurpg\sync-cron.log
set MAX_RETRIES=3
set RETRY_DELAY=30

REM Create log directory if it doesn't exist
if not exist "C:\logs\edurpg" mkdir "C:\logs\edurpg"

REM Get current timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

REM Log function
:log
set level=%1
shift
set message=%*
echo [%timestamp%] %level%: %message% >> "%LOG_FILE%"
if "%level%"=="ERROR" (
    echo [%timestamp%] ERROR: %message%
) else if "%level%"=="WARN" (
    echo [%timestamp%] WARN: %message%
) else (
    echo [%timestamp%] INFO: %message%
)
goto :eof

REM Check if required environment variables are set
if "%OPERATOR_TOKEN%"=="" (
    call :log ERROR "OPERATOR_TOKEN environment variable is not set"
    call :log ERROR "Please set a valid operator token for authentication"
    exit /b 1
)

call :log INFO "=== EduRPG Bakalari Sync Cron Started ==="

REM Perform sync with retries
set attempt=1
:retry_loop
call :log INFO "Starting Bakalari sync (attempt %attempt%/%MAX_RETRIES%)"

REM Make HTTP request to sync endpoint using PowerShell
powershell -Command "& {
    $response = Invoke-RestMethod -Uri '%APP_URL%%SYNC_ENDPOINT%' -Method POST -Headers @{'Authorization'='Bearer %OPERATOR_TOKEN%'; 'Content-Type'='application/json'} -ErrorAction SilentlyContinue
    $statusCode = $response.StatusCode
    if ($statusCode -eq 200) {
        Write-Host 'SUCCESS'
        Write-Host $response
    } else {
        Write-Host 'FAILED'
        Write-Host $statusCode
        Write-Host $response
    }
}" > temp_response.txt 2>&1

REM Read response
set /p response_line=<temp_response.txt
if "%response_line%"=="SUCCESS" (
    call :log INFO "Sync completed successfully"
    for /f "skip=1" %%a in (temp_response.txt) do call :log INFO "Response: %%a"
    del temp_response.txt
    call :log INFO "=== EduRPG Bakalari Sync Cron Completed Successfully ==="
    exit /b 0
) else (
    call :log WARN "Sync attempt %attempt% failed"
    if %attempt% lss %MAX_RETRIES% (
        call :log INFO "Waiting %RETRY_DELAY% seconds before retry...
        timeout /t %RETRY_DELAY% /nobreak >nul
        set /a attempt+=1
        goto retry_loop
    ) else (
        call :log ERROR "Sync failed after %MAX_RETRIES% attempts"
        del temp_response.txt
        call :log ERROR "=== EduRPG Bakalari Sync Cron Failed ==="
        exit /b 1
    )
)
