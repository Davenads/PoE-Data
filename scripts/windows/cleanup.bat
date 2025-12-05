@echo off
echo ========================================
echo   PoE2 Discord Bot - Process Cleanup
echo ========================================
echo.
echo Stopping all Node.js processes...
echo.

REM Kill all node.exe processes (be careful - this kills ALL Node processes)
taskkill /F /IM node.exe /T 2>nul

if %errorlevel% equ 0 (
    echo ✓ Node.js processes terminated
) else (
    echo ℹ No Node.js processes found
)

echo.
echo Cleanup complete!
echo.
pause
