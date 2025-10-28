@echo off
echo ========================================
echo   PoE2 Discord Bot - Stopping
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    pause
    exit /b 1
)

echo Stopping all containers...
docker-compose down

echo.
echo ========================================
echo   All containers stopped
echo ========================================
echo.
pause
