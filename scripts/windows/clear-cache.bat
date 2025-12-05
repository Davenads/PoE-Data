@echo off
echo ========================================
echo   Clear Redis Cache for QA
echo ========================================
echo.

REM Extract Redis password from .env
for /f "tokens=2 delims==" %%a in ('findstr "REDIS_PASSWORD" .env') do set REDIS_PASSWORD=%%a

echo Clearing all Discord cache keys...
wsl redis-cli -a "%REDIS_PASSWORD%" FLUSHDB

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Cache cleared successfully!
    echo.
    echo You can now test with fresh data.
) else (
    echo.
    echo ❌ Failed to clear cache. Check Redis connection.
)

echo.
echo ========================================
pause
