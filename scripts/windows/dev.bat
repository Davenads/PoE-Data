@echo off
echo ========================================
echo   PoE2 Discord Bot - Development Mode
echo ========================================
echo.
echo Cleaning up old processes...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Killed existing Node.js processes
) else (
    echo ℹ No existing Node.js processes found
)
echo.
echo Starting bot in development mode...
echo (Auto-reload enabled)
echo.
echo Configuration:
echo   - Redis: WSL-Ubuntu
echo   - Log Level: debug
echo   - Auto-reload on file changes
echo.
echo Press Ctrl+C to stop the bot
echo.
echo ========================================
echo.

npm run dev
