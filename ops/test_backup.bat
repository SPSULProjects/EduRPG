@echo off
REM EduRPG Backup Test Script for Windows
REM This script tests the backup functionality in a Docker environment

echo Starting EduRPG backup test...

REM Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running
    exit /b 1
)

REM Check if containers are running
docker ps | findstr "edurpg-postgres" >nul 2>&1
if errorlevel 1 (
    echo ERROR: EduRPG PostgreSQL container is not running
    echo Please start the containers with: docker-compose up -d
    exit /b 1
)

echo Testing backup script...

REM Create backup directory if it doesn't exist
if not exist "backups" mkdir backups

REM Run backup script in container
docker exec edurpg-postgres /backup.sh

if errorlevel 1 (
    echo ERROR: Backup failed
    exit /b 1
)

echo.
echo Backup completed successfully!
echo.
echo Checking backup files:
dir backups\edurpg-*.sql.gz 2>nul

echo.
echo To verify backup integrity, run:
echo docker exec edurpg-postgres /verify_backup.sh

echo.
echo Test completed successfully!
