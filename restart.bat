@echo off
echo ========================================
echo   PoE2 Discord Bot - Restarting
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

echo [1/2] Stopping containers...
docker-compose down

echo.
echo [2/2] Starting containers...
docker-compose up -d

echo.
echo ========================================
echo   Bot Status
echo ========================================
docker ps --filter "name=poe2"

echo.
echo Waiting for bot to initialize...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Bot Logs (Last 20 lines)
echo ========================================
docker logs --tail 20 poe2-discord-bot

echo.
echo ========================================
echo   Bot restarted successfully!
echo ========================================
echo.
pause
