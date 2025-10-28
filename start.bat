@echo off
echo ========================================
echo   PoE2 Discord Bot - Production Start
echo ========================================
echo.
echo [1/2] Building TypeScript...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting bot...
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
