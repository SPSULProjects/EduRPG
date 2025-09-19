@echo off
echo Setting up EduRPG development environment...

REM Copy development environment file
if exist dev.env (
    copy dev.env .env.local
    echo Environment file copied successfully
) else (
    echo Warning: dev.env file not found
)

REM Generate Prisma client
echo Generating Prisma client...
npx prisma generate

REM Clean build cache
echo Cleaning build cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Install dependencies if needed
echo Checking dependencies...
npm install

echo Development environment setup complete!
echo.
echo To start the development server:
echo   npm run dev
echo.
echo If port 3000 is busy, use:
echo   npm run dev:port
echo.
pause
