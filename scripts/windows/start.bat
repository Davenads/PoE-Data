@echo off
echo ========================================
echo   PoE2 Discord Bot - Production Start
echo ========================================
echo.
echo [1/3] Cleaning up old processes...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Killed existing Node.js processes
) else (
    echo ℹ No existing Node.js processes found
)
echo.
echo [2/3] Building TypeScript...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Starting bot...
echo.
echo Configuration:
echo   - Redis: WSL-Ubuntu
echo   - Production mode
echo   - Logging to console
echo.
echo Press Ctrl+C to stop the bot
echo.
echo ========================================
echo.

npm start
