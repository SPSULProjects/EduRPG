@echo off
REM EduRPG Log Retention Cron Script (Windows)
REM Runs daily to archive and restrict old logs according to T13 requirements

REM Configuration
set APP_URL=%APP_URL%
if "%APP_URL%"=="" set APP_URL=http://localhost:3000
set RETENTION_ENDPOINT=/api/admin/log-retention
set LOG_FILE=C:\logs\edurpg\log-retention-cron.log
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

call :log INFO "=== EduRPG Log Retention Cron Started ==="

REM Function to perform retention with retries
set attempt=1
:retry_loop
call :log INFO "Starting log retention process (attempt %attempt%/%MAX_RETRIES%)"

REM Make HTTP request to retention endpoint using PowerShell
powershell -Command "& {
    try {
        $response = Invoke-RestMethod -Uri '%APP_URL%%RETENTION_ENDPOINT%' -Method POST -Headers @{'Authorization'='Bearer %OPERATOR_TOKEN%'; 'Content-Type'='application/json'} -Body '{\"batchSize\": 1000}' -ErrorAction Stop
        call :log INFO 'Log retention completed successfully'
        call :log INFO 'Response: ' $response
        exit 0
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            call :log WARN 'Rate limit exceeded, waiting before retry'
            Start-Sleep %RETRY_DELAY%
        } else {
            call :log ERROR 'Retention failed with error:' $_.Exception.Message
        }
        exit 1
    }
}"

if %errorlevel% equ 0 (
    call :log INFO "=== Log Retention Cron Completed Successfully ==="
    exit /b 0
) else (
    set /a attempt+=1
    if %attempt% leq %MAX_RETRIES% (
        call :log INFO "Retrying in %RETRY_DELAY% seconds..."
        timeout /t %RETRY_DELAY% /nobreak >nul
        goto retry_loop
    ) else (
        call :log ERROR "All retention attempts failed"
        exit /b 1
    )
)
