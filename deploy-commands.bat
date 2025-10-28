@echo off
echo ========================================
echo   Deploy Discord Commands (Local)
echo ========================================
echo.
echo This will register/update slash commands
echo with Discord. Run this when:
echo   - First time setup
echo   - After modifying commands
echo.

npm run deploy-commands

echo.
echo ========================================
echo   Commands deployed!
echo ========================================
echo.
echo Note: If the bot is running in Docker,
echo restart it to pick up changes:
echo   restart.bat
echo.
pause
