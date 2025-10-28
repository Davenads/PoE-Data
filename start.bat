@echo off
echo ========================================
echo   PoE2 Discord Bot - Startup Script
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [1/3] Docker is running...
echo.

REM Stop any existing containers
echo [2/3] Stopping existing containers...
docker-compose down >nul 2>&1
echo.

REM Build and start containers
echo [3/3] Building and starting containers...
docker-compose up --build -d

echo.
echo ========================================
echo   Bot Status
echo ========================================
docker ps --filter "name=poe2"

echo.
echo ========================================
echo   Bot is starting...
echo   Waiting 3 seconds for initialization...
echo ========================================
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Bot Logs (Last 20 lines)
echo ========================================
docker logs --tail 20 poe2-discord-bot

echo.
echo ========================================
echo   Bot is ready!
echo ========================================
echo.
echo Commands:
echo   logs.bat    - View live logs
echo   stop.bat    - Stop the bot
echo   restart.bat - Restart the bot
echo.
pause
