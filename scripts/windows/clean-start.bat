@echo off
echo ========================================
echo   PoE2 Bot - Clean Start
echo ========================================
echo.
echo This will:
echo   1. Kill any running bot instances
echo   2. Start fresh in development mode
echo.
pause

echo.
echo [1/2] Killing existing Node processes...
taskkill /F /IM node.exe /T >nul 2>&1

echo Waiting for cleanup...
timeout /t 2 /nobreak >nul

echo.
echo [2/2] Starting bot...
echo.
echo ========================================
echo   PoE2 Discord Bot - Development Mode
echo ========================================
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
