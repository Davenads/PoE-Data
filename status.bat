@echo off
echo ========================================
echo   PoE2 Discord Bot - Status Check
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

echo ========================================
echo   Container Status
echo ========================================
docker ps --filter "name=poe2" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ========================================
echo   Recent Bot Logs
echo ========================================
docker logs --tail 15 poe2-discord-bot 2>nul
if %errorlevel% neq 0 (
    echo Bot container is not running!
    echo Run start.bat to start the bot.
)

echo.
echo ========================================
echo   Docker Images
echo ========================================
docker images --filter "reference=poe-data-bot" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo.
pause
