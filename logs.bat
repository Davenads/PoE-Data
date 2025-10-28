@echo off
echo ========================================
echo   PoE2 Discord Bot - Live Logs
echo ========================================
echo.
echo Press Ctrl+C to exit
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    pause
    exit /b 1
)

REM Check if container is running
docker ps --filter "name=poe2-discord-bot" --format "{{.Names}}" | findstr "poe2-discord-bot" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Bot container is not running!
    echo Run start.bat first.
    pause
    exit /b 1
)

docker logs -f poe2-discord-bot
